const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(verifyToken, requireRole('admin', 'teacher'));

// GET /api/students
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY roll_no');
    res.json(rows);
  })
);

// POST /api/students (admin only)
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { roll_no, name, class_name, email } = req.body;
    if (!roll_no || !name) {
      return res.status(400).json({ message: 'roll_no + name required' });
    }
    try {
      const [r] = await pool.query(
        'INSERT INTO students (roll_no,name,class_name,email) VALUES (?,?,?,?)',
        [roll_no, name, class_name || 'FY-BCA', email || null]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Roll number already exists' });
      }
      throw e;
    }
  })
);

// DELETE /api/students/:id (admin)
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [r] = await pool.query('DELETE FROM students WHERE id=?', [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ ok: true });
  })
);

module.exports = router;
