/**
 * ============================================================
 *  ROUTES/ATTENDANCE.JS — Core feature of the project
 * ============================================================
 *  Endpoints:
 *    POST /api/attendance/mark       — save P/A for a class (admin/teacher)
 *    GET  /api/attendance            — marks for subject + date (edit mode)
 *    GET  /api/attendance/recent     — latest marks (dashboard list)
 *    GET  /api/attendance/report     — student-wise % for a date range
 *    GET  /api/attendance/defaulters — students below 75%
 *
 *  Simple approach used here:
 *   - SQL only COUNTS total and present (basic GROUP BY)
 *   - the percentage itself is calculated in JavaScript
 *     (one line: Math.round(100 * present / total))
 *
 *  Key DB concept: UNIQUE(student_id, subject_id, date)
 *  → one mark per student per subject per day. Re-saving the
 *    same day UPDATES the old row instead of duplicating it.
 * ============================================================
 */
const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken); // every route in this file needs a valid JWT

// Small helper: turns {total, present} rows into rows with a pct field
// Math.round(x * 10) / 10 → keeps ONE decimal place (e.g. 89.5)
function addPercentage(rows) {
  return rows.map((r) => {
    const total = Number(r.total);
    const present = Number(r.present);
    const pct = total > 0 ? Math.round((100 * present) / total * 10) / 10 : null;
    return { ...r, total, present, pct };
  });
}

// POST /api/attendance/mark
// body: { subject_id, date, records: [{student_id, status}, ...] }
router.post('/mark', requireRole('admin', 'teacher'), async (req, res) => {
  const { subject_id, date, records } = req.body;
  if (!subject_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ message: 'subject_id, date, records[] required' });
  }
  if (records.length === 0) {
    return res.status(400).json({ message: 'No records to save' });
  }

  // ---- TRANSACTION (all-or-nothing) ----
  // If ANY insert fails, everything is rolled back —
  // we never end up with a half-saved attendance sheet.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of records) {
      await conn.query(
        `INSERT INTO attendance (student_id,subject_id,date,status,marked_by)
         VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status), marked_by=VALUES(marked_by)`,
        [
          r.student_id,
          subject_id,
          date,
          r.status === 'Absent' ? 'Absent' : 'Present', // only these 2 values allowed
          req.user.id // which user marked it (audit trail)
        ]
      );
    }
    await conn.commit(); // save everything
    res.json({ ok: true, count: records.length });
  } catch (e) {
    await conn.rollback(); // undo everything on error
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release(); // return connection to the pool (always runs)
  }
});

// GET /api/attendance?subject_id=&date=  → already-saved marks
// Used when a teacher re-opens a date to edit it
router.get('/', async (req, res) => {
  try {
    const { subject_id, date } = req.query;
    if (!subject_id || !date) {
      return res.status(400).json({ message: 'subject_id + date required' });
    }
    const [rows] = await pool.query(
      `SELECT a.student_id, a.status, s.roll_no, s.name FROM attendance a
       JOIN students s ON s.id=a.student_id
       WHERE a.subject_id=? AND a.date=? ORDER BY s.roll_no`,
      [subject_id, date]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/recent → last 8 marks (Dashboard list)
router.get('/recent', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.date, a.status, s.name, s.roll_no, sub.code
       FROM attendance a
       JOIN students s ON s.id=a.student_id
       JOIN subjects sub ON sub.id=a.subject_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT 8`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/report?subject_id=&from=&to=
// GROUP BY student → count total classes and how many were present
// LEFT JOIN → students with no records still appear (total = 0)
router.get('/report', async (req, res) => {
  try {
    const { subject_id, from, to } = req.query;
    if (!subject_id || !from || !to) {
      return res.status(400).json({ message: 'subject_id, from, to required' });
    }
    const [rows] = await pool.query(
      `SELECT s.id, s.roll_no, s.name,
              COUNT(a.id) AS total,
              SUM(a.status='Present') AS present
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id=s.id AND a.subject_id=? AND a.date BETWEEN ? AND ?
       GROUP BY s.id
       ORDER BY s.roll_no`,
      [subject_id, from, to]
    );
    res.json(addPercentage(rows)); // % calculated in JS (see helper above)
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/defaulters?subject_id=&from=&to=&below=75
// Same query as /report — the filtering (pct < 75) happens in JS
router.get('/defaulters', async (req, res) => {
  try {
    const { subject_id, from, to, below } = req.query;
    if (!subject_id || !from || !to) {
      return res.status(400).json({ message: 'subject_id, from, to required' });
    }
    const cutoff = Number(below) || 75; // attendance rule: 75% minimum

    const [rows] = await pool.query(
      `SELECT s.id, s.roll_no, s.name,
              COUNT(a.id) AS total,
              SUM(a.status='Present') AS present
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id=s.id AND a.subject_id=? AND a.date BETWEEN ? AND ?
       GROUP BY s.id`,
      [subject_id, from, to]
    );

    const withPct = addPercentage(rows);
    const defaulters = withPct
      .filter((r) => r.pct !== null && r.pct < cutoff)
      .sort((a, b) => a.pct - b.pct); // worst attendance first

    res.json(defaulters);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
