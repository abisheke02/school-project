// Google Cloud Speech-to-Text Service
// Used for dictation / writing exercises — student speaks, we transcribe

const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();

/**
 * Transcribe a base64-encoded audio buffer from the mobile app
 * @param {string} audioBase64 - Base64 audio (LINEAR16 or WEBM_OPUS)
 * @param {{ encoding?: string, sampleRateHertz?: number, language?: string }} options
 * @returns {{ transcript: string, confidence: number }}
 */
const transcribeAudio = async (audioBase64, options = {}) => {
  const {
    encoding = 'LINEAR16',
    sampleRateHertz = 16000,
    language = 'en-IN',
  } = options;

  const request = {
    audio: { content: audioBase64 },
    config: {
      encoding,
      sampleRateHertz,
      languageCode: language,
      // Alternatives improve matching for children with unclear pronunciation
      maxAlternatives: 3,
      enableWordTimeOffsets: false,
      model: 'command_and_search', // better for short phrases / single words
      useEnhanced: true,
      speechContexts: [
        {
          // Boost common phonics/LD exercise words
          phrases: [
            'cat', 'dog', 'bat', 'rat', 'hat', 'mat', 'sat',
            'ship', 'shop', 'chip', 'chop', 'thin', 'then',
            'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
          ],
          boost: 15,
        },
      ],
    },
  };

  const [response] = await client.recognize(request);

  if (!response.results || !response.results.length) {
    return { transcript: '', confidence: 0 };
  }

  const best = response.results[0].alternatives[0];
  return {
    transcript: (best.transcript || '').trim().toLowerCase(),
    confidence: best.confidence || 0,
    alternatives: response.results[0].alternatives.slice(1).map((a) => a.transcript),
  };
};

/**
 * Score a dictation attempt
 * Normalises both strings, computes word-level accuracy
 * @param {string} transcript - what the student said
 * @param {string} expected   - correct sentence
 * @returns {{ score: number, wordMatches: boolean[], correctWords: number }}
 */
const scoreDictation = (transcript, expected) => {
  const normalise = (s) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);

  const spokenWords = normalise(transcript);
  const expectedWords = normalise(expected);

  const wordMatches = expectedWords.map((word, i) => spokenWords[i] === word);
  const correctWords = wordMatches.filter(Boolean).length;
  const score = expectedWords.length
    ? Math.round((correctWords / expectedWords.length) * 100)
    : 0;

  return { score, wordMatches, correctWords, totalWords: expectedWords.length };
};

module.exports = { transcribeAudio, scoreDictation };
