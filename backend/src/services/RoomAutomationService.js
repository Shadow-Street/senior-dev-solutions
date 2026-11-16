/**
 * Scheduled room actions (Super Admin > Chat Room Management > Automation).
 *
 * The panel used to save schedules into a table nothing ever read, so a
 * "scheduled announcement" never went out. Each automation is now a
 * room_automations row:
 *
 *   trigger_type  'schedule'
 *   action_type   send_message | lock_room | unlock_room | archive_room
 *   config        { run_at, recurrence: once|daily|weekly, message, next_run_at }
 *
 * runDue() (every minute, started from server.js) executes rows whose
 * next_run_at has passed. A row is claimed with a conditional UPDATE on
 * last_triggered_at first, so two API processes never run it twice.
 */
const db = require('../models');

const ACTIONS = ['send_message', 'lock_room', 'unlock_room', 'archive_room'];
const RECURRENCES = ['once', 'daily', 'weekly'];
const MAX_MESSAGE = 2000;
const TICK_MS = 60 * 1000;

class AutomationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const parseConfig = (raw) => {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
};

/**
 * Validates an admin payload into the stored shape. `existing` is the row
 * being edited (its run time may stay in the past); a new one must be future.
 */
function normalizeAutomation(body = {}, existing = null) {
  const prev = existing ? { ...existing, config: parseConfig(existing.config) } : { config: {} };
  const config = { ...prev.config, ...(body.config && typeof body.config === 'object' ? body.config : {}) };
  const errors = [];

  const roomId = body.chat_room_id ?? prev.chat_room_id;
  if (typeof roomId !== 'string' || !roomId) errors.push('Choose a room');

  const action = body.action_type ?? prev.action_type;
  if (!ACTIONS.includes(action)) errors.push('Unknown action');

  const recurrence = config.recurrence || 'once';
  if (!RECURRENCES.includes(recurrence)) errors.push('Repeat must be once, daily or weekly');

  const runAt = new Date(config.run_at);
  if (!config.run_at || Number.isNaN(runAt.getTime())) errors.push('Choose a valid date and time');
  const runAtChanged = !existing || String(parseConfig(existing.config).run_at) !== String(config.run_at);
  if (!errors.length && runAtChanged && runAt.getTime() < Date.now() - 60000) errors.push('The scheduled time must be in the future');

  const message = String(config.message ?? '').trim();
  if (action === 'send_message' && !message) errors.push('Enter the message to post');
  if (message.length > MAX_MESSAGE) errors.push(`Message must be ${MAX_MESSAGE} characters or fewer`);

  const isActive = body.is_active === undefined ? (existing ? Boolean(existing.is_active) : true) : Boolean(body.is_active);

  // Next run. A new time is used as given (checked future above). Otherwise
  // the stored next run is kept; turning on (or saving) a schedule whose time
  // has passed must not fire it at once: a recurring one moves to its next
  // future slot, a one-off needs a new time. Editing a finished one-off used
  // to re-post it within a minute.
  let nextRun = null;
  if (!errors.length) {
    if (runAtChanged) {
      nextRun = runAt.toISOString();
    } else {
      nextRun = prev.config.next_run_at || null;
      const stale = !nextRun || new Date(nextRun).getTime() < Date.now() - 60000;
      if (isActive && stale) {
        if (recurrence === 'once') {
          errors.push('This schedule has already run. Choose a new time in the future.');
        } else {
          nextRun = nextRunAfter({ recurrence, next_run_at: nextRun || runAt.toISOString() }, new Date());
        }
      }
    }
  }

  const out = {
    run_at: errors.length ? config.run_at : runAt.toISOString(),
    recurrence,
    message: action === 'send_message' ? message : null,
    next_run_at: nextRun,
  };
  return {
    errors,
    data: {
      chat_room_id: roomId,
      trigger_type: 'schedule',
      action_type: action,
      config: out,
      is_active: isActive,
    },
  };
}

/** The next run after `from` for a recurring schedule, or null for 'once'. */
function nextRunAfter(config, from) {
  const step = config.recurrence === 'daily' ? 86400000 : config.recurrence === 'weekly' ? 7 * 86400000 : 0;
  if (!step) return null;
  let next = new Date(config.next_run_at || config.run_at).getTime();
  while (next <= from.getTime()) next += step;
  return new Date(next).toISOString();
}

const roomSettingsOf = (room) => parseConfig(room.settings);

async function execute(automation, config, ws) {
  const room = await db.ChatRoom.findByPk(automation.chat_room_id);
  if (!room) return 'room_missing';

  if (automation.action_type === 'send_message') {
    const message = await db.Message.create({
      chat_room_id: room.id,
      user_id: automation.created_by || null,
      content: config.message,
      message_type: 'system',
      is_pinned: false,
    });
    await db.ChatRoom.update({ last_message_at: new Date() }, { where: { id: room.id } });
    const author = automation.created_by
      ? await db.User.findByPk(automation.created_by, { attributes: ['id', 'name', 'profile_image_url'] })
      : null;
    ws?.broadcastToRoom(room.id, {
      type: 'new_message',
      message: { ...(message.toJSON ? message.toJSON() : message), User: author?.toJSON ? author.toJSON() : author },
      roomId: room.id,
      timestamp: new Date().toISOString(),
    });
    return 'sent';
  }

  if (automation.action_type === 'archive_room') {
    await room.update({ status: 'archived' });
  } else {
    const settings = { ...roomSettingsOf(room) };
    if (automation.action_type === 'lock_room') {
      Object.assign(settings, { locked: true, lock_reason: 'Scheduled lock', locked_at: new Date().toISOString() });
    } else {
      delete settings.locked; delete settings.lock_reason; delete settings.locked_by; delete settings.locked_at;
    }
    await room.update({ settings });
  }
  ws?.broadcastToRoom(room.id, {
    type: 'room_updated',
    room: { id: room.id, status: room.status || 'active', locked: roomSettingsOf(room).locked === true },
    timestamp: new Date().toISOString(),
  });
  return 'done';
}

/** Runs every active automation whose time has come. Returns what ran. */
async function runDue(ws = null, now = new Date()) {
  const rows = await db.RoomAutomation.findAll({ where: { is_active: true, trigger_type: 'schedule' }, limit: 500 });
  const ran = [];
  for (const automation of rows) {
    const config = parseConfig(automation.config);
    const due = config.next_run_at && new Date(config.next_run_at) <= now;
    if (!due) continue;

    // Claim and advance in one conditional UPDATE: only the process whose
    // UPDATE still sees the old last_triggered_at runs it, and the next run
    // is already moved on, so a slow or crashed run is never repeated by the
    // next tick (at most once).
    const next = nextRunAfter(config, now);
    const advanced = { ...config, next_run_at: next };
    const [claimed] = await db.RoomAutomation.update(
      { last_triggered_at: now, config: advanced, is_active: next ? automation.is_active : false },
      { where: { id: automation.id, is_active: true, last_triggered_at: automation.last_triggered_at ?? null } },
    );
    if (!claimed) continue;

    let outcome;
    try {
      outcome = await execute(automation, config, ws);
    } catch (e) {
      console.error('[RoomAutomationService] run failed:', e.message);
      outcome = 'failed';
    }
    await db.RoomAutomation.update(
      { config: { ...advanced, last_outcome: outcome } },
      { where: { id: automation.id } },
    );
    await db.AuditLog.create({
      user_id: null,
      action: 'CHAT_AUTOMATION_RUN',
      entity_type: 'ChatRoom',
      entity_id: automation.chat_room_id,
      new_data: { automation_id: automation.id, action_type: automation.action_type, outcome },
      description: `Scheduled ${automation.action_type} ran (${outcome})`,
    }).catch(() => {});
    ran.push({ id: automation.id, outcome });
  }
  return ran;
}

let timer = null;
function start(ws) {
  if (timer) return;
  timer = setInterval(() => {
    runDue(ws).catch((e) => console.error('[RoomAutomationService] tick failed:', e.message));
  }, TICK_MS);
  if (typeof timer.unref === 'function') timer.unref();
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { ACTIONS, RECURRENCES, AutomationError, normalizeAutomation, nextRunAfter, runDue, start, stop };
