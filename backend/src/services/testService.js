// Test Service — Phase 4
// 5-level progressive test system
// 70% pass threshold → unlock next level
// Claude gives feedback on wrong answers in real time

const { query } = require('../config/database');
const { generateWrongAnswerFeedback } = require('./claudeService');

const PASS_THRESHOLD = 70;
const QUESTIONS_PER_TEST = 20;
const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000002';

// ─── Mock questions for demo student ─────────────────────────────────────────
const MOCK_QUESTIONS_BY_LEVEL = {
  1: [
    { id: 'q1_01', question_text: 'Which letter comes after "D" in the alphabet?', question_type: 'mcq', options: ['C','E','F','B'], correct_answer: 'E', explanation: 'The alphabet goes …C, D, E, F… so E comes after D.' },
    { id: 'q1_02', question_text: 'Which word rhymes with "CAT"?', question_type: 'mcq', options: ['Dog','Bat','Run','Sun'], correct_answer: 'Bat', explanation: 'Cat and Bat both end with the "-at" sound.' },
    { id: 'q1_03', question_text: 'How many letters are in the word "MANGO"?', question_type: 'mcq', options: ['4','5','6','3'], correct_answer: '5', explanation: 'M-A-N-G-O = 5 letters.' },
    { id: 'q1_04', question_text: 'What number comes after 9?', question_type: 'mcq', options: ['8','11','10','7'], correct_answer: '10', explanation: '9 + 1 = 10.' },
    { id: 'q1_05', question_text: 'Which word starts with the same sound as "BALL"?', question_type: 'mcq', options: ['Cat','Dog','Bat','Fan'], correct_answer: 'Bat', explanation: 'Ball and Bat both start with the /b/ sound.' },
    { id: 'q1_06', question_text: 'Tap the number of syllables in "EL-E-PHANT"', question_type: 'mcq', options: ['1','2','3','4'], correct_answer: '3', explanation: 'El-e-phant has 3 syllables.' },
    { id: 'q1_07', question_text: 'Which letter makes the /s/ sound?', question_type: 'mcq', options: ['B','S','T','P'], correct_answer: 'S', explanation: 'The letter S makes the /s/ sound as in Sun.' },
    { id: 'q1_08', question_text: 'What is 3 + 4?', question_type: 'mcq', options: ['5','6','7','8'], correct_answer: '7', explanation: '3 + 4 = 7.' },
    { id: 'q1_09', question_text: 'Which picture word starts with "M"? (Moon / Sun / Star / Rain)', question_type: 'mcq', options: ['Sun','Moon','Star','Rain'], correct_answer: 'Moon', explanation: 'Moon starts with the letter M.' },
    { id: 'q1_10', question_text: 'How many sides does a triangle have?', question_type: 'mcq', options: ['2','3','4','5'], correct_answer: '3', explanation: 'A triangle has 3 sides.' },
    { id: 'q1_11', question_text: 'Which word is spelled correctly?', question_type: 'mcq', options: ['Fren','Frend','Friend','Freind'], correct_answer: 'Friend', explanation: 'The correct spelling is F-R-I-E-N-D.' },
    { id: 'q1_12', question_text: 'Count the apples: 🍎🍎🍎🍎🍎. How many?', question_type: 'mcq', options: ['3','4','5','6'], correct_answer: '5', explanation: 'There are 5 apple emojis.' },
    { id: 'q1_13', question_text: 'Which word rhymes with "DOG"?', question_type: 'mcq', options: ['Cat','Log','Run','Hat'], correct_answer: 'Log', explanation: 'Dog and Log both end in the "-og" sound.' },
    { id: 'q1_14', question_text: 'What comes before 15?', question_type: 'mcq', options: ['13','16','14','12'], correct_answer: '14', explanation: '14 comes just before 15.' },
    { id: 'q1_15', question_text: 'Which letter is a vowel?', question_type: 'mcq', options: ['B','C','A','D'], correct_answer: 'A', explanation: 'A, E, I, O, U are vowels. A is a vowel.' },
    { id: 'q1_16', question_text: 'What sound does "SH" make? (as in SHIP)', question_type: 'mcq', options: ['/s/+/h/','shhhh','sch','/k/'], correct_answer: 'shhhh', explanation: 'SH together makes the "shhhh" sound, like in Ship or Shell.' },
    { id: 'q1_17', question_text: 'Which is bigger: 7 or 12?', question_type: 'mcq', options: ['7','12','Same','Cannot say'], correct_answer: '12', explanation: '12 is greater than 7.' },
    { id: 'q1_18', question_text: 'Fill the blank: The ___ is in the sky. (Sun / Fish / Chair / Book)', question_type: 'mcq', options: ['Fish','Chair','Sun','Book'], correct_answer: 'Sun', explanation: 'The Sun is in the sky — this makes the most sense.' },
    { id: 'q1_19', question_text: 'How many tens are in 30?', question_type: 'mcq', options: ['1','2','3','4'], correct_answer: '3', explanation: '30 = 3 tens.' },
    { id: 'q1_20', question_text: 'What is the first letter of "INDIA"?', question_type: 'mcq', options: ['N','D','I','A'], correct_answer: 'I', explanation: 'INDIA starts with the letter I.' },
  ],
  2: [
    { id: 'q2_01', question_text: 'Which word is the opposite of "FAST"?', question_type: 'mcq', options: ['Quick','Slow','Hard','Bright'], correct_answer: 'Slow', explanation: 'Fast and Slow are opposites.' },
    { id: 'q2_02', question_text: 'What is 15 − 8?', question_type: 'mcq', options: ['5','6','7','8'], correct_answer: '7', explanation: '15 − 8 = 7.' },
    { id: 'q2_03', question_text: 'How many syllables in "BUT-TER-FLY"?', question_type: 'mcq', options: ['2','3','4','1'], correct_answer: '3', explanation: 'But-ter-fly = 3 syllables.' },
    { id: 'q2_04', question_text: 'Riya has 6 mangoes. She gives 2 to Arjun. How many does she have?', question_type: 'mcq', options: ['3','4','5','6'], correct_answer: '4', explanation: '6 − 2 = 4 mangoes remain.' },
    { id: 'q2_05', question_text: 'Which sentence is correct?', question_type: 'mcq', options: ['She go to school.','She goes to school.','She going school.','She goed school.'], correct_answer: 'She goes to school.', explanation: 'We use "goes" (not "go") with She/He/It.' },
    { id: 'q2_06', question_text: 'What is the place value of 5 in 52?', question_type: 'mcq', options: ['5','50','500','0.5'], correct_answer: '50', explanation: '5 is in the tens place, so its value is 50.' },
    { id: 'q2_07', question_text: 'Which blend starts "FROG"?', question_type: 'mcq', options: ['FR','FO','RO','FRO'], correct_answer: 'FR', explanation: 'Frog begins with the consonant blend FR.' },
    { id: 'q2_08', question_text: 'What is 4 × 3?', question_type: 'mcq', options: ['7','10','12','14'], correct_answer: '12', explanation: '4 × 3 = 12.' },
    { id: 'q2_09', question_text: 'Priya read 10 pages on Monday and 8 on Tuesday. Total pages?', question_type: 'mcq', options: ['16','17','18','20'], correct_answer: '18', explanation: '10 + 8 = 18 pages.' },
    { id: 'q2_10', question_text: 'Choose the correct plural: "one child, two ___"', question_type: 'mcq', options: ['Childs','Childrens','Children','Childes'], correct_answer: 'Children', explanation: 'Child → Children is an irregular plural.' },
    { id: 'q2_11', question_text: 'Which number is even?', question_type: 'mcq', options: ['7','9','14','11'], correct_answer: '14', explanation: '14 is divisible by 2, so it is even.' },
    { id: 'q2_12', question_text: 'The word "UNHAPPY" means?', question_type: 'mcq', options: ['Very happy','Not happy','Too happy','Always happy'], correct_answer: 'Not happy', explanation: 'The prefix UN- means not, so unhappy = not happy.' },
    { id: 'q2_13', question_text: 'What is half of 20?', question_type: 'mcq', options: ['5','8','10','12'], correct_answer: '10', explanation: '20 ÷ 2 = 10.' },
    { id: 'q2_14', question_text: 'Pick the word with a silent letter: KNIGHT / BRIGHT / FLIGHT / ALL', question_type: 'mcq', options: ['Bright','Flight','Knight','All'], correct_answer: 'Knight', explanation: 'In KNIGHT, the K is silent — we say "nite".' },
    { id: 'q2_15', question_text: 'Arrange: smallest to largest — 45, 12, 78, 30', question_type: 'mcq', options: ['12,30,45,78','12,45,30,78','30,12,45,78','45,12,30,78'], correct_answer: '12,30,45,78', explanation: '12 < 30 < 45 < 78.' },
    { id: 'q2_16', question_text: 'Which word has the long /e/ sound?', question_type: 'mcq', options: ['Bed','Red','Tree','Ten'], correct_answer: 'Tree', explanation: 'Tree has the long /ee/ sound.' },
    { id: 'q2_17', question_text: 'What is 36 ÷ 6?', question_type: 'mcq', options: ['4','5','6','7'], correct_answer: '6', explanation: '36 ÷ 6 = 6.' },
    { id: 'q2_18', question_text: '"The dog barked loudly." What did the dog do?', question_type: 'mcq', options: ['Ran','Ate','Barked','Slept'], correct_answer: 'Barked', explanation: 'The sentence tells us the dog barked.' },
    { id: 'q2_19', question_text: 'Fill in: ___ is the capital of India.', question_type: 'mcq', options: ['Mumbai','Chennai','Kolkata','New Delhi'], correct_answer: 'New Delhi', explanation: 'New Delhi is the capital of India.' },
    { id: 'q2_20', question_text: 'Which fraction is biggest: 1/2, 1/4, 1/3, 1/8?', question_type: 'mcq', options: ['1/4','1/8','1/3','1/2'], correct_answer: '1/2', explanation: 'The smaller the denominator, the larger the fraction. 1/2 is the largest.' },
  ],
};

// Repeat Level 2 questions for levels 3–5 with different IDs for demo purposes
[3, 4, 5].forEach((lvl) => {
  MOCK_QUESTIONS_BY_LEVEL[lvl] = MOCK_QUESTIONS_BY_LEVEL[2].map((q) => ({
    ...q, id: q.id.replace('q2_', `q${lvl}_`),
  }));
});

const MOCK_LEVEL_STATUS = [
  { level: 1, unlocked: true, isCurrent: false, bestScore: 85, everPassed: true },
  { level: 2, unlocked: true, isCurrent: true, bestScore: 62, everPassed: false },
  { level: 3, unlocked: false, isCurrent: false, bestScore: null, everPassed: false },
  { level: 4, unlocked: false, isCurrent: false, bestScore: null, everPassed: false },
  { level: 5, unlocked: false, isCurrent: false, bestScore: null, everPassed: false },
];

// ─── Get test questions for a level ──────────────────────────────────────────
const getTestQuestions = async (studentId, level) => {
  if (studentId === DEMO_STUDENT_ID) {
    const qs = MOCK_QUESTIONS_BY_LEVEL[level] || MOCK_QUESTIONS_BY_LEVEL[1];
    if (level > 2) throw new Error(`Level ${level} is locked. Complete Level ${level - 1} first.`);
    return qs.map(({ correct_answer, ...q }) => q);
  }
  // Check student is eligible for this level
  const studentResult = await query(
    `SELECT current_level FROM students WHERE user_id = $1`,
    [studentId]
  );
  if (!studentResult.rows.length) throw new Error('Student not found');

  const currentLevel = studentResult.rows[0].current_level || 1;

  // Students can only take tests for their current level or below
  if (level > currentLevel) {
    throw new Error(`Level ${level} is locked. Complete Level ${level - 1} first.`);
  }

  // Get random questions for this level
  const result = await query(
    `SELECT id, level, subject, category, question_text, question_type,
            options_json, correct_answer, explanation, difficulty
     FROM test_questions
     WHERE level = $1 AND is_active = true
     ORDER BY RANDOM()
     LIMIT $2`,
    [level, QUESTIONS_PER_TEST]
  );

  return result.rows.map((q) => ({
    ...q,
    // Do NOT send correct_answer to client — validate server-side
    correct_answer: undefined,
    options: q.options_json,
  }));
};

// ─── Submit test + score + unlock next level if passed ────────────────────────
const submitTest = async (studentId, level, answers, timeTakenMs) => {
  // Demo student — score against mock correct answers
  if (studentId === DEMO_STUDENT_ID) {
    const qs = MOCK_QUESTIONS_BY_LEVEL[level] || MOCK_QUESTIONS_BY_LEVEL[1];
    const qMap = {};
    qs.forEach((q) => { qMap[q.id] = q; });
    let correct = 0;
    const scoredAnswers = answers.map((a) => {
      const q = qMap[a.questionId];
      const isCorrect = q && a.studentAnswer?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim();
      if (isCorrect) correct++;
      return {
        questionId: a.questionId,
        question_text: q?.question_text || '',
        studentAnswer: a.studentAnswer,
        correctAnswer: q?.correct_answer || '',
        isCorrect: !!isCorrect,
        explanation: q?.explanation || '',
        aiFeedback: isCorrect ? null : `Good try! The correct answer is "${q?.correct_answer}". ${q?.explanation || ''}`,
      };
    });
    const total = answers.length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = scorePercent >= PASS_THRESHOLD;
    return {
      scorePercent,
      correctCount: correct,
      totalQuestions: total,
      passed,
      leveledUp: false,
      timeTakenSeconds: Math.round(timeTakenMs / 1000),
      scoredAnswers,
    };
  }

  // Fetch correct answers for submitted question IDs
  const questionIds = answers.map((a) => a.questionId);
  const result = await query(
    `SELECT id, question_text, correct_answer, explanation, difficulty
     FROM test_questions WHERE id = ANY($1::varchar[])`,
    [questionIds]
  );
  const questionMap = {};
  result.rows.forEach((q) => { questionMap[q.id] = q; });

  // Score each answer
  let correctCount = 0;
  const scoredAnswers = [];
  const wrongAnswers = [];

  for (const answer of answers) {
    const question = questionMap[answer.questionId];
    if (!question) continue;
    const isCorrect = answer.studentAnswer?.toLowerCase().trim() ===
      question.correct_answer?.toLowerCase().trim();
    if (isCorrect) correctCount++;
    else wrongAnswers.push({ question, studentAnswer: answer.studentAnswer });

    scoredAnswers.push({
      questionId: answer.questionId,
      studentAnswer: answer.studentAnswer,
      correctAnswer: question.correct_answer,
      isCorrect,
      explanation: question.explanation,
    });
  }

  const scorePercent = answers.length
    ? Math.round((correctCount / answers.length) * 100)
    : 0;
  const passed = scorePercent >= PASS_THRESHOLD;

  // Generate Claude feedback for wrong answers (top 3 only, to control cost)
  let aiFeedback = null;
  if (wrongAnswers.length > 0) {
    try {
      const topWrong = wrongAnswers.slice(0, 3);
      const feedbackParts = await Promise.all(
        topWrong.map((w) =>
          generateWrongAnswerFeedback({
            questionText: w.question.question_text,
            studentAnswer: w.studentAnswer,
            correctAnswer: w.question.correct_answer,
            questionType: w.question.question_type,
          }).then((r) => r.feedback_text || r.raw || '')
        )
      );
      aiFeedback = feedbackParts.join('\n\n');
    } catch {
      aiFeedback = 'Great effort! Review the questions you missed and try again.';
    }
  }

  // Store test attempt
  const attemptResult = await query(
    `INSERT INTO test_attempts
       (id, student_id, level, score_percent, total_questions, correct_count,
        time_taken_ms, answers_json, passed, ai_feedback, attempted_at)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING id`,
    [
      studentId, level, scorePercent, answers.length, correctCount,
      timeTakenMs, JSON.stringify(scoredAnswers), passed, aiFeedback,
    ]
  );
  const attemptId = attemptResult.rows[0].id;

  // If passed and it's current level → unlock next level
  let leveledUp = false;
  if (passed) {
    const studentResult = await query(
      `SELECT current_level FROM students WHERE user_id = $1`,
      [studentId]
    );
    const currentLevel = studentResult.rows[0]?.current_level || 1;

    if (level === currentLevel && currentLevel < 5) {
      const newLevel = currentLevel + 1;
      await query(
        `UPDATE students SET current_level = $1 WHERE user_id = $2`,
        [newLevel, studentId]
      );
      await query(
        `INSERT INTO level_history (id, student_id, from_level, to_level, test_id, unlocked_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())`,
        [studentId, currentLevel, newLevel, attemptId]
      );
      leveledUp = true;
    }
  }

  return {
    attemptId,
    scorePercent,
    correctCount,
    totalQuestions: answers.length,
    passed,
    leveledUp,
    aiFeedback,
    scoredAnswers,
  };
};

// ─── Get test history for a student ──────────────────────────────────────────
const getTestHistory = async (studentId) => {
  const result = await query(
    `SELECT id, level, score_percent, correct_count, total_questions,
            passed, attempted_at
     FROM test_attempts
     WHERE student_id = $1
     ORDER BY attempted_at DESC
     LIMIT 20`,
    [studentId]
  );
  return result.rows;
};

// ─── Get level unlock status for a student ────────────────────────────────────
const getLevelStatus = async (studentId) => {
  if (studentId === DEMO_STUDENT_ID) return MOCK_LEVEL_STATUS;
  const studentResult = await query(
    `SELECT current_level FROM students WHERE user_id = $1`,
    [studentId]
  );
  const currentLevel = studentResult.rows[0]?.current_level || 1;

  // Get best score per level
  const scoreResult = await query(
    `SELECT level, MAX(score_percent) as best_score, BOOL_OR(passed) as ever_passed
     FROM test_attempts WHERE student_id = $1
     GROUP BY level`,
    [studentId]
  );
  const scoreMap = {};
  scoreResult.rows.forEach((r) => { scoreMap[r.level] = r; });

  return Array.from({ length: 5 }, (_, i) => {
    const lvl = i + 1;
    const data = scoreMap[lvl];
    return {
      level: lvl,
      unlocked: lvl <= currentLevel,
      isCurrent: lvl === currentLevel,
      bestScore: data?.best_score ? Math.round(data.best_score) : null,
      everPassed: data?.ever_passed || false,
    };
  });
};

module.exports = { getTestQuestions, submitTest, getTestHistory, getLevelStatus, PASS_THRESHOLD };
