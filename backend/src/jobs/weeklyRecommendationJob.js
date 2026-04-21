// Weekly Recommendation Job — Phase 4
// Runs every Sunday at 16:30 UTC (22:00 IST)
// Generates AI recommendations for students, teachers, and parents

const { query } = require('../config/database');
const {
  generateForStudent,
  generateForTeacher,
  generateForParent,
} = require('../services/recommendationService');

const runWeeklyRecommendationJob = async () => {
  console.log('[WeeklyRecJob] Starting at', new Date().toISOString());
  const stats = { students: 0, teachers: 0, parents: 0, failed: 0 };

  try {
    // ── Student recommendations ──────────────────────────────────
    const studentsResult = await query(
      `SELECT user_id FROM students WHERE ld_type IS NOT NULL LIMIT 200`
    );
    for (const { user_id } of studentsResult.rows) {
      try {
        await generateForStudent(user_id);
        stats.students++;
      } catch (err) {
        console.error('[WeeklyRecJob] Student failed:', user_id, err.message);
        stats.failed++;
      }
    }

    // ── Teacher recommendations ──────────────────────────────────
    const teachersResult = await query(
      `SELECT DISTINCT teacher_id FROM students WHERE teacher_id IS NOT NULL`
    );
    for (const { teacher_id } of teachersResult.rows) {
      try {
        await generateForTeacher(teacher_id);
        stats.teachers++;
      } catch (err) {
        console.error('[WeeklyRecJob] Teacher failed:', teacher_id, err.message);
        stats.failed++;
      }
    }

    // ── Parent recommendations ───────────────────────────────────
    const parentsResult = await query(
      `SELECT DISTINCT parent_id FROM students WHERE parent_id IS NOT NULL`
    );
    for (const { parent_id } of parentsResult.rows) {
      try {
        await generateForParent(parent_id);
        stats.parents++;
      } catch (err) {
        console.error('[WeeklyRecJob] Parent failed:', parent_id, err.message);
        stats.failed++;
      }
    }

    console.log('[WeeklyRecJob] Done.', stats);
    return stats;
  } catch (err) {
    console.error('[WeeklyRecJob] Fatal error:', err.message);
    throw err;
  }
};

// Schedule: Sunday 16:30 UTC = 22:00 IST
if (require.main === module) {
  const scheduleWeekly = () => {
    const now = new Date();
    const next = new Date();
    // Find next Sunday
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    next.setUTCDate(now.getUTCDate() + daysUntilSunday);
    next.setUTCHours(16, 30, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    const ms = next - now;
    console.log(`[WeeklyRecJob] Next run in ${Math.round(ms / 3600000)} hours`);
    setTimeout(async () => {
      await runWeeklyRecommendationJob();
      scheduleWeekly();
    }, ms);
  };
  scheduleWeekly();
}

module.exports = { runWeeklyRecommendationJob };
