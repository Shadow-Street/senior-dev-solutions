const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * The model is chosen server-side, never by the caller.
 *
 * "gemini-pro" was hardcoded here and has since been retired: v1beta answers
 * models/gemini-pro with 404, so every /ask in chat failed. Pinning the name in
 * one env-backed constant means the next rename is a config change rather than
 * another silent outage.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// AI Chat endpoint
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'Please configure GEMINI_API_KEY'
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    if (messages.some((m) => !m || typeof m.content !== 'string' || !m.content.trim())) {
      return res.status(400).json({ error: 'each message needs a non-empty string content' });
    }

    // Convert messages to Gemini format (simple concatenation for now or history)
    // Gemini 1.0 Pro expects { role: 'user' | 'model', parts: [{ text: '' }] }
    // Assuming 'messages' is an array of { role, content }

    const chatHistory = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // Get the last message as prompt, and use previous as history
    const lastMessage = chatHistory.pop();
    const prompt = lastMessage.parts[0].text;

    const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const chat = geminiModel.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      content: text,
      usage: { total_tokens: 0 } // Gemini doesn't always return usage in same format
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(502).json({ error: 'AI service request failed' });
  }
});

module.exports = router;
