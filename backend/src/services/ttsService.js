// Google Cloud Text-to-Speech Service
// Used for reading exercise prompts aloud (Indian English accent)

const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');

const client = new textToSpeech.TextToSpeechClient();

// Indian English voice — en-IN-Wavenet-D (male) or en-IN-Wavenet-A (female)
const DEFAULT_VOICE = {
  languageCode: 'en-IN',
  name: 'en-IN-Wavenet-D',
  ssmlGender: 'MALE',
};

const SLOW_VOICE = {
  languageCode: 'en-IN',
  name: 'en-IN-Wavenet-A',
  ssmlGender: 'FEMALE',
};

/**
 * Synthesize speech and return base64-encoded audio (MP3)
 * @param {string} text - Plain text or SSML to speak
 * @param {{ slow?: boolean, language?: string }} options
 * @returns {{ audioContent: string, durationMs: number }}
 */
const synthesizeSpeech = async (text, options = {}) => {
  const { slow = false, language = 'en-IN' } = options;

  const voice = slow ? SLOW_VOICE : DEFAULT_VOICE;
  if (language !== 'en-IN') {
    voice.languageCode = language;
    voice.name = `${language}-Wavenet-A`;
  }

  // For child-friendly rate: 0.85 (slightly slower than normal)
  const ssml = text.startsWith('<speak>') ? text : `<speak>${text}</speak>`;

  const request = {
    input: { ssml },
    voice,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: slow ? 0.75 : 0.9,
      pitch: 1.0,
      effectsProfileId: ['headphone-class-device'],
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  const audioBase64 = response.audioContent.toString('base64');

  // Estimate duration: MP3 at 32kbps, rough estimate
  const durationMs = Math.round((response.audioContent.length / 4000) * 1000);

  return { audioContent: audioBase64, durationMs };
};

/**
 * Generate word-level timing SSML for highlighted reading
 * Wraps each word in a <mark> tag so client can highlight word-by-word
 * @param {string} sentence
 * @returns {{ ssml: string, words: string[] }}
 */
const buildHighlightedSSML = (sentence) => {
  const words = sentence.trim().split(/\s+/);
  const ssmlParts = words.map((word, i) => `<mark name="w${i}"/>${word}`);
  const ssml = `<speak>${ssmlParts.join(' ')}</speak>`;
  return { ssml, words };
};

/**
 * Synthesize a sentence with word-level marks for highlighting
 * @param {string} sentence
 * @returns {{ audioContent: string, words: string[], durationMs: number }}
 */
const synthesizeWithHighlights = async (sentence) => {
  const { ssml, words } = buildHighlightedSSML(sentence);
  const { audioContent, durationMs } = await synthesizeSpeech(ssml, { slow: true });
  return { audioContent, words, durationMs };
};

/**
 * Phoneme-by-phoneme pronunciation for phonics exercises
 * E.g. "cat" → "/k/ /æ/ /t/"
 * @param {string} word
 * @returns {{ audioContent: string }}
 */
const synthesizePhonemes = async (word) => {
  const ssml = `<speak>
    <prosody rate="x-slow">
      ${word.split('').join('<break time="200ms"/>')}
    </prosody>
    <break time="500ms"/>
    <prosody rate="slow">${word}</prosody>
  </speak>`;
  return synthesizeSpeech(ssml, { slow: true });
};

module.exports = {
  synthesizeSpeech,
  synthesizeWithHighlights,
  synthesizePhonemes,
  buildHighlightedSSML,
};
