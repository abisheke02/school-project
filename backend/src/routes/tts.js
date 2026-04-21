// TTS Route — Phase 3
// POST /api/tts/speak   → returns base64 MP3
// POST /api/tts/highlight → returns base64 MP3 + word list for highlighting

const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const { synthesizeSpeech, synthesizeWithHighlights } = require('../services/ttsService');

const router = express.Router();

const speakSchema = Joi.object({
  text: Joi.string().max(500).required(),
  slow: Joi.boolean().default(false),
  language: Joi.string().default('en-IN'),
});

router.post('/speak', requireAuth, async (req, res) => {
  const { error, value } = speakSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await synthesizeSpeech(value.text, { slow: value.slow, language: value.language });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/highlight', requireAuth, async (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ error: 'sentence required' });
  try {
    const result = await synthesizeWithHighlights(sentence);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
