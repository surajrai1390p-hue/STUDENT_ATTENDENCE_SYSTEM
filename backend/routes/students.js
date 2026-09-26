/**
 * ============================================================
 *  ROUTES/STUDENTS.JS — Student CRUD
 * ============================================================
 *  Access rules:
 *    GET    → admin + teacher (both need the list)
 *    POST   → admin only (extra requireRole check below)
 *    DELETE → admin only
 *
 *  Two-layer protection on write routes:
 *    router.use(verifyToken, requireRole('admin','teacher'))  ← file level
 *    router.post('/', requireRole('admin'), ...)              ← route level
 *  So teachers get 403 when they try to add/delete.
 *
 *  Error handling: plain try/catch in every route.
 * ============================================================
 */
const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken, requireRole('admin', 'teacher'));

// GET /api/students — list all students (by roll no)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY roll_no');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students — add a new student (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { roll_no, name, class_name, email } = req.body;
    if (!roll_no || !name) {
      return res.status(400).json({ message: 'roll_no + name required' });
    }
    const [r] = await pool.query(
      'INSERT INTO students (roll_no,name,class_name,email) VALUES (?,?,?,?)',
      [roll_no, name, class_name || 'FY-BCA', email || null]
    );
    res.status(201).json({ id: r.insertId }); // 201 = Created
  } catch (e) {
    // Duplicate roll no (UNIQUE constraint in the table)
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Roll number already exists' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/students/:id — remove student (admin only)
// Its attendance rows are deleted automatically (ON DELETE CASCADE)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM students WHERE id=?', [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
