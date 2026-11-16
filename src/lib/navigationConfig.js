/**
 * Sidebar configuration (Platform Settings > Sidebar & Navigation).
 *
 * Stored as platform settings `nav_config_user` / `nav_config_admin`:
 *   { items: [{ key, visible?, label?, order? }] }
 * An empty or missing config, an unknown key or a malformed entry changes
 * nothing, so the sidebars render exactly as coded until an admin customises
 * them. Hiding an entry removes it from the menu only; it does not block the
 * page (feature access is controlled in Product Lifecycle Manager).
 */

/** Member sidebar entries, in their coded order (keys match Layout.jsx NAV_ITEMS). */
export const USER_NAV_DEFAULTS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'my_portfolio', label: 'My Portfolio' },
  { key: 'chat_rooms', label: 'Stock Chat Rooms' },
  { key: 'community_poll', label: 'Community Poll' },
  { key: 'advisors', label: 'Advisors' },
  { key: 'influencers', label: 'Influencers' },
  { key: 'subscription', label: 'Subscription Plans' },
];

/** Super Admin sidebar tabs (values match SuperAdmin.jsx tabs). */
export const ADMIN_NAV_DEFAULTS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'User Management' },
  { key: 'Advisor', label: 'Stock Advisors' },
  { key: 'pms', label: 'Portfolio Managers' },
  { key: 'FinInfluencer', label: 'Finfluencers' },
  { key: 'chatrooms', label: 'Chat Room Management' },
  { key: 'content', label: 'Content Moderation' },
  { key: 'polls', label: 'Poll Management' },
  { key: 'pledge-management', label: 'Pledge Management' },
  { key: 'ad-management', label: 'Ad Management' },
  { key: 'events', label: 'Events Management' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'lifecycle', label: 'Product Lifecycle Manager' },
  { key: 'feature-hub', label: 'Feature Hub Content' },
  { key: 'financials', label: 'Financials' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'refunds', label: 'Refund Management' },
  { key: 'alerts', label: 'System Alerts' },
  { key: 'activity-logs', label: 'Activity Logs' },
  { key: 'feedback', label: 'Feedback & Support' },
  { key: 'settings', label: 'Platform Settings' },
];

/** Admin tabs that can never be hidden (the server refuses it too). */
export const ADMIN_NAV_LOCKED = ['settings', 'dashboard'];

const configMap = (config) => {
  const map = new Map();
  const items = config && Array.isArray(config.items) ? config.items : [];
  for (const item of items) {
    if (item && typeof item.key === 'string') map.set(item.key, item);
  }
  return map;
};

/**
 * Applies a sidebar config to a list of entries.
 *   keyOf(entry)          -> the entry's key
 *   withLabel(entry, s)   -> a copy of the entry with its label replaced
 *   locked                -> keys that are never hidden
 */
export function applyNavConfig(entries, config, { keyOf = (e) => e.key, withLabel = (e, label) => ({ ...e, label }), locked = [] } = {}) {
  const map = configMap(config);
  if (!map.size) return entries;
  return entries
    .map((entry, index) => {
      const conf = map.get(keyOf(entry));
      const order = conf && Number.isInteger(conf.order) ? conf.order : index;
      return { entry, index, order, conf };
    })
    .filter(({ entry, conf }) => !(conf && conf.visible === false && !locked.includes(keyOf(entry))))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ entry, conf }) => {
      const label = conf && typeof conf.label === 'string' ? conf.label.trim() : '';
      return label ? withLabel(entry, label) : entry;
    });
}

/** Editor rows: defaults merged with a saved config, in effective order. */
export function editorRows(defaults, config) {
  const map = configMap(config);
  return defaults
    .map((d, index) => {
      const conf = map.get(d.key) || {};
      return {
        key: d.key,
        defaultLabel: d.label,
        label: typeof conf.label === 'string' ? conf.label : '',
        visible: conf.visible !== false,
        order: Number.isInteger(conf.order) ? conf.order : index,
        index,
      };
    })
    .sort((a, b) => a.order - b.order || a.index - b.index);
}

/** Serialises editor rows back to a config (orders renumbered 0..n-1). */
export function rowsToConfig(rows) {
  return {
    items: rows.map((r, i) => {
      const item = { key: r.key, visible: r.visible !== false, order: i };
      const label = (r.label || '').trim();
      if (label && label !== r.defaultLabel) item.label = label;
      return item;
    }),
  };
}
