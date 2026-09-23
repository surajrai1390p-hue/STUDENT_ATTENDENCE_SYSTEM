const express = require('express');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(verifyToken);

// GET /api/subjects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT s.*, u.name AS teacher_name FROM subjects s
       LEFT JOIN users u ON u.id=s.teacher_id ORDER BY s.code`
    );
    res.json(rows);
  })
);

// POST /api/subjects (admin)
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { code, name, teacher_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code + name required' });
    }
    try {
      const [r] = await pool.query(
        'INSERT INTO subjects (code,name,teacher_id) VALUES (?,?,?)',
        [code, name, teacher_id || null]
      );
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Subject code already exists' });
      }
      throw e;
    }
  })
);

// PUT /api/subjects/:id (admin) — rename / reassign teacher
router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { code, name, teacher_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code + name required' });
    }
    try {
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
      throw e;
    }
  })
);

// DELETE /api/subjects/:id (admin) — attendance cascades via FK
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [r] = await pool.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ ok: true });
  })
);

module.exports = router;
