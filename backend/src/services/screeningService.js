const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { classifyRuleBased, mergeClassifications } = require('./ldClassifier');
const { classifyLDType } = require('./claudeService');

// Fetch age-appropriate screening questions for a student
const getScreeningQuestions = async (age = 10) => {
  const result = await query(
    `SELECT id, category, ld_target, question_text, question_type,
            options_json, audio_prompt, difficulty
     FROM screening_questions
     WHERE is_active = TRUE
       AND age_min <= $1
       AND age_max >= $1
     ORDER BY category, difficulty ASC`,
    [age]
  );

  // Return max 15 questions: ~5 per category, balanced
  const questions = result.rows;
  const categorised = {};
  for (const q of questions) {
    if (!categorised[q.category]) categorised[q.category] = [];
    categorised[q.category].push(q);
  }

  // Pick up to 4 per category, shuffle within each
  const selected = [];
  for (const cat of Object.values(categorised)) {
    const shuffled = cat.sort(() => Math.random() - 0.5).slice(0, 4);
    selected.push(...shuffled);
  }

  // Shuffle final list so categories are interleaved
  return selected.sort(() => Math.random() - 0.5);
};

// Process completed quiz — classify and store result
const submitScreening = async (studentId, answers, durationSeconds, studentAge) => {
  // answers: [{ question_id, category, ld_target, difficulty, correct_answer,
  //             student_answer, is_correct, response_time_ms }]

  // Step 1: Rule-based classification (fast, no API call)
  const ruleBased = classifyRuleBased(answers);

  // Step 2: Claude API classification (AI-powered, more accurate)
  let claudeResult = null;
  let finalResult;
  try {
    claudeResult = await classifyLDType(answers, studentAge);
    finalResult = mergeClassifications(ruleBased, claudeResult);
  } catch (err) {
    console.error('Claude classification failed, using rule-based only:', err.message);
    // Fallback to rule-based if Claude API is unavailable
    finalResult = {
      ldType: ruleBased.ruleBasedLdType,
      riskScores: ruleBased.ruleBasedRiskScores,
      overallRiskScore: ruleBased.overallRisk,
      confidence: 60,
      primaryPatterns: [],
      reasoning: 'Classified using rule-based analysis.',
      source: 'rule_based_fallback',
    };
  }

  // Step 3: Store screening session
  const sessionId = uuidv4();
  await query(
    `INSERT INTO screening_sessions
       (id, student_id, date, answers_json, ld_type_result, risk_score, duration_seconds)
     VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)`,
    [
      sessionId,
      studentId,
      JSON.stringify({ answers, ruleBased, claudeResult }),
      finalResult.ldType,
      finalResult.overallRiskScore,
      durationSeconds,
    ]
  );

  // Step 4: Update student profile with LD type and risk score
  const nextScreeningDate = new Date();
  nextScreeningDate.setDate(nextScreeningDate.getDate() + 90); // re-screen in 90 days

  await query(
    `UPDATE students
     SET ld_type = $1,
         ld_risk_score = $2,
         last_screened_at = NOW(),
         next_screening_at = $3
     WHERE user_id = $4`,
    [finalResult.ldType, finalResult.overallRiskScore, nextScreeningDate.toISOString(), studentId]
  );

  return { sessionId, ...finalResult };
};

// Fetch students due for re-screening (90-day cycle)
const getStudentsDueForRescreening = async () => {
  const result = await query(
    `SELECT u.id, u.name, u.phone, s.age, s.next_screening_at
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.next_screening_at <= NOW()
       OR s.last_screened_at IS NULL
     ORDER BY s.next_screening_at ASC NULLS FIRST
     LIMIT 100`
  );
  return result.rows;
};

module.exports = { getScreeningQuestions, submitScreening, getStudentsDueForRescreening };
