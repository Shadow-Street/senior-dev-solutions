const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");

// AI Chat endpoint
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 2000 } = req.body;
    
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: 'AI service not configured',
        message: 'Please configure OPENAI_API_KEY in environment variables'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'AI API error');
    }

    const data = await response.json();
    res.json({
      content: data.choices[0]?.message?.content,
      usage: data.usage
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Invoke (legacy support)
router.post('/invoke', authMiddleware, async (req, res) => {
  try {
    const { prompt, system_prompt, model = 'gpt-4' } = req.body;
    
    const messages = [];
    if (system_prompt) {
      messages.push({ role: 'system', content: system_prompt });
    }
    messages.push({ role: 'user', content: prompt });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    res.json({
      response: data.choices[0]?.message?.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Image
router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, size = '1024x1024', n = 1 } = req.body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ prompt, size, n })
    });

    if (!response.ok) {
      throw new Error('Image generation API error');
    }

    const data = await response.json();
    res.json({
      images: data.data.map(img => img.url)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
