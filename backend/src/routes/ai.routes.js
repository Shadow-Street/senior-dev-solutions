const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI Chat endpoint
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { messages, model = 'gemini-pro' } = req.body;

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'Please configure GEMINI_API_KEY'
      });
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

    const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
