const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(verifyToken);

// POST /api/attendance/mark {subject_id, date, records:[{student_id,status}]}
router.post(
  '/mark',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const { subject_id, date, records } = req.body;
    if (!subject_id || !date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'subject_id, date, records[] required' });
    }
    if (records.length === 0) {
      return res.status(400).json({ message: 'No records to save' });
    }
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
            r.status === 'Absent' ? 'Absent' : 'Present',
            req.user.id
          ]
        );
      }
      await conn.commit();
      res.json({ ok: true, count: records.length });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  })
);

// GET /api/attendance?subject_id=&date=YYYY-MM-DD
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { subject_id, date } = req.query;
    if (!subject_id || !date) {
      return res.status(400).json({ message: 'subject_id + date required' });
    }
    const [rows] = await pool.query(
      `SELECT a.student_id, a.status, s.roll_no, s.name FROM attendance a
       JOIN students s ON s.id=a.student_id WHERE a.subject_id=? AND a.date=? ORDER BY s.roll_no`,
      [subject_id, date]
    );
    res.json(rows);
  })
);

// GET /api/attendance/recent — latest marks for the dashboard
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT a.date, a.status, s.name, s.roll_no, sub.code
       FROM attendance a
       JOIN students s ON s.id=a.student_id
       JOIN subjects sub ON sub.id=a.subject_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT 8`
    );
    res.json(rows);
  })
);

// GET /api/attendance/report?subject_id=&from=&to=  -> % per student
router.get(
  '/report',
  asyncHandler(async (req, res) => {
    const { subject_id, from, to } = req.query;
    if (!subject_id || !from || !to) {
      return res.status(400).json({ message: 'subject_id, from, to required' });
    }
    const [rows] = await pool.query(
      `SELECT s.id, s.roll_no, s.name,
         COUNT(a.id) AS total,
         SUM(a.status='Present') AS present,
         ROUND(100*SUM(a.status='Present')/NULLIF(COUNT(a.id),0),1) AS pct
       FROM students s LEFT JOIN attendance a
         ON a.student_id=s.id AND a.subject_id=? AND a.date BETWEEN ? AND ?
       GROUP BY s.id ORDER BY pct ASC, s.roll_no`,
      [subject_id, from, to]
    );
    res.json(rows);
  })
);

// GET /api/attendance/defaulters?subject_id=&from=&to=&below=75
router.get(
  '/defaulters',
  asyncHandler(async (req, res) => {
    const { subject_id, from, to, below } = req.query;
    if (!subject_id || !from || !to) {
      return res.status(400).json({ message: 'subject_id, from, to required' });
    }
    const cutoff = Number(below) || 75;
    const [rows] = await pool.query(
      `SELECT s.roll_no, s.name,
         COUNT(a.id) AS total, SUM(a.status='Present') AS present,
         ROUND(100*SUM(a.status='Present')/NULLIF(COUNT(a.id),0),1) AS pct
       FROM students s LEFT JOIN attendance a
         ON a.student_id=s.id AND a.subject_id=? AND a.date BETWEEN ? AND ?
       GROUP BY s.id HAVING pct IS NOT NULL AND pct < ? ORDER BY pct`,
      [subject_id, from, to, cutoff]
    );
    res.json(rows);
  })
);

module.exports = router;
