/**
 * Storage keys for files an advisor submits (SEBI certificate, profile photo).
 *
 * The API used to store whatever URL the browser sent, checking only that it
 * contained "/private/<uid>/". A reviewer's browser later requested that URL
 * with the admin's bearer token, so a crafted URL could have sent the token to
 * another host or path. Keys are the durable identifier (see StorageService):
 * they are validated against an exact shape, and a legacy full URL is accepted
 * only when it points at this application's own storage host AND parses to
 * exactly such a key.
 */
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// No '..' anywhere and not just dots: a directory name is not a certificate.
const CERT_FILE = '(?!\\.+$)(?!.*\\.\\.)[\\w.-]+';
const certificateKeyRe = (userId) => new RegExp(`^private/${escapeRe(userId)}/sebi-certificates/${CERT_FILE}$`);
// public/<folder>/<uuid>-<name>: the layout StorageService.buildObjectKey writes.
const PUBLIC_KEY_RE = /^public\/[\w-]+(?:\/[\w-]+)*\/[\w.-]+$/;

/** Hosts that serve this application's files: env-configured bases plus the request's own. */
function ownHosts(req) {
  const hosts = new Set();
  for (const v of [process.env.PUBLIC_API_BASE_URL, process.env.PUBLIC_APP_URL]) {
    try { if (v) hosts.add(new URL(v).host); } catch { /* ignore a malformed env value */ }
  }
  if (req && typeof req.get === 'function' && req.get('host')) hosts.add(req.get('host'));
  return hosts;
}

/** The key inside "<anything>/files/view/<key>" on one of our own hosts, or null. */
function keyFromOwnUrl(value, hosts) {
  let u;
  try { u = new URL(value); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || u.search || u.hash) return null;
  if (!hosts.has(u.host)) return null;
  const m = u.pathname.match(/^(?:\/api)?\/files\/view\/(.+)$/);
  return m ? m[1] : null;
}

/**
 * Normalises a SEBI certificate reference (a key or a legacy URL) to the key
 * of an upload that belongs to `userId`, or null.
 */
function certificateKey(value, userId, hosts = new Set()) {
  if (typeof value !== 'string' || !value || !userId) return null;
  const re = certificateKeyRe(userId);
  if (re.test(value)) return value;
  const fromUrl = keyFromOwnUrl(value, hosts);
  return fromUrl && re.test(fromUrl) ? fromUrl : null;
}

/** Normalises an image reference to a public/ key, or null. */
function publicImageKey(value, hosts = new Set()) {
  if (typeof value !== 'string' || !value) return null;
  const key = PUBLIC_KEY_RE.test(value) ? value : keyFromOwnUrl(value, hosts);
  return key && PUBLIC_KEY_RE.test(key) && !key.includes('..') ? key : null;
}

module.exports = { ownHosts, certificateKey, publicImageKey, certificateKeyRe, PUBLIC_KEY_RE };
