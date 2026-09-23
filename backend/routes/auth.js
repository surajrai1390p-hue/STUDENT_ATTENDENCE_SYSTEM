const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email + password required' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT id,name,email,role FROM users WHERE id=?',
      [req.user.id]
    );
    res.json(rows[0] || null);
  })
);

module.exports = router;
