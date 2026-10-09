const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();

const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");
const storage = require("../services/StorageService");

/**
 * Document upload and retrieval.
 *
 * Objects live in S3 (or on local disk with the identical key layout when S3 is
 * not configured) and are never world-readable. Every read goes through
 * /view/:key here, which applies the prefix rule in StorageService.canReadKey
 * before redirecting to a short-lived presigned URL.
 */

/**
 * File type gate.
 *
 * `file.mimetype` comes from the client's Content-Type and can be set to
 * anything, so it is necessary but not sufficient: the extension has to agree
 * with it as well. A .html or .svg renamed to image/png is rejected here rather
 * than being stored and later served back to a browser.
 */
const ALLOWED_MIME = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/gif", [".gif"]],
  ["image/webp", [".webp"]],
  ["application/pdf", [".pdf"]],
  ["video/mp4", [".mp4"]],
  ["text/csv", [".csv"]],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [".xlsx"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
]);

const fileFilter = (req, file, cb) => {
  const allowedExts = ALLOWED_MIME.get(file.mimetype);
  if (!allowedExts) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
  const ext = path.extname(String(file.originalname || "")).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(
      new Error(`File extension "${ext || "(none)"}" does not match ${file.mimetype}`),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage: storage.createStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter,
});

/** Shape returned for an uploaded file. The key is the durable identifier. */
const describe = (file, req) => {
  const key = storage.keyOf(file);
  if (!key) {
    // Should not happen; surfaced rather than throwing an unhandled TypeError
    // that would take the process down mid-request.
    throw new Error("Upload succeeded but no storage key was recorded");
  }
  return {
    key,
    url: storage.publicUrlForKey(key, req),
    is_private: key.startsWith("private/"),
    filename: path.basename(key),
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    storage: storage.s3Enabled ? "s3" : "local",
  };
};

/** Multer rejections (type, size) are client errors, not 500s. */
const handleUpload = (handler) => (req, res) =>
  handler(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
  });

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
router.post("/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json(describe(req.file, req));
  });
});

router.post("/upload-multiple", authMiddleware, (req, res) => {
  upload.array("files", 10)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    // Previously this hardcoded `/uploads/<filename>`, so with S3 enabled every
    // multi-upload returned a URL that pointed at nothing.
    res.json({ files: req.files.map((f) => describe(f, req)) });
  });
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
/**
 * Serves a stored object.
 *
 * optionalAuthenticate rather than authMiddleware: `public/` keys (profile
 * images, campaign creatives) have to load in an <img> tag, which cannot send a
 * bearer token. Their uuid makes them unguessable. `private/` keys still require
 * a session and an ownership match, enforced by canReadKey.
 *
 * A miss returns 404 whether the object is absent or merely not ours, so keys
 * cannot be probed for existence.
 */
router.get("/view/*", optionalAuthenticate, async (req, res) => {
  const key = req.params[0];

  if (!storage.canReadKey(key, req.user)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    if (!(await storage.objectExists(key))) {
      return res.status(404).json({ error: "File not found" });
    }

    if (storage.s3Enabled) {
      const signed = await storage.signedUrlForKey(key);
      return res.redirect(302, signed);
    }

    // Local fallback: stream it, so private files are not exposed by the
    // static middleware.
    return res.sendFile(storage.localPathForKey(key));
  } catch (error) {
    console.error(`[files] view failed for ${key}:`, error.message);
    return res.status(500).json({ error: "Could not retrieve file" });
  }
});

/**
 * Hands back a time-limited direct URL for a key the caller may read.
 *
 * This replaces a placeholder that returned `/api/files/upload?filename=...`
 * and called it a signed URL — it carried no signature and granted nothing.
 */
router.post("/signed-url", authMiddleware, async (req, res) => {
  const { key } = req.body || {};

  if (!storage.canReadKey(key, req.user)) {
    return res.status(404).json({ error: "File not found" });
  }
  if (!(await storage.objectExists(key))) {
    return res.status(404).json({ error: "File not found" });
  }

  if (!storage.s3Enabled) {
    return res.json({
      url: storage.publicUrlForKey(key, req),
      expires_in: null,
      storage: "local",
    });
  }

  try {
    const url = await storage.signedUrlForKey(key);
    res.json({ url, expires_in: storage.SIGNED_URL_TTL, storage: "s3" });
  } catch (error) {
    console.error(`[files] signing failed for ${key}:`, error.message);
    res.status(500).json({ error: "Could not sign file URL" });
  }
});

// Kept for older callers that still post to /create-signed-url.
router.post("/create-signed-url", authMiddleware, (req, res, next) => {
  req.url = "/signed-url";
  router.handle(req, res, next);
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
/**
 * Deletes a stored object.
 *
 * The key arrives in the path and is checked with the same ownership rule as a
 * read. The previous version joined an unvalidated `:filename` onto the uploads
 * directory, so `../../` escaped it and any authenticated user could delete any
 * file on the server — including another user's documents and source files.
 */
router.delete("/object/*", authMiddleware, async (req, res) => {
  const key = req.params[0];

  if (!storage.canReadKey(key, req.user)) {
    return res.status(404).json({ error: "File not found" });
  }
  // Only the owner or staff may remove a private document; a public asset needs
  // staff, since its key alone does not establish who uploaded it.
  const isStaff = ["admin", "super_admin", "sub_admin"].includes(
    req.user.app_role || req.user.role
  );
  if (key.startsWith("public/") && !isStaff) {
    return res.status(403).json({ error: "Not permitted to delete this file" });
  }

  try {
    if (!(await storage.objectExists(key))) {
      return res.status(404).json({ error: "File not found" });
    }
    await storage.deleteObject(key);
    res.json({ success: true });
  } catch (error) {
    console.error(`[files] delete failed for ${key}:`, error.message);
    res.status(500).json({ error: "Could not delete file" });
  }
});

// ---------------------------------------------------------------------------
// Diagnostics (staff only) — confirms which backend is live without leaking keys
// ---------------------------------------------------------------------------
router.get("/storage-status", authMiddleware, (req, res) => {
  const isStaff = ["admin", "super_admin", "sub_admin"].includes(
    req.user.app_role || req.user.role
  );
  if (!isStaff) return res.status(403).json({ error: "Admin access required" });

  res.json({
    backend: storage.s3Enabled ? "s3" : "local",
    bucket: storage.s3Enabled ? storage.BUCKET : null,
    region: storage.s3Enabled ? storage.REGION : null,
    signed_url_ttl_seconds: storage.SIGNED_URL_TTL,
    allowed_extensions: [...storage.ALLOWED_EXTENSIONS],
  });
});

module.exports = router;
