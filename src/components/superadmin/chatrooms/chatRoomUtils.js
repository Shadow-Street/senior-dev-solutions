/**
 * Pure helpers for Super Admin > Chat Room Management (unit-tested in
 * __tests__/chatRoomUtils.test.js).
 */

export const ROOM_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'stock_specific', label: 'Stock specific' },
  { value: 'sector', label: 'Sector' },
  { value: 'admin', label: 'Admin' },
  { value: 'premium', label: 'Premium' },
  { value: 'premium_admin', label: 'Premium admin' },
];

export const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

export const roomTypeLabel = (t) => ROOM_TYPES.find((x) => x.value === t)?.label || 'General';

/** 'basic', 'none', '' and null are the Free tier (older rows used 'basic'). */
export function normalizePlan(value) {
  const p = String(value ?? '').trim().toLowerCase();
  if (!p || p === 'basic' || p === 'none' || p === 'free') return 'free';
  return p;
}

export const planLabel = (p) => PLANS.find((x) => x.value === normalizePlan(p))?.label || 'Free';

/** 'archived' | 'locked' | 'live' | 'idle' — what the Status column shows. */
export function roomState(room) {
  if (room.status && room.status !== 'active') return 'archived';
  if (room.locked) return 'locked';
  if ((room.online_count || 0) > 0) return 'live';
  return 'idle';
}

/**
 * The room table filters. `status`: all | live | idle | locked | archived |
 * active (anything not archived).
 */
export function filterRooms(rooms, { search = '', type = 'all', plan = 'all', status = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return (rooms || []).filter((room) => {
    if (q) {
      const hay = [room.name, room.description, room.stock_symbol].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (type !== 'all' && room.room_type !== type) return false;
    if (plan !== 'all' && normalizePlan(room.required_plan) !== plan) return false;
    if (status !== 'all') {
      const state = roomState(room);
      if (status === 'active') return state !== 'archived';
      if (state !== status) return false;
    }
    return true;
  });
}

/**
 * One CSV cell. Quotes always; doubles inner quotes; and neutralises values a
 * spreadsheet would run as a formula (=, +, -, @, tab, CR) by prefixing a '.
 */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

const iso = (d) => (d ? new Date(d).toISOString() : '');

export function roomsToCsv(rooms) {
  return toCsv(
    ['Room ID', 'Name', 'Description', 'Type', 'Stock symbol', 'Plan', 'Visibility', 'Posting', 'Status', 'Locked', 'Participants', 'Online now', 'Messages', 'Banned users', 'Last activity', 'Created'],
    (rooms || []).map((r) => [
      r.id, r.name, r.description || '', roomTypeLabel(r.room_type), r.stock_symbol || '', planLabel(r.required_plan),
      r.is_public === false ? 'Private (invite only)' : 'Public', r.admin_only_post ? 'Moderators only' : 'Everyone',
      r.status || 'active', r.locked ? 'Yes' : 'No', r.participant_count || 0, r.online_count || 0, r.message_count || 0,
      r.ban_count || 0, iso(r.last_activity_at), iso(r.created_at || r.created_date),
    ]),
  );
}

export function messagesToCsv(roomName, messages) {
  return toCsv(
    ['Room', 'Message ID', 'Author', 'Author email', 'Type', 'Pinned', 'Sent at', 'Content'],
    (messages || []).map((m) => [
      roomName, m.id, m.author?.name || '', m.author?.email || '', m.message_type || 'text', m.is_pinned ? 'Yes' : 'No',
      iso(m.created_at || m.created_date), m.content || '',
    ]),
  );
}

/** Triggers a browser download of `text` (BOM so Excel reads UTF-8). */
export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF', text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Minimal RFC-4180 parser for the bulk-import CSV (quotes, commas, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Bulk-import rows -> room payloads. Header names (case-insensitive): name,
 * description, room_type, stock_symbol, required_plan, is_public, admin_only_post.
 * Returns { rooms, errors } where errors name the offending line.
 */
export function csvToRooms(text) {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rooms: [], errors: ['The file is empty'] };
  const cols = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  if (!cols.includes('name')) return { rooms: [], errors: ['The first row must be a header with at least a "name" column'] };
  const yes = (v) => /^(1|true|yes|y)$/i.test(String(v || '').trim());
  const rooms = [];
  const errors = [];
  body.forEach((cells, i) => {
    const get = (k) => (cols.indexOf(k) >= 0 ? String(cells[cols.indexOf(k)] ?? '').trim() : '');
    const name = get('name');
    if (!name) { errors.push(`Line ${i + 2}: name is missing`); return; }
    const type = get('room_type') || 'general';
    if (!ROOM_TYPES.some((t) => t.value === type)) { errors.push(`Line ${i + 2}: unknown room_type "${type}"`); return; }
    rooms.push({
      name,
      description: get('description'),
      room_type: type,
      stock_symbol: get('stock_symbol').toUpperCase(),
      required_plan: normalizePlan(get('required_plan')),
      is_public: get('is_public') === '' ? true : yes(get('is_public')),
      admin_only_post: yes(get('admin_only_post')),
    });
  });
  return { rooms, errors };
}

/**
 * Client-side mirror of the server's room validation, so the form can say
 * what is wrong before submitting. The server re-validates everything.
 */
export function validateRoomForm(form) {
  const errors = {};
  const name = String(form.name || '').trim();
  if (name.length < 2) errors.name = 'Room name must be at least 2 characters';
  else if (name.length > 100) errors.name = 'Room name must be 100 characters or fewer';
  if (String(form.description || '').length > 1000) errors.description = 'Description must be 1000 characters or fewer';
  const symbol = String(form.stock_symbol || '').trim();
  if (form.room_type === 'stock_specific' && !symbol) errors.stock_symbol = 'Stock symbol is required for stock-specific rooms';
  else if (symbol && !/^[A-Za-z0-9&._-]{1,20}$/.test(symbol)) errors.stock_symbol = 'Use letters, digits, &, ., _ or - (max 20)';
  return errors;
}

/** The server's error text, else a fallback. */
export const apiError = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.error || fallback;

export const inviteLink = (code, origin = typeof window !== 'undefined' ? window.location.origin : '') =>
  `${origin}/ChatRooms?invite=${encodeURIComponent(code)}`;

export const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
