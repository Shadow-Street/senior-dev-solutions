const express = require('express');
const db = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { loadTallies } = require('../utils/pollTally');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 8;

/**
 * GET /api/activity/recent
 *
 * Aggregate, non-sensitive community activity for the dashboard feed. Any
 * signed-in user may read it, so the payload is limited to what is already
 * public to them:
 *   - titles of free, active, site-wide polls (premium polls, polls tied to a
 *     chat room and deactivated polls are left out, and so is the poll creator);
 *   - results of free site-wide polls that have closed;
 *   - COUNTS of new members and of recent messages in open rooms, plus the
 *     name of the busiest open room. Never message text, member names, e-mail
 *     addresses, or anything from private, premium or admin rooms.
 *
 * Each item: { id, type: 'poll'|'poll_result'|'chat'|'members', title,
 *              description, occurred_at, link }. Newest first.
 */
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const { Op, fn, col } = db.Sequelize;
    const now = new Date();
    const since = new Date(now.getTime() - DAY_MS);
    const freePoll = { [Op.or]: [{ is_premium: false }, { is_premium: null }] };
    // Only site-wide polls: a poll that belongs to a chat room inherits that
    // room's privacy, and the poll row does not say whether the room is open.
    // Deactivated polls are never surfaced.
    const siteWide = { chat_room_id: null };
    const notDeactivated = { [Op.or]: [{ is_active: { [Op.ne]: false } }, { is_active: null }] };
    const items = [];

    // Newest free, active polls.
    const newest = await db.Poll.findAll({
      where: { [Op.and]: [freePoll, siteWide, { is_active: true }, { status: 'active' }] },
      attributes: ['id', 'title', 'stock_symbol', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 3,
    });
    for (const p of newest) {
      items.push({
        id: `poll-${p.id}`,
        type: 'poll',
        title: p.stock_symbol ? `New poll for ${p.stock_symbol}` : 'New community poll',
        description: p.title || '',
        occurred_at: p.created_at,
        link: '/polls',
      });
    }

    // Most recently closed free polls, with the leading option.
    const closed = await db.Poll.findAll({
      where: {
        [Op.and]: [
          freePoll,
          siteWide,
          notDeactivated,
          { [Op.or]: [{ status: 'closed' }, { expires_at: { [Op.lte]: now } }] },
        ],
      },
      attributes: ['id', 'title', 'stock_symbol', 'options', 'expires_at', 'updated_at', 'created_at'],
      order: [['updated_at', 'DESC']],
      limit: 2,
    });
    const tallies = await loadTallies(closed.map((p) => p.id));
    for (const p of closed) {
      const { byOption } = tallies.get(p.id);
      const total = Object.values(byOption).reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      const [leadIdx, leadCount] = Object.entries(byOption).sort((a, b) => b[1] - a[1])[0];
      const options = Array.isArray(p.options) ? p.options : [];
      const label = options[Number(leadIdx)] || `Option ${Number(leadIdx) + 1}`;
      items.push({
        id: `poll-result-${p.id}`,
        type: 'poll_result',
        title: `Poll result: ${p.stock_symbol || p.title || 'Community poll'}`,
        description: `${Math.round((leadCount / total) * 100)}% voted ${label} (${total} ${total === 1 ? 'vote' : 'votes'})`,
        occurred_at: p.expires_at && new Date(p.expires_at) <= now ? p.expires_at : p.updated_at || p.created_at,
        link: '/polls',
      });
    }

    // New members: a count only.
    const newMembers = await db.User.count({ where: { created_at: { [Op.gte]: since } } });
    if (newMembers > 0) {
      items.push({
        id: 'members-24h',
        type: 'members',
        title: `${newMembers} new ${newMembers === 1 ? 'member' : 'members'} joined`,
        description: 'In the last 24 hours',
        occurred_at: since,
        link: null,
      });
    }

    // Chat: message volume in open rooms only.
    const openRooms = await db.ChatRoom.findAll({
      where: {
        [Op.and]: [
          { [Op.or]: [{ is_public: { [Op.ne]: false } }, { is_public: null }] },
          { [Op.or]: [{ is_premium: { [Op.ne]: true } }, { is_premium: null }] },
          { [Op.or]: [{ room_type: null }, { room_type: { [Op.notIn]: ['admin', 'premium', 'premium_admin'] } }] },
          // A room gated behind a plan is not open, whatever its other flags say.
          { [Op.or]: [{ required_plan: null }, { required_plan: '' }] },
        ],
      },
      attributes: ['id', 'name'],
    });
    if (openRooms.length > 0) {
      const names = new Map(openRooms.map((r) => [r.id, r.name]));
      const perRoom = await db.Message.findAll({
        where: { chat_room_id: { [Op.in]: [...names.keys()] }, created_at: { [Op.gte]: since } },
        attributes: ['chat_room_id', [fn('COUNT', col('id')), 'count'], [fn('MAX', col('created_at')), 'latest']],
        group: ['chat_room_id'],
        raw: true,
      });
      const counted = perRoom.map((r) => ({ ...r, count: Number.parseInt(r.count, 10) || 0 })).filter((r) => r.count > 0);
      if (counted.length > 0) {
        const messages = counted.reduce((a, r) => a + r.count, 0);
        const busiest = counted.sort((a, b) => b.count - a.count)[0];
        const latest = counted.reduce((m, r) => (new Date(r.latest) > new Date(m) ? r.latest : m), counted[0].latest);
        items.push({
          id: 'chat-24h',
          type: 'chat',
          title: `${messages} ${messages === 1 ? 'message' : 'messages'} across ${counted.length} ${counted.length === 1 ? 'room' : 'rooms'}`,
          description: `Busiest: ${names.get(busiest.chat_room_id) || 'a chat room'}`,
          occurred_at: latest,
          link: '/chatrooms',
        });
      }
    }

    items.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    res.json({ items: items.slice(0, MAX_ITEMS), generated_at: now.toISOString() });
  } catch (error) {
    console.error('[activity.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
