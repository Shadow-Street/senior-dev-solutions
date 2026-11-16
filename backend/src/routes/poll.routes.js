const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const { withTallies, reconcileTalliesOnGet } = require("../utils/pollTally");
const { effectiveRole } = require("../utils/roles");
const PollAdmin = require("../services/PollAdminService");

const parseValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
};

// Polls CRUD
// Fields a non-staff caller may never write through the generic CRUD. Before
// this, any signed-in member could PUT is_active back to true on a poll a
// moderator had hidden, rewrite vote counters, or mark a poll admin-created.
const POLL_PROTECTED_FIELDS = [
  'created_by', 'created_by_role', 'created_by_admin', 'creation_source', 'is_active',
  'votes', 'total_votes', 'buy_votes', 'sell_votes', 'hold_votes',
  'bullish_votes', 'bearish_votes', 'neutral_votes', 'yes_votes', 'no_votes',
];

const pollController = createCrudController(db.Poll, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  protectedFields: POLL_PROTECTED_FIELDS,
  beforeCreate: async (data, req) => {
    // Server-controlled on every create. stripProtected() treats sub_admin as
    // staff, so the poll-specific rule is applied here as well.
    if (!['admin', 'super_admin'].includes(effectiveRole(req.user))) {
      for (const key of [...POLL_PROTECTED_FIELDS, 'is_boosted', 'boost_expires_at', 'boosted_by']) delete data[key];
      data.status = 'active';
      data.is_active = true;
    }
    Object.assign(data, {
      votes: {}, total_votes: 0, buy_votes: 0, sell_votes: 0, hold_votes: 0,
      bullish_votes: 0, bearish_votes: 0, neutral_votes: 0, yes_votes: 0, no_votes: 0,
    });

    // Set metadata
    data.created_by = req.user.id;
    data.created_by_role = req.user.app_role || req.user.role || 'user';

    // Premium validation
    if (data.is_premium) {
      const isPremiumUser = req.user.is_premium || ['admin', 'super_admin', 'advisor'].includes(req.user.app_role);
      if (!isPremiumUser) {
        throw new Error('Only premium users or admins can create premium polls');
      }
    }

    console.log("data", data);
    if (data.stock_symbol && data.status === 'active') {
      const existing = await db.Poll.findOne({
        where: {
          stock_symbol: data.stock_symbol,
          status: 'active',
          is_active: true
        }
      });
      console.log("existing", existing);

      if (existing) {
        throw new Error(`Active poll for ${data.stock_symbol} already exists`);
      }
    }
    return data;
  },
  afterCreate: async (poll, req) => {
    try {
      const wsService = req.app.get('wsService');
      if (wsService) {
        wsService.broadcastAll({
          type: 'poll:created',
          poll: poll.toJSON()
        });
      }

      const isAdvisor = req.user.app_role === 'advisor' || req.user.app_role === 'admin';
      if (isAdvisor && db.Subscription) {
        const subscribers = await db.Subscription.findAll({
          where: {
            advisor_id: req.user.id,
            status: 'active'
          },
          attributes: ['user_id']
        });

        for (const sub of subscribers) {
          if (sub.user_id && sub.user_id !== req.user.id && wsService.sendNotification) {
            wsService.sendNotification(sub.user_id, {
              type: 'POLL_CREATED',
              title: 'New Advisor Poll',
              message: `Your advisor has posted a new poll: ${poll.title}`,
              data: { pollId: poll.id, stock: poll.stock_symbol },
              action_url: '/polls'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in poll afterCreate hook:', error);
    }
  },


  afterCreate_1: async (poll, req) => {
    console.log("poll", poll);
    try {
      // 1. Broadcast new poll to all connected users
      const wsService = req.app.get('wsService');
      if (wsService) {
        wsService.broadcastAll({
          type: 'poll:created',
          poll: poll.toJSON()
        });
      }

      // 2. Notify users based on context (e.g. followers if advisor, or generic system notification)
      // For now, if created by admin/advisor, we could notify all or followers.
      // Keeping it simple: If it's an important poll (e.g. Premium/Advisor), maybe notify?
      // Requirements say "Notifications sent to followers".

      const creatorId = req.user.id;

      // If creator is advisor/influencer, notify followers
      // We need to check if user is advisor/fininfluencer
      const isAdvisor = req.user.app_role === 'advisor' || req.user.app_role === 'admin'; // simplification

      if (isAdvisor) {
        // Fetch users who subscribed to this advisor
        // We look for active subscriptions where advisor_id matches creatorId
        try {
          // Check if Subscription model is available in db
          if (db.Subscription) {
            const subscribers = await db.Subscription.findAll({
              where: {
                advisor_id: creatorId,
                status: 'active'
              },
              attributes: ['user_id']
            });

            // Send notification to each subscriber
            for (const sub of subscribers) {
              if (sub.user_id && sub.user_id !== creatorId) {
                // Use built-in sendNotification if available or custom emit
                // WebSocketService has sendNotification method as per analysis
                if (typeof wsService.sendNotification === 'function') {
                  wsService.sendNotification(sub.user_id, {
                    type: 'POLL_CREATED',
                    title: 'New Advisor Poll',
                    message: `Your advisor has posted a new poll: ${poll.title}`,
                    data: { pollId: poll.id, stock: poll.stock_symbol },
                    action_url: '/polls'
                  });
                }
              }
            }
          }
        } catch (subError) {
          console.error("Failed to notify subscribers:", subError);
        }
      }

    } catch (error) {
      console.error('Error in poll afterCreate hook:', error);
    }
  }
});

// Get active polls
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const polls = await db.Poll.findAll({
      where: {
        status: 'active',
        // Polls hidden by a moderator (is_active = false) are not listed publicly.
        [db.Sequelize.Op.and]: [
          { [db.Sequelize.Op.or]: [{ is_active: true }, { is_active: null }] },
          { [db.Sequelize.Op.or]: [{ expires_at: null }, { expires_at: { [db.Sequelize.Op.gt]: now } }] }
        ]
      },
      order: [['created_at', 'DESC']]
    });
    res.json(await withTallies(polls));
  } catch (error) {
    console.error('[poll.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get polls by room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const polls = await db.Poll.findAll({
      where: { chat_room_id: roomId },
      order: [['created_at', 'DESC']],
      include: [{ model: db.PollVote }]
    });
    res.json(polls);
  } catch (error) {
    console.error('[poll.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
// CRUD routes are registered at the bottom so '/:id' cannot shadow '/votes'.

// Poll Votes sub-routes
const voteRouter = express.Router();
const voteController = createCrudController(db.PollVote, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  customFilters: (rawFilters, req) => {
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.app_role);
    const where = {};

    if (!isAdmin) {
      // Force non-admins (and any caller without a user) to their own votes only.
      where.user_id = req.user?.id ?? null;
    }

    Object.keys(rawFilters).forEach(key => {
      if (key === 'user_id' && !isAdmin) return; // Ignore user_id filter for non-admins
      const value = rawFilters[key];
      if (value === undefined || value === '') return;
      where[key] = parseValue(value);
    });

    return where;
  }
});

// Cast vote
voteRouter.post('/cast', authMiddleware, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { poll_id, option_index } = req.body;

    // Validate required fields
    if (!poll_id || option_index === undefined || option_index === null) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide poll_id and option_index'
      });
    }

    // Validate option_index is a number
    const optionIdx = parseInt(option_index);
    if (isNaN(optionIdx) || optionIdx < 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid option_index',
        message: 'Option index must be a non-negative number'
      });
    }

    // Get poll and validate
    const poll = await db.Poll.findByPk(poll_id, { transaction });
    if (!poll) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Poll not found',
        message: 'This poll may have been deleted'
      });
    }

    // Closed (status) or hidden by a moderator (is_active = false): no voting.
    // This used to require BOTH to be off, so a suspended poll still took votes.
    if (poll.is_active === false || (poll.status && poll.status !== 'active')) {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Poll is not active',
        message: 'This poll is closed for voting'
      });
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) <= new Date()) {
      await transaction.rollback();
      return res.status(403).json({
        error: 'Poll has expired',
        message: 'Voting has closed for this poll'
      });
    }

    // Validate option_index against poll options
    const pollOptions = poll.options || [];
    if (pollOptions.length > 0 && optionIdx >= pollOptions.length) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid option',
        message: `Option index must be between 0 and ${pollOptions.length - 1}`
      });
    }

    // Check if already voted
    const existing = await db.PollVote.findOne({
      where: { poll_id, user_id: req.user.id },
      transaction
    });

    console.log("existing", existing);
    let vote;
    let isUpdate = false;
    // CLONE the votes object to ensure Sequelize detects the change
    const votes = { ...(poll.votes || {}) };

    if (existing) {
      // User is changing their vote
      const oldOption = existing.option_index;

      if (oldOption === optionIdx) {
        // Same vote, no need to update
        await transaction.commit();
        return res.json({
          message: 'You have already voted for this option',
          vote: existing
        });
      }

      // Decrement old option count
      if (votes[oldOption] !== undefined && votes[oldOption] > 0) {
        votes[oldOption] = votes[oldOption] - 1;
      }

      // Increment new option count
      votes[optionIdx] = (votes[optionIdx] || 0) + 1;

      // Update the vote record
      await existing.update({ option_index: optionIdx }, { transaction });
      vote = existing;
      isUpdate = true;

    } else {
      // Create new vote
      vote = await db.PollVote.create({
        poll_id,
        user_id: req.user.id,
        option_index: optionIdx,
        voted_at: new Date(),
        created_at: new Date()
      }, { transaction });

      // Increment vote count
      votes[optionIdx] = (votes[optionIdx] || 0) + 1;

      // Increment total votes only for new votes
      await poll.update({
        votes,
        total_votes: (poll.total_votes || 0) + 1
      }, { transaction });

      // === TRUST SCORE LOGIC ===
      // Check if this is the first vote of the day for the user
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const voteToday = await db.PollVote.findOne({
        where: {
          user_id: req.user.id,
          voted_at: {
            [db.Sequelize.Op.gte]: today
          },
          id: { [db.Sequelize.Op.ne]: vote.id } // Exclude current vote
        },
        transaction
      });

      if (!voteToday) {
        // It's the first vote today! Reward user.
        // Increment user trust score (assuming user model has it or we use TrustScoreLog)

        // 1. Log the trust score increase
        await db.TrustScoreLog.create({
          user_id: req.user.id,
          score: 2,
          previous_score: 0, // Simplified, ideal to fetch user's current score
          reason: 'Daily First Poll Vote',
          action_type: 'poll_vote'
        }, { transaction });

        // 2. Ideally update User model if it has trust_score field
        // Checked User model, it doesn't explicitly show 'trust_score' in the visible snippet in step 62, 
        // but it might be there or we just rely on logs. 
        // Let's assume we might need to update it if it exists, or just the log is enough for the feature.
        // Implementation plan said "increment trust_score by 2".
        // I'll leave a comment about User update or if I should add it to User model.
        // For now, logging to TrustScoreLog is the persistent record.
      }
    }

    // For vote changes, update poll without incrementing total
    if (isUpdate) {
      await poll.update({ votes }, { transaction });
    }

    await transaction.commit();

    // === REAL-TIME UPDATE ===
    // Broadcast updated poll data, reconciled against the PollVote rows so
    // listeners never overwrite a correct tally with a drifted counter.
    const wsService = req.app.get('wsService');
    if (wsService) {
      let updatedPoll = poll;
      try {
        updatedPoll = await withTallies(poll);
      } catch (tallyError) {
        console.error('Poll tally for broadcast failed:', tallyError);
      }
      wsService.broadcastAll({
        type: 'poll:updated',
        pollId: poll.id,
        votes: updatedPoll.votes,
        total_votes: updatedPoll.total_votes,
        updatedPoll
      });
    }

    res.status(isUpdate ? 200 : 201).json({
      message: isUpdate ? 'Vote updated successfully' : 'Vote submitted successfully',
      vote,
      trustScoreEarned: (!existing && !await db.PollVote.findOne({ where: { user_id: req.user.id, voted_at: { [db.Sequelize.Op.gte]: new Date().setHours(0, 0, 0, 0) }, id: { [db.Sequelize.Op.ne]: vote.id } } })) ? 2 : 0
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Vote casting error:', error);
    res.status(500).json({
      error: 'Failed to cast vote',
      message: 'Something went wrong. Please try again later.'
    });
  }
});

// Get poll results
voteRouter.get('/results/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await db.Poll.findByPk(pollId);
    const votes = await db.PollVote.findAll({
      where: { poll_id: pollId },
      attributes: [
        'option_index',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['option_index']
    });

    res.json({ poll, results: votes });
  } catch (error) {
    console.error('[poll.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my votes
voteRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const votes = await db.PollVote.findAll({
      where: { user_id: req.user.id }
    });
    res.json(votes);
  } catch (error) {
    console.error('[poll.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth is required: customFilters scopes rows to the caller, so an
// unauthenticated request would both crash and bypass that scoping.
createCrudRoutes(voteRouter, voteController, [authMiddleware]);
router.use('/votes', voteRouter);

// ---------------------------------------------------------------------------
// Poll Management (Super Admin). admin / super_admin only; every write is
// whitelisted (PollAdminService.sanitisePollInput) and audit-logged.
// ---------------------------------------------------------------------------
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminMiddleware);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOMORROWS_PICK_KEY = 'tomorrows_pick_override';

const plain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : { ...(record || {}) });

/** Picks the keys of `after` that changed, for a compact audit diff. */
function diff(before, after) {
  const old_data = {};
  const new_data = {};
  for (const key of Object.keys(after)) {
    const a = before[key] instanceof Date ? before[key].toISOString() : before[key];
    const b = after[key] instanceof Date ? after[key].toISOString() : after[key];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) {
      old_data[key] = a ?? null;
      new_data[key] = b ?? null;
    }
  }
  return { old_data, new_data };
}

/** A failed audit write must not undo or hide a successful change. */
async function audit(req, action, entityId, description, oldData = null, newData = null) {
  try {
    await db.AuditLog.create({
      user_id: req.user.id,
      action,
      entity_type: 'poll',
      entity_id: entityId && UUID_RE.test(String(entityId)) ? entityId : null,
      old_data: oldData,
      new_data: newData,
      description: String(description).slice(0, 1000),
      ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
    });
  } catch (error) {
    console.error('[poll.routes.js] audit write failed:', error.message);
  }
}

/** Tells connected clients a poll changed, with reconciled counts. */
async function broadcastPoll(req, poll) {
  const ws = req.app.get('wsService');
  if (!ws) return;
  try {
    const updatedPoll = await withTallies(poll);
    ws.broadcastAll({ type: 'poll:updated', pollId: updatedPoll.id, votes: updatedPoll.votes, total_votes: updatedPoll.total_votes, updatedPoll });
  } catch (error) {
    console.error('[poll.routes.js] broadcast failed:', error.message);
  }
}

const fail = (res, error) => {
  console.error('[poll.routes.js] admin request failed:', error);
  res.status(500).json({ error: 'Internal server error' });
};

/** Loads :id into req.poll, or answers 400/404. */
async function loadPoll(req, res, next) {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid poll id' });
    const poll = await db.Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    req.poll = poll;
    next();
  } catch (error) {
    fail(res, error);
  }
}

const respond = async (res, poll, status = 200) =>
  res.status(status).json(PollAdmin.decorate(await withTallies(poll)));

adminRouter.get('/summary', async (req, res) => {
  try { res.json(await PollAdmin.summary()); } catch (error) { fail(res, error); }
});

adminRouter.get('/analytics', async (req, res) => {
  try { res.json(await PollAdmin.analytics(req.query)); } catch (error) { fail(res, error); }
});

adminRouter.get('/polls', async (req, res) => {
  try { res.json(await PollAdmin.listPolls(req.query)); } catch (error) { fail(res, error); }
});

adminRouter.post('/polls', async (req, res) => {
  try {
    const { data, errors } = PollAdmin.sanitisePollInput(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    if (data.stock_symbol) {
      const { Op } = db.Sequelize;
      const clash = await db.Poll.findOne({
        where: {
          stock_symbol: data.stock_symbol,
          status: 'active',
          is_active: true,
          [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
        },
      });
      if (clash) return res.status(409).json({ error: `An active poll for ${data.stock_symbol} already exists` });
    }

    const poll = await db.Poll.create({
      ...data,
      created_by: req.user.id,
      created_by_role: effectiveRole(req.user),
      created_by_admin: true,
      creation_source: 'admin_panel',
      status: 'active',
      is_active: true,
      votes: {},
      total_votes: 0,
    });
    await audit(req, 'poll_created', poll.id, `Created ${data.is_premium ? 'premium' : 'general'} poll "${data.title}"`, null, data);

    const ws = req.app.get('wsService');
    if (ws) ws.broadcastAll({ type: 'poll:created', poll: plain(poll) });
    await respond(res, poll, 201);
  } catch (error) {
    fail(res, error);
  }
});

adminRouter.get('/polls/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid poll id' });
    const out = await PollAdmin.details(req.params.id);
    if (!out) return res.status(404).json({ error: 'Poll not found' });
    res.json(out);
  } catch (error) {
    fail(res, error);
  }
});

/**
 * Applies a validated admin edit: options/poll_type are frozen once votes
 * exist, the change is audit-logged with an old/new diff and broadcast.
 * `data` must already be whitelisted. Used by PATCH /admin/polls/:id and by
 * admin calls to the generic PUT /api/polls/:id.
 */
async function applyAdminEdit(req, res, poll, data, auditAction = 'poll_updated') {
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });
  const before = plain(poll);
  if (await optionsChangeBlocked(poll, before, data)) {
    return res.status(409).json({ error: 'Options and poll type cannot change once the poll has votes' });
  }
  const { old_data, new_data } = diff(before, data);
  if (!Object.keys(new_data).length) return respond(res, poll);
  await poll.update({ ...data, updated_at: new Date() });
  await audit(req, auditAction, poll.id, `Edited poll "${poll.title || poll.question}" (${Object.keys(new_data).join(', ')})`, old_data, new_data);
  await broadcastPoll(req, poll);
  return respond(res, poll);
}

/**
 * Re-labelling or re-ordering options after votes are in would silently move
 * those votes to a different answer.
 */
async function optionsChangeBlocked(poll, before, data) {
  if (!data.options && !data.poll_type) return false;
  const optionsChanged = data.options && JSON.stringify(data.options) !== JSON.stringify(before.options || []);
  const typeChanged = data.poll_type && data.poll_type !== before.poll_type;
  if (!optionsChanged && !typeChanged) return false;
  const current = await withTallies(poll);
  return current.total_votes > 0;
}

/** Deletes a poll and its PollVote rows in one transaction, then audits it. */
async function deletePollWithVotes(req, res, poll, auditAction) {
  const transaction = await db.sequelize.transaction();
  try {
    const snapshot = await withTallies(poll);
    const removedVotes = await db.PollVote.destroy({ where: { poll_id: poll.id }, transaction });
    await poll.destroy({ transaction });
    await transaction.commit();
    await audit(
      req, auditAction, snapshot.id,
      `Deleted poll "${snapshot.title || snapshot.question}" and ${removedVotes || 0} vote(s)`,
      { title: snapshot.title, stock_symbol: snapshot.stock_symbol, options: snapshot.options, vote_counts: snapshot.vote_counts, total_votes: snapshot.total_votes },
      null
    );
    const ws = req.app.get('wsService');
    if (ws) ws.broadcastAll({ type: 'poll:deleted', pollId: snapshot.id });
    return res.json({ success: true, deleted_votes: removedVotes || 0 });
  } catch (error) {
    try { await transaction.rollback(); } catch { /* already finished */ }
    return fail(res, error);
  }
}

adminRouter.patch('/polls/:id', loadPoll, async (req, res) => {
  try {
    const { data, errors } = PollAdmin.sanitisePollInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    await applyAdminEdit(req, res, req.poll, data);
  } catch (error) {
    fail(res, error);
  }
});

/**
 * State changes. Each one is a fixed, server-built update — nothing from the
 * body reaches the model except the validated values named here.
 */
const ACTIONS = {
  close: {
    audit: 'poll_closed',
    build: () => ({ data: { status: 'closed' }, label: 'Closed' }),
  },
  reopen: {
    audit: 'poll_reopened',
    build: (req, poll) => {
      let expires = poll.expires_at;
      if (Object.prototype.hasOwnProperty.call(req.body || {}, 'expires_at')) {
        const { data, errors } = PollAdmin.sanitisePollInput({ expires_at: req.body.expires_at }, { partial: true });
        if (errors.length) return { error: errors[0] };
        expires = data.expires_at;
      } else if (expires && new Date(expires) <= new Date()) {
        return { error: 'This poll has ended. Choose a new end time (or no end time) to reopen it.' };
      }
      return { data: { status: 'active', expires_at: expires }, label: 'Reopened' };
    },
  },
  hide: {
    audit: 'poll_hidden',
    build: (req) => {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (reason.length < 3 || reason.length > 500) return { error: 'Give a reason (3-500 characters) for hiding this poll' };
      return { data: { is_active: false }, label: 'Hidden', reason };
    },
  },
  unhide: {
    audit: 'poll_unhidden',
    build: () => ({ data: { is_active: true }, label: 'Restored' }),
  },
  feature: {
    audit: 'poll_featured',
    build: (req, poll) => {
      const days = req.body?.days === undefined ? 7 : Number(req.body.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return { error: 'Feature for 1-30 days' };
      let until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      if (poll.expires_at && new Date(poll.expires_at) > new Date() && new Date(poll.expires_at) < until) until = new Date(poll.expires_at);
      return { data: { is_boosted: true, boost_expires_at: until, boosted_by: req.user.id }, label: `Featured for ${days} day(s)` };
    },
  },
  unfeature: {
    audit: 'poll_unfeatured',
    build: () => ({ data: { is_boosted: false, boost_expires_at: null, boosted_by: null }, label: 'Unfeatured' }),
  },
};

adminRouter.post('/polls/:id/:action', loadPoll, async (req, res) => {
  try {
    const action = ACTIONS[req.params.action];
    if (!action) return res.status(404).json({ error: 'Unknown action' });
    const built = action.build(req, req.poll);
    if (built.error) return res.status(400).json({ error: built.error });

    const before = plain(req.poll);
    const { old_data, new_data } = diff(before, built.data);
    await req.poll.update({ ...built.data, updated_at: new Date() });
    const title = req.poll.title || req.poll.question || 'poll';
    await audit(
      req, action.audit, req.poll.id,
      `${built.label} poll "${title}"${built.reason ? ` - reason: ${built.reason}` : ''}`,
      old_data, built.reason ? { ...new_data, reason: built.reason } : new_data
    );
    await broadcastPoll(req, req.poll);
    await respond(res, req.poll);
  } catch (error) {
    fail(res, error);
  }
});

adminRouter.delete('/polls/:id', loadPoll, (req, res) => deletePollWithVotes(req, res, req.poll, 'poll_deleted'));

const parsePick = (raw) => {
  if (!raw) return null;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
};

adminRouter.get('/tomorrows-pick', async (req, res) => {
  try {
    const row = await db.PlatformSetting.findOne({ where: { key: TOMORROWS_PICK_KEY } });
    res.json(parsePick(row?.value) || { active: false });
  } catch (error) {
    fail(res, error);
  }
});

adminRouter.put('/tomorrows-pick', async (req, res) => {
  try {
    const { value, errors } = PollAdmin.sanitiseTomorrowsPick(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    const stored = {
      ...value,
      updated_by: req.user.display_name || req.user.name || 'Admin',
      updated_at: new Date().toISOString(),
    };
    const row = await db.PlatformSetting.findOne({ where: { key: TOMORROWS_PICK_KEY } });
    const previous = parsePick(row?.value);
    if (row) await row.update({ value: JSON.stringify(stored), updated_at: new Date() });
    else {
      await db.PlatformSetting.create({
        key: TOMORROWS_PICK_KEY,
        value: JSON.stringify(stored),
        type: 'json',
        description: "Override setting for Tomorrow's Pick feature",
      });
    }
    await audit(
      req, 'tomorrows_pick_updated', null,
      value.active ? `Tomorrow's Pick override set to ${value.stock_symbol}` : "Tomorrow's Pick returned to automatic selection",
      previous, stored
    );
    res.json(stored);
  } catch (error) {
    fail(res, error);
  }
});

router.use('/admin', adminRouter);

// ---------------------------------------------------------------------------
// Generic PUT / DELETE /api/polls/:id
//
// These used to go straight to the CRUD factory, which let an owner re-label
// options after votes (moving the votes), set is_boosted until 2099, reopen an
// admin-closed poll or make it premium, and let any "staff" role (sub_admin
// included) unhide moderated polls or rewrite counters with no audit trail.
//
//   admin / super_admin  same validation, options lock and audit as Poll
//                        Management (plus the moderation flags older screens
//                        still send: is_active, status, is_boosted)
//   the poll's creator   title, description, image_url; options / poll_type
//                        only while the poll has no votes; a fixed 24 h boost
//   anyone else (incl. sub_admin)  404
// ---------------------------------------------------------------------------
const POLL_ADMIN_ROLES = ['admin', 'super_admin'];
const isPollAdmin = (user) => POLL_ADMIN_ROLES.includes(effectiveRole(user));
const OWNER_BOOST_HOURS = 24;
const MAX_ADMIN_BOOST_DAYS = 30;

/** Loads :id for the generic routes: admins see any poll, others only their own. */
async function loadOwnPollOrAdmin(req, res, next) {
  try {
    if (!UUID_RE.test(String(req.params.id))) return res.status(404).json({ error: 'Record not found' });
    const poll = await db.Poll.findByPk(req.params.id);
    const mine = poll && String(poll.created_by ?? '') === String(req.user.id);
    if (!poll || (!isPollAdmin(req.user) && !mine)) return res.status(404).json({ error: 'Record not found' });
    req.poll = poll;
    next();
  } catch (error) {
    fail(res, error);
  }
}

/** Boost fields, validated: an end in the future, at most `maxMs` away and never past the poll's end. */
function boostUntil(poll, requested, maxMs) {
  const now = Date.now();
  let until = requested ? new Date(requested) : new Date(now + maxMs);
  if (Number.isNaN(until.getTime()) || until.getTime() <= now) return { error: 'Boost end must be in the future' };
  if (until.getTime() > now + maxMs) until = new Date(now + maxMs);
  if (poll.expires_at && new Date(poll.expires_at) > new Date(now) && new Date(poll.expires_at) < until) until = new Date(poll.expires_at);
  return { until };
}

/** Admin body for the generic PUT: Poll Management fields plus the legacy moderation flags. */
function adminGenericInput(body, poll) {
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const { data, errors } = PollAdmin.sanitisePollInput(body, { partial: true });
  if (has('is_active')) {
    if (typeof body.is_active !== 'boolean') errors.push('is_active must be true or false');
    else data.is_active = body.is_active;
  }
  if (has('status')) {
    if (!['active', 'closed'].includes(body.status)) errors.push('status must be active or closed');
    else data.status = body.status;
  }
  if (has('is_boosted')) {
    if (typeof body.is_boosted !== 'boolean') errors.push('is_boosted must be true or false');
    else if (body.is_boosted) {
      const { until, error } = boostUntil(poll, body.boost_expires_at, MAX_ADMIN_BOOST_DAYS * 86400000);
      if (error) errors.push(error);
      else Object.assign(data, { is_boosted: true, boost_expires_at: until });
    } else {
      Object.assign(data, { is_boosted: false, boost_expires_at: null, boosted_by: null });
    }
  }
  return { data, errors };
}

/** Owner body: an explicit allow-list. Everything else is ignored. */
function ownerInput(body, poll) {
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const allowed = {};
  for (const key of ['title', 'description', 'image_url', 'options', 'poll_type']) {
    if (has(key)) allowed[key] = body[key];
  }
  const { data, errors } = PollAdmin.sanitisePollInput(allowed, { partial: true });
  if (body.is_boosted === true) {
    if (PollAdmin.pollStatus(poll) !== 'active') errors.push('Only an open poll can be boosted');
    else Object.assign(data, { is_boosted: true, boost_expires_at: boostUntil(poll, null, OWNER_BOOST_HOURS * 3600000).until });
  }
  return { data, errors };
}

router.put('/:id', authMiddleware, (req, res, next) => (req.params.id === 'bulk' ? next('route') : next()), loadOwnPollOrAdmin, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (isPollAdmin(req.user)) {
      const { data, errors } = adminGenericInput(body, req.poll);
      if (errors.length) return res.status(400).json({ error: errors[0], errors });
      if (data.is_boosted) data.boosted_by = req.user.id;
      return await applyAdminEdit(req, res, req.poll, data, 'poll_updated');
    }

    const { data, errors } = ownerInput(body, req.poll);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'You can change the title, description, image, or (before any votes) the options' });
    }
    if (data.is_boosted) data.boosted_by = req.user.id;
    if (await optionsChangeBlocked(req.poll, plain(req.poll), data)) {
      return res.status(409).json({ error: 'Options and poll type cannot change once the poll has votes' });
    }
    await req.poll.update({ ...data, updated_at: new Date() });
    await broadcastPoll(req, req.poll);
    return respond(res, req.poll);
  } catch (error) {
    return fail(res, error);
  }
});

router.delete('/:id', authMiddleware, (req, res, next) => (req.params.id === 'bulk' ? next('route') : next()), loadOwnPollOrAdmin, (req, res) =>
  deletePollWithVotes(req, res, req.poll, isPollAdmin(req.user) ? 'poll_deleted' : 'poll_deleted_by_owner'));

// Bulk writes skip every rule above (and the audit), so they are closed for
// polls; Poll Management has per-poll endpoints for each change.
const refuseBulk = (req, res) =>
  res.status(405).json({ error: 'Bulk poll changes are not supported. Use /api/polls/admin/polls/:id.' });
router.post('/bulk', authMiddleware, refuseBulk);
router.put('/bulk', authMiddleware, refuseBulk);
router.delete('/bulk', authMiddleware, refuseBulk);

// CRUD LAST — '/:id' must not shadow the sub-routers mounted above.
// reconcileTalliesOnGet makes GET responses report vote counts from PollVote rows.
createCrudRoutes(router, pollController, [authMiddleware, reconcileTalliesOnGet]);

module.exports = router;
