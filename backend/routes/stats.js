const express = require('express');
const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// GET /api/stats — dashboard counters + today's attendance summary
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [[counts]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM students) AS students,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM users WHERE role='teacher') AS teachers`
    );
    const [[today]] = await pool.query(
      `SELECT
        COUNT(*) AS today_total,
        SUM(status='Present') AS today_present,
        SUM(status='Absent') AS today_absent
       FROM attendance WHERE date = CURDATE()`
    );
    res.json({
      students: counts.students,
      subjects: counts.subjects,
      teachers: counts.teachers,
      today_total: today.today_total || 0,
      today_present: today.today_present || 0,
      today_absent: today.today_absent || 0
    });
  })
);

// GET /api/stats/trend?days=14 — daily attendance % for the line chart
router.get(
  '/trend',
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 14, 60);
    const [rows] = await pool.query(
      `SELECT date,
         COUNT(*) AS total,
         SUM(status='Present') AS present,
         ROUND(100*SUM(status='Present')/NULLIF(COUNT(*),0),1) AS pct
       FROM attendance
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY date ORDER BY date`,
      [days - 1]
    );
    res.json(rows);
  })
);

// GET /api/stats/classes?days=30 — class-wise average % for the bar chart
router.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const [rows] = await pool.query(
      `SELECT s.class_name,
         COUNT(a.id) AS total,
         SUM(a.status='Present') AS present,
         ROUND(100*SUM(a.status='Present')/NULLIF(COUNT(a.id),0),1) AS pct
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id=s.id AND a.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY s.class_name
       ORDER BY s.class_name`,
      [days]
    );
    res.json(rows);
  })
);

module.exports = router;
