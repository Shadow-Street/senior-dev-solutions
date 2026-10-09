const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ChatBots CRUD
const chatbotController = createCrudController(db.ChatBot, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get active bots
router.get('/active', async (req, res) => {
  try {
    const bots = await db.ChatBot.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']]
    });
    res.json(bots);
  } catch (error) {
    console.error('[chatbot.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bot by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const bot = await db.ChatBot.findOne({
      where: { type, status: 'active' }
    });
    res.json(bot);
  } catch (error) {
    console.error('[chatbot.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Bot Conversations sub-routes
const conversationRouter = express.Router();
const conversationController = createCrudController(db.BotConversation, {
  ownership: 'user_id',
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's conversations
conversationRouter.get('/my-conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await db.BotConversation.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json(conversations);
  } catch (error) {
    console.error('[chatbot.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to bot
conversationRouter.post('/send', authMiddleware, async (req, res) => {
  try {
    const { bot_id, message } = req.body;
    
    // Save user message
    const userMessage = await db.BotConversation.create({
      user_id: req.user.id,
      bot_id,
      role: 'user',
      message,
      created_at: new Date()
    });
    
    // Generate bot response (placeholder - integrate with AI service)
    const botResponse = await db.BotConversation.create({
      user_id: req.user.id,
      bot_id,
      role: 'assistant',
      message: 'I received your message. AI integration pending.',
      created_at: new Date()
    });
    
    res.status(201).json({ userMessage, botResponse });
  } catch (error) {
    console.error('[chatbot.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

createCrudRoutes(conversationRouter, conversationController, [authMiddleware]);
router.use('/conversations', conversationRouter);


// CRUD LAST — the generated '/:id' route must not shadow the sub-routers
// mounted above. Registered earlier, '/clients', '/participants' and the
// like were matched as an id and answered 404 'Record not found'.
createCrudRoutes(router, chatbotController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });

module.exports = router;
