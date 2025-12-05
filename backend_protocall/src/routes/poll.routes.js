const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Polls CRUD
const pollController = createCrudController(db.Poll, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get active polls
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const polls = await db.Poll.findAll({
      where: {
        status: 'active',
        [db.Sequelize.Op.or]: [
          { expires_at: null },
          { expires_at: { [db.Sequelize.Op.gt]: now } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, pollController);

// Poll Votes sub-routes
const voteRouter = express.Router();
const voteController = createCrudController(db.PollVote, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Cast vote
voteRouter.post('/cast', authMiddleware, async (req, res) => {
  try {
    const { poll_id, option_index } = req.body;
    
    // Check if already voted
    const existing = await db.PollVote.findOne({
      where: { poll_id, user_id: req.user.id }
    });
    
    if (existing) {
      // Update vote
      await existing.update({ option_index });
      return res.json(existing);
    }
    
    // Create new vote
    const vote = await db.PollVote.create({
      poll_id,
      user_id: req.user.id,
      option_index,
      created_at: new Date()
    });
    
    // Update poll vote counts
    const poll = await db.Poll.findByPk(poll_id);
    const votes = poll.votes || {};
    votes[option_index] = (votes[option_index] || 0) + 1;
    await poll.update({ votes, total_votes: (poll.total_votes || 0) + 1 });
    
    res.status(201).json(vote);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

createCrudRoutes(voteRouter, voteController);
router.use('/votes', voteRouter);

module.exports = router;