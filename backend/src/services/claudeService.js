const Anthropic = require('@anthropic-ai/sdk');

// Initialize with prompt caching enabled for system prompts
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

// ─────────────────────────────────────────────────────────────────
// LD TYPE CLASSIFICATION
// Called after student completes 10-minute screening quiz
// ─────────────────────────────────────────────────────────────────
const classifyLDType = async (quizAnswers, studentAge) => {
  const systemPrompt = `You are an expert educational psychologist specialising in learning disabilities in Indian children aged 6-14. You analyse quiz responses from a screening assessment.

Given a JSON array of quiz answers (each with: question_id, category, ld_target, correct_answer, student_answer, is_correct, response_time_ms, difficulty), analyse the error patterns and classify the student's learning profile.

Return ONLY a valid JSON object with this exact structure:
{
  "ld_type": "dyslexia" | "dysgraphia" | "dyscalculia" | "mixed" | "not_detected",
  "risk_scores": {
    "dyslexia": 0-100,
    "dysgraphia": 0-100,
    "dyscalculia": 0-100
  },
  "overall_risk_score": 0-100,
  "confidence": 0-100,
  "primary_patterns": ["pattern1", "pattern2"],
  "reasoning": "2-3 sentence plain English explanation appropriate for sharing with teachers"
}

Scoring rules:
- Weight errors in letter_recognition and rhyme_detection and phoneme_blending towards dyslexia
- Weight errors in number_sense towards dyscalculia
- Factor in response_time_ms — slow responses on easy questions (difficulty 1) indicate higher risk
- "mixed" if both dyslexia score > 60 AND dyscalculia score > 60
- "not_detected" if all scores < 35
- overall_risk_score = highest of the three scores

Respond ONLY with valid JSON. No preamble, no markdown, no explanation outside the JSON.`;

  const userMessage = `Student age: ${studentAge}
Quiz answers: ${JSON.stringify(quizAnswers, null, 2)}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }, // Cache system prompt — saves tokens on repeated calls
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0].text.trim();
  return JSON.parse(raw);
};

// ─────────────────────────────────────────────────────────────────
// ERROR PATTERN DETECTION (nightly batch job — Phase 3)
// ─────────────────────────────────────────────────────────────────
const detectErrorPatterns = async (errorLogs) => {
  const systemPrompt = `You are an expert educational psychologist specialising in learning disabilities in Indian children aged 6-14. You analyse error logs from an English literacy and numeracy practice app.

Given a JSON array of student errors (each with: question_text, student_answer, correct_answer, error_type, frequency, response_time_ms), identify the top 3 error patterns.

For each pattern return:
- pattern_name: short label (e.g. "b/d reversal", "vowel confusion", "sequencing error")
- frequency: count of occurrences
- confidence: 0-100
- ld_indicator: "dyslexia" | "dysgraphia" | "dyscalculia" | "none"
- teacher_intervention: one specific actionable classroom strategy (max 2 sentences, plain English, Indian classroom context)
- student_tip: one encouraging tip for the student (max 1 sentence, simple English, age-appropriate)

Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation outside the JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: JSON.stringify(errorLogs) }],
  });

  return JSON.parse(response.content[0].text.trim());
};

// ─────────────────────────────────────────────────────────────────
// STUDENT DAILY RECOMMENDATIONS (Phase 4)
// ─────────────────────────────────────────────────────────────────
const generateStudentRecommendations = async ({ studentName, ldType, currentLevel, topErrorPatterns, last7DaysScoreAvg, last7DaysExercisesDone }) => {
  const systemPrompt = `You are a personalised learning coach for Indian students with learning disabilities. Your tone is warm, encouraging, and very simple.

Given student data, return exactly 3 exercise recommendations. Each must have:
- exercise_type: one of [phonics, reading, writing, math, listening]
- title: short name of the exercise (e.g. "Tap the Syllables")
- why: one sentence explaining why this helps them today (use their name, reference their specific pattern)
- priority: 1, 2, or 3 (1 = most important today)

Respond ONLY with a valid JSON array. No preamble, no markdown fences.`;

  const userMessage = JSON.stringify({ studentName, ldType, currentLevel, topErrorPatterns, last7DaysScoreAvg, last7DaysExercisesDone });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  return JSON.parse(response.content[0].text.trim());
};

// ─────────────────────────────────────────────────────────────────
// WRONG ANSWER FEEDBACK (real-time, per question — Phase 4)
// ─────────────────────────────────────────────────────────────────
const generateWrongAnswerFeedback = async ({ questionText, studentAnswer, correctAnswer, questionType, studentAge, ldType }) => {
  const systemPrompt = `You explain wrong answers to Indian children with learning disabilities in the simplest, warmest possible English. Never shame or blame. Always explain visually when possible.

Return a JSON object with:
- feedback_text: 2-3 sentences max. Start with a small encouragement. Explain the correct answer clearly. Use "remember b faces right, d faces left" style memory hooks where possible.
- memory_hook: one short phrase they can remember (or null if not applicable)

Max reading level: Grade 3 English. Respond ONLY with valid JSON object.`;

  const userMessage = JSON.stringify({ questionText, studentAnswer, correctAnswer, questionType, studentAge, ldType });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  return JSON.parse(response.content[0].text.trim());
};

module.exports = {
  classifyLDType,
  detectErrorPatterns,
  generateStudentRecommendations,
  generateWrongAnswerFeedback,
};
