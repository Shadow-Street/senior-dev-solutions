/**
 * Super Admin > Chat Room Management API (/api/chat-management).
 *
 * Every route here is admin-only (authMiddleware + adminMiddleware at the
 * router level), takes whitelisted fields only, and writes an audit row
 * through ChatRoomAdminService / ChatModerationService / RoomAutomationService.
 *
 * /automations, /rules and /invites used to be raw CRUD over models whose
 * columns the panels did not match, so saves stored empty rows and nothing
 * ever acted on them. They keep their paths but now validate and do real work.
 */
const express = require('express');
const { Op } = require('sequelize');
const db = require('../models');
const { createCrudController, createCrudRoutes } = require('../utils/crudController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Admin = require('../services/ChatRoomAdminService');
const ChatModerationService = require('../services/ChatModerationService');
const RoomAutomationService = require('../services/RoomAutomationService');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

/** Wraps a handler: service errors carry their status; anything else is a generic 500. */
const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) res.status(req.__created ? 201 : 200).json(result);
  } catch (error) {
    if (error && Number.isInteger(error.status) && error.status < 500) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('[chat_management.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
const created = (req) => { req.__created = true; };

// ---- overview, rooms -------------------------------------------------------

router.get('/overview', handle((req) => Admin.overview(req)));
router.get('/live', handle((req) => Admin.liveActivity(req)));
router.get('/analytics', handle((req) => Admin.analytics({ days: req.query.days })));

router.post('/rooms', handle(async (req) => { created(req); return Admin.createRoom(req, req.body); }));
router.post('/rooms/bulk', handle((req) => Admin.bulkRooms(req, req.body || {})));
router.put('/rooms/:id', handle((req) => Admin.updateRoom(req, req.params.id, req.body)));
router.post('/rooms/:id/archive', handle((req) => Admin.setRoomStatus(req, req.params.id, 'archived')));
router.post('/rooms/:id/restore', handle((req) => Admin.setRoomStatus(req, req.params.id, 'active')));
router.post('/rooms/:id/lock', handle((req) => Admin.setRoomLocked(req, req.params.id, true, req.body?.reason)));
router.post('/rooms/:id/unlock', handle((req) => Admin.setRoomLocked(req, req.params.id, false)));
router.delete('/rooms/:id', handle((req) => Admin.deleteRoom(req, req.params.id, { confirm: req.body?.confirm ?? req.query.confirm })));

// People picker for adding participants and granting access. Admin-only like
// the rest; returns the few fields the dialogs show, never credentials.
router.get('/users', handle(async (req) => {
  const term = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  if (term.length < 2) return [];
  const like = { [Op.like]: `%${term.replace(/[\\%_]/g, '\\$&')}%` };
  const users = await db.User.findAll({
    where: { [Op.or]: [{ name: like }, { display_name: like }, { email: like }] },
    attributes: ['id', 'name', 'display_name', 'email', 'app_role', 'role', 'status', 'is_premium'],
    order: [['name', 'ASC']],
    limit: 20,
  });
  return users.map((u) => ({
    id: u.id, name: u.display_name || u.name || u.email, email: u.email,
    app_role: u.app_role || u.role, status: u.status, is_premium: u.is_premium === true,
  }));
}));

// ---- participants, mutes, bans ----------------------------------------------

router.get('/rooms/:id/participants', handle((req) => Admin.listParticipants(req, req.params.id)));
router.post('/rooms/:id/participants', handle(async (req) => {
  const result = await Admin.addParticipant(req, req.params.id, req.body || {});
  if (result.created) created(req);
  return result;
}));
router.patch('/rooms/:id/participants/:userId', handle((req) => Admin.updateParticipant(req, req.params.id, req.params.userId, req.body || {})));
router.delete('/rooms/:id/participants/:userId', handle((req) => Admin.removeParticipant(req, req.params.id, req.params.userId)));
router.post('/rooms/:id/bans', handle((req) => Admin.banUser(req, req.params.id, req.body || {})));
router.delete('/rooms/:id/bans/:userId', handle((req) => Admin.unbanUser(req, req.params.id, req.params.userId)));

// ---- messages -----------------------------------------------------------------

router.get('/rooms/:id/messages', handle((req) => Admin.listMessages(req.params.id, req.query)));
router.delete('/messages/:id', handle((req) => Admin.deleteMessage(req, req.params.id)));
router.post('/messages/:id/pin', handle((req) => Admin.setMessagePinned(req, req.params.id, true)));
router.post('/messages/:id/unpin', handle((req) => Admin.setMessagePinned(req, req.params.id, false)));

// ---- paid room access -------------------------------------------------------------

router.get('/room-subscriptions', handle((req) => Admin.listRoomSubscriptions(req.query)));
router.post('/rooms/:id/subscriptions', handle(async (req) => { created(req); return Admin.grantRoomAccess(req, req.params.id, req.body || {}); }));
router.post('/room-subscriptions/:id/revoke', handle((req) => Admin.revokeRoomSubscription(req, req.params.id)));

// ---- invites --------------------------------------------------------------------------

router.get('/invites', handle((req) => Admin.listInvites(req.query)));
// '/generate' is the old path; both create a crypto-random code.
router.post(['/invites', '/invites/generate'], handle(async (req) => { created(req); return Admin.createInvite(req, req.body || {}); }));
router.post('/invites/:id/revoke', handle((req) => Admin.revokeInvite(req, req.params.id)));
router.delete('/invites/:id', handle((req) => Admin.deleteInvite(req, req.params.id)));

// ---- moderation rules -----------------------------------------------------------------

const ruleJson = (r) => {
  const x = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
  if (typeof x.conditions === 'string') { try { x.conditions = JSON.parse(x.conditions); } catch { x.conditions = {}; } }
  return x;
};
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const notFound = (message) => Object.assign(new Error(message), { status: 404 });

async function assertRoomOrGlobal(roomId) {
  if (roomId && !(await db.ChatRoom.findByPk(roomId))) throw notFound('Room not found');
}

router.get('/rules', handle(async () => {
  const rows = await db.ModerationRule.findAll({ order: [['created_at', 'DESC']], limit: 500 });
  return rows.map(ruleJson);
}));
router.post('/rules', handle(async (req) => {
  const { data, errors } = ChatModerationService.normalizeRule(req.body || {});
  if (errors.length) throw badRequest(errors[0]);
  await assertRoomOrGlobal(data.chat_room_id);
  const rule = await db.ModerationRule.create({ ...data, created_by: req.user.id });
  ChatModerationService.invalidateRules();
  await Admin.audit(req, 'CHAT_RULE_CREATED', 'ModerationRule', rule.id, { newData: data, description: `Created moderation rule "${data.name}"` });
  created(req);
  return ruleJson(rule);
}));
router.put('/rules/:id', handle(async (req) => {
  const rule = await db.ModerationRule.findByPk(req.params.id);
  if (!rule) throw notFound('Rule not found');
  const existing = ruleJson(rule);
  const { data, errors } = ChatModerationService.normalizeRule(req.body || {}, existing);
  if (errors.length) throw badRequest(errors[0]);
  await assertRoomOrGlobal(data.chat_room_id);
  await rule.update(data);
  ChatModerationService.invalidateRules();
  await Admin.audit(req, 'CHAT_RULE_UPDATED', 'ModerationRule', rule.id, {
    oldData: { name: existing.name, rule_type: existing.rule_type, action: existing.action, conditions: existing.conditions, is_active: existing.is_active, chat_room_id: existing.chat_room_id },
    newData: data,
    description: `Updated moderation rule "${data.name}"`,
  });
  return ruleJson(rule);
}));
router.delete('/rules/:id', handle(async (req) => {
  const rule = await db.ModerationRule.findByPk(req.params.id);
  if (!rule) throw notFound('Rule not found');
  await rule.destroy();
  ChatModerationService.invalidateRules();
  await Admin.audit(req, 'CHAT_RULE_DELETED', 'ModerationRule', rule.id, { oldData: ruleJson(rule), description: `Deleted moderation rule "${rule.name}"` });
  return { success: true };
}));

// ---- automations ----------------------------------------------------------------------

const automationJson = (a) => {
  const x = typeof a.toJSON === 'function' ? a.toJSON() : { ...a };
  if (typeof x.config === 'string') { try { x.config = JSON.parse(x.config); } catch { x.config = {}; } }
  return x;
};

router.get('/automations', handle(async () => {
  const rows = await db.RoomAutomation.findAll({ order: [['created_at', 'DESC']], limit: 500 });
  return rows.map(automationJson);
}));
router.post('/automations', handle(async (req) => {
  const { data, errors } = RoomAutomationService.normalizeAutomation(req.body || {});
  if (errors.length) throw badRequest(errors[0]);
  await assertRoomOrGlobal(data.chat_room_id);
  const automation = await db.RoomAutomation.create({ ...data, created_by: req.user.id, last_triggered_at: null });
  await Admin.audit(req, 'CHAT_AUTOMATION_CREATED', 'ChatRoom', data.chat_room_id, {
    newData: { automation_id: automation.id, ...data }, description: `Scheduled ${data.action_type}`,
  });
  created(req);
  return automationJson(automation);
}));
router.put('/automations/:id', handle(async (req) => {
  const automation = await db.RoomAutomation.findByPk(req.params.id);
  if (!automation) throw notFound('Automation not found');
  const existing = automationJson(automation);
  const { data, errors } = RoomAutomationService.normalizeAutomation(req.body || {}, existing);
  if (errors.length) throw badRequest(errors[0]);
  await assertRoomOrGlobal(data.chat_room_id);
  await automation.update(data);
  await Admin.audit(req, 'CHAT_AUTOMATION_UPDATED', 'ChatRoom', data.chat_room_id, {
    oldData: { automation_id: automation.id, action_type: existing.action_type, config: existing.config, is_active: existing.is_active },
    newData: data,
    description: `Updated scheduled ${data.action_type}`,
  });
  return automationJson(automation);
}));
router.delete('/automations/:id', handle(async (req) => {
  const automation = await db.RoomAutomation.findByPk(req.params.id);
  if (!automation) throw notFound('Automation not found');
  await automation.destroy();
  await Admin.audit(req, 'CHAT_AUTOMATION_DELETED', 'ChatRoom', automation.chat_room_id, {
    oldData: automationJson(automation), description: `Deleted scheduled ${automation.action_type}`,
  });
  return { success: true };
}));

// ---- VIP features (unchanged; admin-only CRUD, not surfaced in the screen) ------------

const vipRouter = express.Router();
const vipController = createCrudController(db.VIPFeature, { defaultOrderBy: 'id', defaultOrder: 'ASC' });
createCrudRoutes(vipRouter, vipController, []);
router.use('/vip-features', vipRouter);

module.exports = router;
