import apiClient from '@/lib/apiClient';

/**
 * Private documents (SEBI certificates, KYC) for reviewers.
 *
 * Only a storage KEY is ever requested, and only as GET /files/view/<key> on
 * our own API through the shared client, so the bearer token cannot be sent to
 * another host or path. The document is shown in the page (see
 * PrivateDocumentViewer) from a blob URL rather than in a new tab: opening a
 * new tab after an await is often blocked as a popup, and Chrome refuses to
 * open a blob URL in a `noopener` tab — both left "SEBI Doc" doing nothing.
 */

/** private/<user id>/<folder>/<file>; nothing else is ever requested. */
const PRIVATE_KEY = /^private\/[\w-]+\/[\w-]+\/[\w.-]+$/;

export const isPrivateKey = (key) => typeof key === 'string' && PRIVATE_KEY.test(key) && !key.includes('..');

/**
 * The key inside a stored value: either the key itself or a legacy
 * ".../files/view/<key>" URL (portfolio manager applications stored the URL).
 * Returns null for anything else. The host of a URL is irrelevant because the
 * request always goes to our own API with the key alone.
 */
export function privateKeyFrom(value) {
  if (typeof value !== 'string' || !value) return null;
  if (isPrivateKey(value)) return value;
  let pathname;
  try {
    const u = new URL(value, window.location.origin);
    if (u.search || u.hash || u.username || u.password) return null;
    pathname = u.pathname;
  } catch {
    return null;
  }
  const m = pathname.match(/\/files\/view\/(private\/.+)$/);
  if (!m) return null;
  let key;
  try { key = decodeURIComponent(m[1]); } catch { return null; }
  return isPrivateKey(key) ? key : null;
}

/** Blob → ArrayBuffer (FileReader where Blob#arrayBuffer is missing). */
const readBytes = (blob) => (typeof blob.arrayBuffer === 'function'
  ? blob.arrayBuffer()
  : new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  }));

const startsWith = (bytes, sig) => sig.every((b, i) => bytes[i] === b);

/**
 * What the bytes actually are, from their signature (never from a name or a
 * server header alone): only these render in the page.
 */
function sniff(bytes) {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { kind: 'pdf', type: 'application/pdf' }; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return { kind: 'image', type: 'image/png' };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: 'image', type: 'image/jpeg' };
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return { kind: 'image', type: 'image/gif' };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return { kind: 'image', type: 'image/webp' };
  return { kind: 'download', type: 'application/octet-stream' };
}

/**
 * Downloads a private document. Resolves to
 * { url, kind: 'pdf' | 'image' | 'download', filename, revoke }.
 * The caller must call revoke() when it is no longer shown.
 */
export async function fetchPrivateFile(key) {
  if (!isPrivateKey(key)) throw new Error('Not a private file key');
  const res = await apiClient.get(`/files/view/${key}`, { responseType: 'blob' });
  const data = res.data;
  const head = new Uint8Array(await readBytes(data.slice(0, 16)));
  const { kind, type } = sniff(head);
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const filename = key.split('/').pop().replace(/^[0-9a-f-]{36}-/i, '');
  return { url, kind, filename, revoke: () => URL.revokeObjectURL(url) };
}
