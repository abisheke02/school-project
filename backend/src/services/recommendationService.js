// AI Recommendation Service — Phase 4
// Generates personalised recommendations for students, teachers, and parents
// Runs weekly (Sunday 22:00 IST = 16:30 UTC)

const { query } = require('../config/database');
const { generateStudentRecommendations } = require('./claudeService');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

// ─── Student recommendations (3 targeted exercises) ───────────────────────────
const generateForStudent = async (studentId) => {
  const studentResult = await query(
    `SELECT u.name, s.ld_type, s.current_level, s.ld_risk_score,
            s.streak_count
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1`,
    [studentId]
  );
  if (!studentResult.rows.length) return null;
  const student = studentResult.rows[0];

  // Top error patterns
  const errorsResult = await query(
    `SELECT pattern_type, description, frequency
     FROM error_patterns
     WHERE student_id = $1
     ORDER BY frequency DESC LIMIT 3`,
    [studentId]
  );

  // Recent test performance
  const testResult = await query(
    `SELECT level, score_percent, passed
     FROM test_attempts
     WHERE student_id = $1
     ORDER BY attempted_at DESC LIMIT 5`,
    [studentId]
  );

  const recs = await generateStudentRecommendations({
    studentName: student.name,
    ldType: student.ld_type,
    currentLevel: student.current_level,
    ldRiskScore: student.ld_risk_score,
    streakCount: student.streak_count,
    topErrorPatterns: errorsResult.rows,
    recentTests: testResult.rows,
  });

  await upsertRecommendation(studentId, 'student', recs);
  return recs;
};

// ─── Teacher recommendations (class-level strategies) ────────────────────────
const generateForTeacher = async (teacherId) => {
  // Get teacher's classes
  const classResult = await query(
    `SELECT c.id, c.class_name,
            COUNT(cs.student_id) as student_count,
            AVG(s.ld_risk_score) as avg_risk,
            COUNT(CASE WHEN s.ld_type IS NOT NULL THEN 1 END) as screened_count,
            COUNT(CASE WHEN s.ld_risk_score > 70 THEN 1 END) as high_risk_count
     FROM classes c
     LEFT JOIN class_students cs ON cs.class_id = c.id
     LEFT JOIN students s ON s.user_id = cs.student_id
     WHERE c.teacher_id = $1
     GROUP BY c.id`,
    [teacherId]
  );

  if (!classResult.rows.length) return null;

  // LD distribution across all students
  const ldResult = await query(
    `SELECT s.ld_type, COUNT(*) as count
     FROM class_students cs
     JOIN classes c ON c.id = cs.class_id
     JOIN students s ON s.user_id = cs.student_id
     WHERE c.teacher_id = $1
     GROUP BY s.ld_type`,
    [teacherId]
  );

  const classStats = classResult.rows[0];
  const ldDistribution = ldResult.rows;

  const [response] = await Promise.all([
    client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [{
        type: 'text',
        text: `You are an educational specialist in Learning Disabilities (LD) for Indian schools.
You help teachers adapt their teaching strategies for classrooms with students who have dyslexia, dysgraphia, and dyscalculia.
Provide practical, classroom-ready strategies. Keep recommendations concise and actionable.`,
        cache_control: { type: 'ephemeral' },
      }],
      messages: [{
        role: 'user',
        content: `Generate 3 teaching strategies for this class:
- Class: ${classStats.class_name}
- Students: ${classStats.student_count}
- Screened: ${classStats.screened_count}
- High Risk (score>70): ${classStats.high_risk_count}
- Avg Risk Score: ${Math.round(classStats.avg_risk || 0)}
- LD Distribution: ${JSON.stringify(ldDistribution)}

Provide 3 specific, actionable strategies for inclusive teaching this week. Format as JSON:
{ "strategies": [{"title": "...", "description": "...", "ld_target": "dyslexia|dysgraphia|dyscalculia|all"}, ...] }`,
      }],
    }),
  ]);

  let recs;
  try {
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    recs = match ? JSON.parse(match[0]) : { strategies: [] };
  } catch {
    recs = { strategies: [], raw: response.content[0].text };
  }

  // Store for teacher
  await upsertRecommendation(teacherId, 'teacher', recs);
  return recs;
};

// ─── Parent tips (3 tips/week) ────────────────────────────────────────────────
const generateForParent = async (parentId) => {
  const childResult = await query(
    `SELECT u.name, s.ld_type, s.current_level, s.streak_count, s.ld_risk_score
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.parent_id = $1
     LIMIT 1`,
    [parentId]
  );
  if (!childResult.rows.length) return null;
  const child = childResult.rows[0];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [{
      type: 'text',
      text: `You are a supportive educational counsellor helping Indian parents support children with Learning Disabilities.
Provide warm, practical, easy-to-implement tips that parents can do at home in India.
Keep language simple. Be encouraging and non-alarming.`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Generate 3 home support tips for a parent whose child:
- Name: ${child.name}
- LD Type: ${child.ld_type || 'Not yet screened'}
- Current Level: ${child.current_level}
- Streak: ${child.streak_count} days
- Risk Score: ${child.ld_risk_score || 0}

Format as JSON: { "tips": [{"title": "...", "description": "...", "duration": "5-10 minutes"}, ...] }`,
    }],
  });

  let recs;
  try {
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    recs = match ? JSON.parse(match[0]) : { tips: [] };
  } catch {
    recs = { tips: [], raw: response.content[0].text };
  }

  await upsertRecommendation(parentId, 'parent', recs);
  return recs;
};

// ─── Get stored recommendations ──────────────────────────────────────────────
const getRecommendations = async (userId, audience) => {
  const result = await query(
    `SELECT recommendations, generated_at, valid_until
     FROM ai_recommendations
     WHERE student_id = $1 AND audience = $2
     ORDER BY generated_at DESC LIMIT 1`,
    [userId, audience]
  );
  return result.rows[0] || null;
};

// ─── Upsert helper ────────────────────────────────────────────────────────────
const upsertRecommendation = async (userId, audience, recs) => {
  await query(
    `INSERT INTO ai_recommendations
       (id, student_id, audience, recommendations, generated_at, valid_until)
     VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW() + INTERVAL '7 days')`,
    [userId, audience, JSON.stringify(recs)]
  );
};

module.exports = {
  generateForStudent,
  generateForTeacher,
  generateForParent,
  getRecommendations,
};
