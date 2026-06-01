const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/synthesize', requireAuth, async (req, res, next) => {
  try {
    const { text, language = 'en-IN', voice = 'NEUTRAL' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    if (text.length > 500) return res.status(400).json({ error: 'text must be under 500 characters' });
    const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
    const client = new TextToSpeechClient();
    const [response] = await client.synthesizeSpeech({ input: { text }, voice: { languageCode: language, ssmlGender: voice }, audioConfig: { audioEncoding: 'MP3' } });
    const audioBase64 = response.audioContent.toString('base64');
    res.json({ audioBase64, format: 'mp3' });
  } catch (err) {
    if (err.code === 7 || err.message?.includes('credentials')) return res.status(503).json({ error: 'TTS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env' });
    next(err);
  }
});

module.exports = router;
