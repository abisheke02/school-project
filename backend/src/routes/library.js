const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.get('/books', requireAuth, async (req, res, next) => {
  try {
    const { search, subject } = req.query;
    let sql = `SELECT * FROM library_books WHERE school_id = $1`;
    const params = [req.user.schoolId];
    if (subject) { params.push(subject); sql += ` AND subject = $${params.length}`; }
    if (search)  { params.push(`%${search}%`); sql += ` AND (title ILIKE $${params.length} OR author ILIKE $${params.length})`; }
    sql += ' ORDER BY title';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/books', requireAuth, requireRole('super_admin', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { title, author, isbn, subject, publisher, edition, total_copies, rack_number } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const { rows } = await query(`INSERT INTO library_books (school_id, title, author, isbn, subject, publisher, edition, total_copies, available_copies, rack_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING *`, [req.user.schoolId, title, author || null, isbn || null, subject || null, publisher || null, edition || null, total_copies || 1, rack_number || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/issues', requireAuth, async (req, res, next) => {
  try {
    const { returned } = req.query;
    let sql = `SELECT bi.*, lb.title, lb.author, s.name AS student_name FROM book_issues bi JOIN library_books lb ON lb.id = bi.book_id LEFT JOIN students s ON s.id = bi.student_id WHERE lb.school_id = $1`;
    const params = [req.user.schoolId];
    if (returned === 'false') sql += ' AND bi.return_date IS NULL';
    if (returned === 'true')  sql += ' AND bi.return_date IS NOT NULL';
    sql += ' ORDER BY bi.issue_date DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/issues', requireAuth, async (req, res, next) => {
  try {
    const { book_id, student_id, due_date } = req.body;
    if (!book_id || !due_date) return res.status(400).json({ error: 'book_id and due_date are required' });
    const { rows: [issue] } = await query(`INSERT INTO book_issues (book_id, student_id, due_date, issued_by) VALUES ($1,$2,$3,$4) RETURNING *`, [book_id, student_id || null, due_date, req.user.userId]);
    await query(`UPDATE library_books SET available_copies = available_copies - 1 WHERE id = $1 AND available_copies > 0`, [book_id]);
    res.status(201).json(issue);
  } catch (err) { next(err); }
});

router.put('/issues/:id/return', requireAuth, async (req, res, next) => {
  try {
    const { rows: [issue] } = await query(`SELECT * FROM book_issues WHERE id = $1`, [req.params.id]);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    await query(`UPDATE book_issues SET return_date = CURRENT_DATE WHERE id = $1`, [req.params.id]);
    await query(`UPDATE library_books SET available_copies = available_copies + 1 WHERE id = $1`, [issue.book_id]);
    res.json({ message: 'Book returned' });
  } catch (err) { next(err); }
});

module.exports = router;
