/**
 * ============================================================
 *  CONFIG/DB.JS — MySQL connection pool
 * ============================================================
 *  Uses mysql2/promise so we can write:  const [rows] = await pool.query(...)
 *
 *  A POOL keeps several open connections ready and reuses them,
 *  instead of opening/closing a connection for every request
 *  (much faster, safer under load).
 *
 *  Credentials come from backend/.env (never hard-code passwords).
 * ============================================================
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'attendance_db',
  waitForConnections: true, // requests wait if all connections are busy
  connectionLimit: 10       // max simultaneous connections
});

module.exports = pool;
