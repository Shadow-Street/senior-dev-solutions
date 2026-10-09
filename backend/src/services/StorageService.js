const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } =
  require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const multerS3 = require("multer-s3");

/**
 * Document storage.
 *
 * Documents here are not incidental: SEBI registration certificates, portfolio
 * manager KYC and subscription invoices all pass through this service. The
 * design therefore starts from "nothing is world-readable" and grants access
 * per request, rather than uploading with a public ACL and hoping the URL stays
 * secret.
 *
 * Layout. Every object key carries its own access rule in its prefix:
 *
 *   private/<userId>/<folder>/<uuid>-<name>   only the owner (or staff) may read
 *   public/<folder>/<uuid>-<name>             readable by anyone holding the link
 *
 * Nothing is ever served straight from the bucket. Reads go through
 * /api/files/view/<key>, which checks the prefix rule and then redirects to a
 * short-lived presigned URL. That keeps the bucket private, keeps <img src>
 * working without putting a bearer token in a URL, and means revoking access is
 * a matter of refusing to sign rather than racing to delete an object.
 *
 * Configuration is environment-only — never commit a key. S3 is used when
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET are all present;
 * otherwise the service falls back to local disk using the identical key layout,
 * so development behaves the same way and switching to S3 changes no call sites.
 */

const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || "";
const REGION = process.env.AWS_REGION || "ap-south-1";
const SIGNED_URL_TTL = Number(process.env.AWS_S3_SIGNED_URL_TTL || 300); // seconds

const s3Enabled = Boolean(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && BUCKET
);

let s3Client = null;
if (s3Enabled) {
  s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log(`[storage] S3 enabled — bucket "${BUCKET}" in ${REGION}`);
} else {
  console.log("[storage] S3 not configured; using local disk with the same key layout");
}

const LOCAL_ROOT = path.join(__dirname, "../../uploads");

/** Folder segment: a short, predictable slug. Anything else is rejected. */
const safeFolder = (value) => {
  const slug = String(value || "general")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "general";
};

/**
 * Filename for storage.
 *
 * The original name is attacker-controlled, so it never reaches a key intact:
 * the directory part is discarded (defeating "../" traversal and absolute
 * paths), the extension is taken from a strict allow-list, and the stem is
 * reduced to safe characters. A uuid prefix guarantees uniqueness, so two users
 * uploading "aadhaar.pdf" cannot collide or overwrite each other.
 */
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".mp4", ".csv", ".xlsx", ".docx",
]);

const safeFilename = (originalName) => {
  const base = path.basename(String(originalName || "file"));
  const ext = path.extname(base).toLowerCase();
  const stem = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80) || "file";
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : "";
  return `${crypto.randomUUID()}-${stem}${safeExt}`;
};

/** Builds the full object key, encoding the access rule in the prefix. */
const buildObjectKey = ({ userId, folder, isPrivate, originalName }) => {
  const name = safeFilename(originalName);
  const dir = safeFolder(folder);
  return isPrivate
    ? `private/${userId}/${dir}/${name}`
    : `public/${dir}/${name}`;
};

/**
 * Where should this upload go: private or public?
 *
 * Read from the query string first, and only then from the body. Multer streams
 * a multipart request in order and populates req.body as it goes, so a text
 * field that appears *after* the file part is simply not there yet when the
 * storage engine has to choose a key. Relying on req.body alone meant an upload
 * that sent the file first silently lost `is_private` and a SEBI certificate was
 * stored under public/. The query string is parsed before any of this runs, so
 * it is the dependable channel; the body remains supported for callers that
 * order their fields correctly.
 */
const flagFrom = (req, ...names) => {
  for (const source of [req.query, req.body]) {
    if (!source) continue;
    for (const name of names) {
      if (source[name] !== undefined) return source[name];
    }
  }
  return undefined;
};

const wantsPrivate = (req) => {
  const raw = flagFrom(req, "is_private", "isPrivate", "private");
  return raw === true || raw === "true" || raw === "1";
};

/** Folder for this upload, from the query string or the body. */
const folderFor = (req) => safeFolder(flagFrom(req, "folder"));

/**
 * May this caller read this key?
 *
 * `public/` keys are readable by anyone with the link — the uuid in the key is
 * what makes them unguessable. `private/` keys are readable only by the user id
 * embedded in the key, or by staff. Any other shape is refused outright rather
 * than interpreted, so a malformed or crafted key cannot fall through to "allow".
 */
const STAFF_ROLES = new Set(["admin", "super_admin", "sub_admin"]);

const canReadKey = (key, user) => {
  const value = String(key || "");

  // Defence in depth: traversal and absolute keys never reach S3 or the disk.
  if (!value || value.includes("..") || value.startsWith("/")) return false;

  if (value.startsWith("public/")) return true;

  const match = value.match(/^private\/([^/]+)\//);
  if (!match) return false;

  if (!user?.id) return false;
  if (STAFF_ROLES.has(user.app_role || user.role)) return true;
  return match[1] === String(user.id);
};

/** Multer storage engine writing to S3 or disk under the same key layout. */
const createStorage = () => {
  if (s3Enabled) {
    return multerS3({
      s3: s3Client,
      bucket: BUCKET,
      // No ACL. The bucket stays private and reads are signed per request.
      // (Buckets created since 2023 disable ACLs anyway, so 'public-read'
      // would fail with AccessControlListNotSupported.)
      contentType: multerS3.AUTO_CONTENT_TYPE,
      serverSideEncryption: "AES256",
      metadata: (req, file, cb) =>
        cb(null, { uploadedBy: String(req.user?.id || "anonymous") }),
      key: (req, file, cb) =>
        cb(
          null,
          buildObjectKey({
            userId: req.user?.id || "anonymous",
            folder: folderFor(req),
            isPrivate: wantsPrivate(req),
            originalName: file.originalname,
          })
        ),
    });
  }

  return multer.diskStorage({
    // The key is attached to the file, not the request: a multi-file upload
    // calls these hooks once per file, so a single value on `req` would be
    // overwritten and every file after the first would be mislabelled.
    destination: (req, file, cb) => {
      file.__objectKey = buildObjectKey({
        userId: req.user?.id || "anonymous",
        folder: folderFor(req),
        isPrivate: wantsPrivate(req),
        originalName: file.originalname,
      });
      const dir = path.join(LOCAL_ROOT, path.dirname(file.__objectKey));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, path.basename(file.__objectKey)),
  });
};

/** The stored key for an uploaded file, whichever backend handled it. */
const keyOf = (file) => file?.key || file?.__objectKey || null;

/**
 * A URL the browser can fetch. Always our own endpoint, never the bucket, so
 * the access check runs on every read and the link does not expire in the DB.
 *
 * Absolute, because the SPA is served from a different origin than the API in
 * development and often behind a different host in production; a relative
 * "/api/..." would resolve against the frontend and 404. PUBLIC_API_BASE_URL
 * wins when set, otherwise it is derived from the request.
 */
const publicUrlForKey = (key, req = null) => {
  const configured = process.env.PUBLIC_API_BASE_URL;
  const base = configured
    ? configured.replace(/\/+$/, "")
    : req
      ? `${req.protocol}://${req.get("host")}/api`
      : "/api";
  return `${base}/files/view/${key}`;
};

/** Short-lived direct URL, handed out only after canReadKey has passed. */
const signedUrlForKey = async (key, ttl = SIGNED_URL_TTL) => {
  if (!s3Enabled) return null;
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttl }
  );
};

const localPathForKey = (key) => path.join(LOCAL_ROOT, key);

const objectExists = async (key) => {
  if (!s3Enabled) return fs.existsSync(localPathForKey(key));
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

const deleteObject = async (key) => {
  if (!canReadKey(key, { app_role: "super_admin", id: "system" })) {
    throw new Error("Refusing to delete a key outside the managed layout");
  }
  if (!s3Enabled) {
    const target = localPathForKey(key);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return;
  }
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

module.exports = {
  s3Enabled,
  BUCKET,
  REGION,
  SIGNED_URL_TTL,
  ALLOWED_EXTENSIONS,
  safeFolder,
  safeFilename,
  buildObjectKey,
  wantsPrivate,
  folderFor,
  canReadKey,
  createStorage,
  keyOf,
  publicUrlForKey,
  signedUrlForKey,
  localPathForKey,
  objectExists,
  deleteObject,
};
