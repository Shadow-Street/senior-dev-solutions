/**
 * Chat moderation rules (Super Admin > Chat Room Management > Rules).
 *
 * Rules were stored but never read: the panel saved fields the model does not
 * have, and nothing checked a message against them. Now every post (REST and
 * WebSocket) runs through checkMessage(). A rule is global (chat_room_id NULL)
 * or applies to one room.
 *
 *   word_filter    conditions.words[]            whole-word, case-insensitive
 *   link_filter    conditions.allowed_domains[]  any other link is a violation
 *   caps_lock      conditions.max_caps_percentage (messages with >= 10 letters)
 *   mention_limit  conditions.max_mentions
 *   rate_limit     conditions.max_messages per conditions.window_seconds
 *
 * Actions: 'block' refuses the message; 'mute' refuses it and mutes the sender
 * in that room (an admin unmutes from the Participants dialog).
 * Staff and the room's own managers are exempt.
 */
const { Op } = require('sequelize');
const db = require('../models');
const { isStaff, canManageRoom } = require('../utils/roomAccess');

const RULE_TYPES = ['word_filter', 'link_filter', 'caps_lock', 'mention_limit', 'rate_limit'];
const RULE_ACTIONS = ['block', 'mute'];
const CACHE_MS = 30000;
const MAX_LIST = 200;

const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

/** Accepts an array or a comma/newline separated string; trims, dedupes, caps. */
function toList(value, { lower = true, maxLen = 60 } = {}) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  const out = [];
  for (const item of items) {
    let v = String(item ?? '').trim();
    if (lower) v = v.toLowerCase();
    if (!v || v.length > maxLen || out.includes(v)) continue;
    out.push(v);
    if (out.length >= MAX_LIST) break;
  }
  return out;
}

/** Normalises a domain entry ("https://www.Example.com/x" -> "example.com"). */
const cleanDomain = (d) => String(d).toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0];

/**
 * Validates an admin's rule payload. Returns { data, errors }. Only known
 * fields are kept; created_by is stamped by the caller.
 */
function normalizeRule(body = {}, existing = null) {
  const errors = [];
  const merged = { ...(existing ? existing : {}), ...body };
  const name = String(merged.name ?? '').trim();
  if (!name) errors.push('Rule name is required');
  if (name.length > 100) errors.push('Rule name must be 100 characters or fewer');

  const ruleType = String(merged.rule_type || '');
  if (!RULE_TYPES.includes(ruleType)) errors.push('Unknown rule type');
  const action = String(merged.action || 'block');
  if (!RULE_ACTIONS.includes(action)) errors.push('Action must be block or mute');

  const rawConditions = (body.conditions && typeof body.conditions === 'object') ? body.conditions : (existing?.conditions || {});
  const conditions = {};
  if (ruleType === 'word_filter') {
    conditions.words = toList(rawConditions.words);
    if (!conditions.words.length) errors.push('Add at least one word or phrase');
  } else if (ruleType === 'link_filter') {
    conditions.allowed_domains = toList(rawConditions.allowed_domains, { maxLen: 253 }).map(cleanDomain).filter(Boolean);
  } else if (ruleType === 'caps_lock') {
    conditions.max_caps_percentage = clampInt(rawConditions.max_caps_percentage, 50, 100, 70);
  } else if (ruleType === 'mention_limit') {
    conditions.max_mentions = clampInt(rawConditions.max_mentions, 1, 50, 5);
  } else if (ruleType === 'rate_limit') {
    conditions.max_messages = clampInt(rawConditions.max_messages, 1, 100, 5);
    conditions.window_seconds = clampInt(rawConditions.window_seconds, 5, 3600, 60);
  }

  const roomId = merged.chat_room_id ? String(merged.chat_room_id) : null;
  return {
    errors,
    data: {
      name,
      rule_type: ruleType,
      action,
      conditions,
      chat_room_id: roomId,
      is_active: merged.is_active === undefined ? true : Boolean(merged.is_active),
    },
  };
}

// ---- evaluation ----------------------------------------------------------

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function containsWord(content, word) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(word)}($|[^\\p{L}\\p{N}_])`, 'iu');
  return re.test(content);
}

// Links are found token by token with an anchored, bounded pattern. A single
// global regex over the whole message backtracked quadratically on inputs like
// "a-a-a-..." (10k chars took ~0.5 s per post), stalling every send.
const MAX_TOKEN = 300;
const MAX_TOKENS = 2000;
const HOST_RE = /^(https?:\/\/)?(www\.)?((?:[a-z0-9-]{1,63}\.){1,10}([a-z]{2,24}))(?:[/?#:]|$)/i;
// Without a scheme or www., only well-known TLDs count, so "e.g." or
// "file.txt" are not treated as links.
const BARE_TLDS = new Set(['com', 'net', 'org', 'in', 'io', 'co', 'xyz', 'me', 'info', 'biz', 'app', 'link', 'ly', 'gg', 'tk', 'ru', 'cn', 'top', 'site', 'online', 'club', 'live', 'tv', 'ai', 'us', 'uk']);

// Characters that never appear in a hostname split tokens, so "x,https://a.b"
// or "go->evil.com" still expose the link. Zero-width / format characters are
// removed first: "https://evil.com\u200b" must not hide the host.
const TOKEN_SPLIT = /[\s,;<>()[\]{}"'`|\\^]+/;
const INVISIBLE = /[\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;
// Host that never matches an allowed domain: an explicit link whose host
// cannot be read is treated as a violation (fail closed).
const UNREADABLE_HOST = '\u0000unreadable';

function hostOfUrl(candidate) {
  try {
    const host = new URL(candidate).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return host ? cleanDomain(host) : UNREADABLE_HOST;
  } catch {
    return UNREADABLE_HOST;
  }
}

/** Hostnames of the links in `content`. Linear in the message length. */
function linkHosts(content) {
  const hosts = [];
  const tokens = String(content || '').replace(INVISIBLE, '').split(TOKEN_SPLIT, MAX_TOKENS);
  for (const raw of tokens) {
    if (!raw) continue;
    const token = raw.slice(0, MAX_TOKEN);
    const lower = token.toLowerCase();

    // Explicit scheme anywhere in the token ("go->https://..."), parsed by
    // the URL parser: handles user@host, IPs, IDN and any number of labels.
    const schemeAt = lower.indexOf('://');
    if (schemeAt >= 0) {
      let start = schemeAt;
      while (start > 0 && /[a-z0-9+.-]/.test(lower[start - 1])) start -= 1;
      const scheme = lower.slice(start, schemeAt);
      hosts.push(/^[a-z][a-z0-9+.-]*$/.test(scheme) ? hostOfUrl(token.slice(start)) : UNREADABLE_HOST);
      continue;
    }
    const wwwAt = lower.indexOf('www.');
    if (wwwAt >= 0) {
      hosts.push(hostOfUrl(`http://${token.slice(wwwAt)}`));
      continue;
    }

    // Bare "domain.tld": only well-known TLDs count, so "e.g." or "file.txt"
    // are not links. Anchored and bounded, no backtracking.
    if (!token.includes('.')) continue;
    const m = HOST_RE.exec(token.replace(/^[^a-z0-9]+/i, '').replace(/[.!?:]+$/, ''));
    if (!m || m[1] || m[2]) continue;
    if (!BARE_TLDS.has(m[4].toLowerCase())) continue;
    hosts.push(cleanDomain(m[3]));
  }
  return hosts;
}

const hostAllowed = (host, allowed) => allowed.some((d) => host === d || host.endsWith(`.${d}`));

/** True when `content` breaks a content rule (everything but rate_limit). */
function violatesContentRule(rule, content) {
  const c = rule.conditions || {};
  const text = String(content || '');
  switch (rule.rule_type) {
    case 'word_filter':
      return (c.words || []).some((w) => containsWord(text, w));
    case 'link_filter': {
      const allowed = c.allowed_domains || [];
      return linkHosts(text).some((h) => !hostAllowed(h, allowed));
    }
    case 'caps_lock': {
      const letters = text.match(/\p{L}/gu) || [];
      if (letters.length < 10) return false;
      const upper = (text.match(/\p{Lu}/gu) || []).length;
      return (upper / letters.length) * 100 > (c.max_caps_percentage || 70);
    }
    case 'mention_limit':
      return (text.match(/(^|\s)@[\w.]+/g) || []).length > (c.max_mentions || 5);
    default:
      return false;
  }
}

const RULE_MESSAGES = {
  word_filter: 'Your message contains a blocked word or phrase.',
  link_filter: 'Links to that site are not allowed in this room.',
  caps_lock: 'Please do not post in all caps.',
  mention_limit: 'Your message mentions too many people.',
  rate_limit: 'You are sending messages too quickly. Please wait a moment.',
};

// ---- rule cache ----------------------------------------------------------

let cache = { at: 0, rules: null };

function parseConditions(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
}

async function getActiveRules() {
  if (cache.rules && Date.now() - cache.at < CACHE_MS) return cache.rules;
  const rows = await db.ModerationRule.findAll({ where: { is_active: true } });
  const rules = rows.map((r) => {
    const plain = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
    return { ...plain, conditions: parseConditions(plain.conditions) };
  }).filter((r) => RULE_TYPES.includes(r.rule_type));
  cache = { at: Date.now(), rules };
  return rules;
}

/** Called after any rule change so the next post sees it at once. */
function invalidateRules() {
  cache = { at: 0, rules: null };
}

/**
 * Checks a message about to be posted. Returns null when it may be posted,
 * else { rule, message } with a client-safe message. A rule lookup failure is
 * logged and lets the message through: the room-level access checks have
 * already run, and an outage of this add-on must not stop all chat.
 */
async function checkMessage(user, room, content, membership = null) {
  if (!room || isStaff(user)) return null;
  let rules;
  try {
    rules = (await getActiveRules()).filter((r) => !r.chat_room_id || String(r.chat_room_id) === String(room.id));
  } catch (e) {
    console.error('[ChatModerationService] rules unavailable:', e.message);
    return null;
  }
  if (!rules.length) return null;
  if (await canManageRoom(user, room)) return null;

  for (const rule of rules) {
    let violated = violatesContentRule(rule, content);
    if (!violated && rule.rule_type === 'rate_limit') {
      const c = rule.conditions || {};
      const since = new Date(Date.now() - (c.window_seconds || 60) * 1000);
      const recent = await db.Message.count({
        where: { chat_room_id: room.id, user_id: user.id, created_at: { [Op.gte]: since } },
      });
      violated = recent >= (c.max_messages || 5);
    }
    if (!violated) continue;

    if (rule.action === 'mute' && membership && !membership.muted) {
      await db.ChatRoomParticipant.update({ muted: true }, { where: { chat_room_id: room.id, user_id: user.id } });
      membership.muted = true;
      await db.AuditLog.create({
        user_id: null,
        action: 'CHAT_RULE_AUTO_MUTE',
        entity_type: 'ChatRoom',
        entity_id: room.id,
        new_data: { user_id: user.id, rule_id: rule.id, rule_type: rule.rule_type },
        description: `Rule "${rule.name}" muted a participant`,
      }).catch((e) => console.error('[ChatModerationService] audit failed:', e.message));
    }
    const suffix = rule.action === 'mute' ? ' You have been muted in this room.' : '';
    return { rule, message: `${RULE_MESSAGES[rule.rule_type]}${suffix}` };
  }
  return null;
}

module.exports = {
  RULE_TYPES,
  RULE_ACTIONS,
  normalizeRule,
  violatesContentRule,
  linkHosts,
  checkMessage,
  getActiveRules,
  invalidateRules,
};
