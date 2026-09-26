/**
 * ============================================================
 *  ROUTES/AUTH.JS — Login + session endpoints
 * ============================================================
 *  Endpoints:
 *    POST /api/auth/login  — verify email+password → return JWT
 *    GET  /api/auth/me     — return the logged-in user (needs token)
 *
 *  Security points to mention in class:
 *   - Passwords are stored as bcrypt HASHES (never plain text)
 *   - bcrypt.compare() checks the password against the hash
 *   - JWT expires in 8 hours (stolen tokens die automatically)
 *
 *  Error handling: every route uses plain try/catch —
 *  no wrappers, easy to follow top to bottom.
 * ============================================================
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/login  — body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email + password required' });
    }

    // 1. Find the user by email
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    const user = rows[0];
    // Same message for "no user" and "wrong password"
    // so attackers cannot guess which emails exist
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // 2. Compare plain password with the stored hash
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // 3. Create a signed token — payload carries id + role (used by middleware)
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '8h' }
    );

    // 4. Return token + safe user object (password hash is NEVER sent)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me — "who am I?" using the token from the header
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,name,email,role FROM users WHERE id=?',
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
