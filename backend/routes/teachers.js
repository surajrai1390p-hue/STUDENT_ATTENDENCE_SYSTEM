/**
 * ============================================================
 *  ROUTES/TEACHERS.js — Teacher management (admin only)
 * ============================================================
 *  All routes are admin-only (router.use below).
 *  Teachers are rows in the same `users` table with role='teacher'.
 *
 *  Important: passwords are hashed with bcrypt BEFORE insert —
 *  the plain password is never stored or returned.
 *
 *  Error handling: plain try/catch in every route.
 * ============================================================
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken, requireRole('admin')); // admin only

// GET /api/teachers — list all teacher accounts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id,name,email,role,created_at FROM users WHERE role='teacher' ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/teachers {name, email, password} — create a teacher login
router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    // 10 salt rounds → bcrypt hashes the password with a random salt
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      "INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'teacher')",
      [name, email, hash]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/teachers/:id
// AND role='teacher' guard → nobody can delete the admin through this route
router.delete('/:id', async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM users WHERE id=? AND role='teacher'", [
      req.params.id
    ]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
