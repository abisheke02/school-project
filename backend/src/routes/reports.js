// PDF Report Routes — Phase 5
// Generates per-student PDF: screening result, progress, error patterns, AI recs
// Uses PDFKit for zero-dependency PDF generation

const express = require('express');
const PDFDocument = require('pdfkit');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

const LD_LABELS = {
  dyslexia: 'Dyslexia (Reading & Phonics)',
  dysgraphia: 'Dysgraphia (Writing)',
  dyscalculia: 'Dyscalculia (Mathematics)',
  mixed: 'Mixed Learning Difficulties',
  not_detected: 'No Learning Disability Detected',
};

const LEVEL_LABELS = ['', 'Level 1 — Starter', 'Level 2 — Basic',
  'Level 3 — Intermediate', 'Level 4 — Advanced', 'Level 5 — Mastery'];

// ─── GET /api/reports/student/:studentId ─────────────────────────────────────
// Download PDF report for a student (teachers + admin only)
router.get('/student/:studentId', requireAuth, requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Fetch student data
    const profileResult = await query(
      `SELECT u.name, u.phone, s.age, s.class_grade, s.ld_type, s.ld_risk_score,
              s.current_level, s.streak_count, s.last_screened_at
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1`,
      [studentId]
    );
    if (!profileResult.rows.length) return res.status(404).json({ error: 'Student not found' });
    const student = profileResult.rows[0];

    // Fetch error patterns
    const errorsResult = await query(
      `SELECT pattern_type, frequency, description FROM error_patterns
       WHERE student_id = $1 ORDER BY frequency DESC LIMIT 5`,
      [studentId]
    );

    // Fetch latest recommendation
    const recResult = await query(
      `SELECT recommendations FROM ai_recommendations
       WHERE student_id = $1 AND audience = 'student'
       ORDER BY generated_at DESC LIMIT 1`,
      [studentId]
    );

    // Fetch 14-day score trend
    const trendResult = await query(
      `SELECT ps.completed_at::date as date,
              ROUND(AVG(pse.score_percent)::numeric, 1) as avg_score
       FROM practice_sessions ps
       JOIN practice_session_exercises pse ON pse.session_id = ps.id
       WHERE ps.student_id = $1
         AND ps.completed_at > NOW() - INTERVAL '14 days'
       GROUP BY date ORDER BY date ASC`,
      [studentId]
    );

    // Fetch test history
    const testResult = await query(
      `SELECT level, MAX(score_percent) as best_score, BOOL_OR(passed) as ever_passed
       FROM test_attempts WHERE student_id = $1
       GROUP BY level ORDER BY level`,
      [studentId]
    );

    // Build PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="LD_Report_${student.name.replace(/\s+/g, '_')}.pdf"`
    );
    doc.pipe(res);

    // ─── Header ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill('#1d4ed8');
    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(22)
       .text('LD Support Platform', 50, 25);
    doc.font('Helvetica').fontSize(12)
       .text('Student Progress Report', 50, 52);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 50, 68);
    doc.fillColor('black');

    // ─── Student Profile ─────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('Student Profile');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    const profileData = [
      ['Name', student.name || '—'],
      ['Age', student.age ? `${student.age} years` : '—'],
      ['Class', student.class_grade ? `Grade ${student.class_grade}` : '—'],
      ['Current Level', LEVEL_LABELS[student.current_level] || '—'],
      ['Streak', `${student.streak_count || 0} days`],
    ];

    doc.font('Helvetica').fontSize(11).fillColor('#374151');
    profileData.forEach(([key, val]) => {
      doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
      doc.font('Helvetica').text(val);
    });

    // ─── LD Classification ───────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('LD Classification');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    const ldColor = student.ld_risk_score > 70 ? '#dc2626' :
      student.ld_risk_score > 40 ? '#d97706' : '#16a34a';

    doc.font('Helvetica-Bold').fontSize(14).fillColor(ldColor)
       .text(LD_LABELS[student.ld_type] || 'Not yet screened');
    doc.font('Helvetica').fontSize(11).fillColor('#374151')
       .text(`Risk Score: ${student.ld_risk_score || 0}/100`);
    if (student.last_screened_at) {
      doc.text(`Last Screened: ${new Date(student.last_screened_at).toLocaleDateString('en-IN')}`);
    }

    // ─── Score Trend ─────────────────────────────────────────────────────────
    if (trendResult.rows.length) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('14-Day Score Trend');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(10).fillColor('#374151');
      trendResult.rows.forEach((day) => {
        const bar = '█'.repeat(Math.round((day.avg_score || 0) / 5));
        doc.text(`${day.date}: ${day.avg_score}%  ${bar}`);
      });
    }

    // ─── Level Progress ──────────────────────────────────────────────────────
    if (testResult.rows.length) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('Level Test Results');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      testResult.rows.forEach((t) => {
        const status = t.ever_passed ? '✓ Passed' : '✗ Not yet passed';
        doc.text(`${LEVEL_LABELS[t.level]}: ${Math.round(t.best_score || 0)}% — ${status}`);
      });
    }

    // ─── Error Patterns ──────────────────────────────────────────────────────
    if (errorsResult.rows.length) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('Key Error Patterns');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      errorsResult.rows.forEach((p, i) => {
        const desc = typeof p.description === 'string'
          ? JSON.parse(p.description)
          : p.description;
        doc.font('Helvetica-Bold').text(`${i + 1}. ${p.pattern_type}`, { continued: true });
        doc.font('Helvetica').text(`  (${p.frequency} occurrences)`);
        if (desc?.teacher_intervention) {
          doc.fontSize(10).fillColor('#64748b')
             .text(`   Teacher note: ${desc.teacher_intervention}`);
          doc.fillColor('#374151').fontSize(11);
        }
      });
    }

    // ─── AI Recommendations ──────────────────────────────────────────────────
    if (recResult.rows.length) {
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a5f').text('AI Recommendations');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      let recs = recResult.rows[0].recommendations;
      if (typeof recs === 'string') recs = JSON.parse(recs);
      const recList = Array.isArray(recs) ? recs : recs?.recommendations || [];

      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      recList.slice(0, 3).forEach((r, i) => {
        doc.font('Helvetica-Bold').text(`${i + 1}. ${r.title || r.strategy_title || r.exercise_type}`);
        const desc = r.why || r.description || '';
        if (desc) doc.font('Helvetica').text(`   ${desc}`);
      });
    }

    // ─── Footer ──────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#94a3b8')
       .text('This report is generated by LD Support Platform. For clinical diagnosis, please consult a certified educational psychologist.',
         { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
