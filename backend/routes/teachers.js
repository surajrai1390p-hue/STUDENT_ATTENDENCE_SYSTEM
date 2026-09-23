const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(verifyToken, requireRole('admin'));

// GET /api/teachers
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id,name,email,role,created_at FROM users WHERE role='teacher' ORDER BY id DESC"
    );
    res.json(rows);
  })
);

// POST /api/teachers {name,email,password}
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const [r] = await pool.query(
        "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'teacher')",
        [name, email, hash]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already exists' });
      }
      throw e;
    }
  })
);

// DELETE /api/teachers/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const [r] = await pool.query("DELETE FROM users WHERE id=? AND role='teacher'", [
      req.params.id
    ]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json({ ok: true });
  })
);

module.exports = router;
