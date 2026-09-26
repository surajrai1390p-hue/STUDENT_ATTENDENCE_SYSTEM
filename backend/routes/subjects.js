/**
 * ============================================================
 *  ROUTES/SUBJECTS.js — Subject CRUD
 * ============================================================
 *  Endpoints:
 *    GET    /api/subjects           — list (admin + teacher)
 *    POST   /api/subjects           — create (admin)
 *    PUT    /api/subjects/:id       — update (admin)
 *    DELETE /api/subjects/:id       — delete (admin)
 *
 *  LEFT JOIN with users brings the teacher's name in the same
 *  query (frontend doesn't need a second request).
 *
 *  Error handling: plain try/catch in every route.
 * ============================================================
 */
const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken); // login required for all subject routes

// GET /api/subjects — subjects + teacher name
// LEFT JOIN keeps subjects even when no teacher is assigned (NULL)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.name AS teacher_name FROM subjects s
       LEFT JOIN users u ON u.id=s.teacher_id ORDER BY s.code`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/subjects (admin) — create a subject
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { code, name, teacher_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code + name required' });
    }
    const [r] = await pool.query(
      'INSERT INTO subjects (code,name,teacher_id) VALUES (?,?,?)',
      [code, name, teacher_id || null]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Subject code already exists' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/subjects/:id (admin) — rename / reassign teacher
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { code, name, teacher_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code + name required' });
    }
    const [r] = await pool.query(
      'UPDATE subjects SET code=?, name=?, teacher_id=? WHERE id=?',
      [code, name, teacher_id || null, req.params.id]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Subject code already exists' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/subjects/:id (admin)
// Attendance references subjects with ON DELETE CASCADE →
// deleting a subject also deletes its attendance records.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
