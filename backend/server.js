/**
 * ============================================================
 *  SERVER.JS — Entry point of the Backend (Express + MySQL)
 * ============================================================
 *  What this file does:
 *   1. Creates the Express application
 *   2. Registers global middleware (CORS, JSON body parser)
 *   3. Mounts all API routes under /api/*
 *   4. Handles unknown routes (404)
 *
 *  Exam point: "Backend is a REST API — the frontend calls these
 *  endpoints using axios. There is no server-side rendering."
 *
 *  Each route file uses plain try/catch for error handling.
 * ============================================================
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // loads .env (DB_PASSWORD, JWT_SECRET...) into process.env

const app = express();

// CORS = allow the React app (port 5173) to call this API (port 5000)
app.use(cors());
// JSON body parser — converts {"name":"..."} bodies into req.body
app.use(express.json());

// ---------- Health check (used to verify the server is running) ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------- Route modules (one file per feature) ----------
app.use('/api/auth', require('./routes/auth'));             // login, current user
app.use('/api/teachers', require('./routes/teachers'));     // teacher CRUD (admin)
app.use('/api/students', require('./routes/students'));     // student CRUD
app.use('/api/subjects', require('./routes/subjects'));     // subject CRUD
app.use('/api/attendance', require('./routes/attendance')); // mark + reports
app.use('/api/stats', require('./routes/stats'));           // dashboard counters + charts

// ---------- 404: any URL that did not match a route above ----------
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
