/**
 * ============================================================
 *  ROUTES/STATS.JS — Dashboard counters + chart data
 * ============================================================
 *  Endpoints:
 *    GET /api/stats           — totals for the 4 stat cards
 *    GET /api/stats/trend     — daily data for the line chart
 *    GET /api/stats/classes   — class-wise data for the bar chart
 *
 *  Simple approach:
 *   - SQL only COUNTs rows (basic queries, easy to read)
 *   - percentages are calculated in JavaScript
 * ============================================================
 */
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET /api/stats — counters for the stat cards + today's presence
router.get('/', async (req, res) => {
  try {
    // Three basic COUNT queries (readable, no nested SQL)
    const [[students]] = await pool.query('SELECT COUNT(*) AS n FROM students');
    const [[subjects]] = await pool.query('SELECT COUNT(*) AS n FROM subjects');
    const [[teachers]] = await pool.query(
      "SELECT COUNT(*) AS n FROM users WHERE role='teacher'"
    );

    // Today's attendance rows → count in JavaScript
    const [todayRows] = await pool.query(
      'SELECT status FROM attendance WHERE date = CURDATE()'
    );
    const today_total = todayRows.length;
    const today_present = todayRows.filter((r) => r.status === 'Present').length;
    const today_absent = today_total - today_present;

    res.json({
      students: students.n,
      subjects: subjects.n,
      teachers: teachers.n,
      today_total,
      today_present,
      today_absent
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/stats/trend?days=14 → one point per day (for the line chart)
router.get('/trend', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 14, 60);

    // Only count per day — no percentage in SQL
    const [rows] = await pool.query(
      `SELECT date,
              COUNT(*) AS total,
              SUM(status='Present') AS present
       FROM attendance
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY date
       ORDER BY date`,
      [days - 1]
    );

    // Add pct in JS: { date, total, present, pct }
    const result = rows.map((r) => ({
      date: r.date,
      total: Number(r.total),
      present: Number(r.present),
      pct: Math.round((100 * Number(r.present)) / Number(r.total))
    }));

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/stats/classes?days=30 → average % per class (bar chart)
router.get('/classes', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);

    const [rows] = await pool.query(
      `SELECT s.class_name,
              COUNT(a.id) AS total,
              SUM(a.status='Present') AS present
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id=s.id AND a.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY s.class_name
       ORDER BY s.class_name`,
      [days]
    );

    // Add pct in JS (guard against division by zero)
    const result = rows
      .map((r) => ({
        class_name: r.class_name,
        total: Number(r.total),
        present: Number(r.present),
        pct: Number(r.total) > 0
          ? Math.round((100 * Number(r.present)) / Number(r.total))
          : 0
      }))
      .filter((r) => r.total > 0); // skip classes with no records

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
