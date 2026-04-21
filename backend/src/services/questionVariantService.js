// Question Variant Generator — Phase 4 weekly cron
// Uses Claude API to generate new test question variants
// Ensures fresh test content so students can't memorise answers

const { query } = require('../config/database');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You generate new test questions for an English literacy and numeracy platform for Indian students aged 6-14. 
NCERT curriculum level. Culturally appropriate (Indian names, places, food, festivals). 
Suitable for students with learning disabilities — clear, simple language.

For each variant return:
- question_text
- options: array of 4 strings for MCQ, null for others
- correct_answer  
- explanation: "1 sentence - You wrote X. The correct answer is Y because Z"

CRITICAL: Never repeat the seed question. All variants must be meaningfully different.
Respond ONLY with a valid JSON array. No markdown, no preamble.`;

// Generate variants for a seed question using Claude
const generateVariantsForQuestion = async (seedQuestion, count = 3) => {
  const userMessage = JSON.stringify({
    seed_question: seedQuestion.question_text,
    question_type: seedQuestion.question_type,
    test_level: seedQuestion.level,
    subject: seedQuestion.subject,
    correct_answer: seedQuestion.correct_answer,
    count,
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0].text.trim();
  // Strip potential markdown code fences
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned);
};

// Main job: pick representative seed questions per level + generate variants
const generateQuestionVariants = async () => {
  // For each level, pick 2 questions (1 english, 1 math) to generate variants for
  for (let level = 1; level <= 5; level++) {
    for (const subject of ['english', 'math']) {
      try {
        const seedResult = await query(
          `SELECT id, level, subject, question_text, question_type, correct_answer
           FROM test_questions
           WHERE level = $1 AND subject = $2 AND is_active = true
           ORDER BY RANDOM() LIMIT 1`,
          [level, subject]
        );

        if (!seedResult.rows.length) continue;
        const seed = seedResult.rows[0];

        const variants = await generateVariantsForQuestion(seed, 3);

        for (const v of variants) {
          const variantId = `tq_l${level}_${subject[0]}_v${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await query(
            `INSERT INTO test_questions
               (id, level, subject, category, question_text, question_type,
                options_json, correct_answer, explanation, difficulty, is_active, created_at)
             VALUES ($1, $2, $3, 'ai_generated', $4, $5, $6, $7, $8, 1, true, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              variantId, level, subject,
              v.question_text, seed.question_type,
              v.options ? JSON.stringify(v.options) : null,
              v.correct_answer, v.explanation,
            ]
          );
        }
        console.log(`[VARIANTS] Generated ${variants.length} variants for Level ${level} ${subject}`);

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.error(`[VARIANTS] Failed for Level ${level} ${subject}:`, err.message);
      }
    }
  }
};

module.exports = { generateQuestionVariants, generateVariantsForQuestion };
