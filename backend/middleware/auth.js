/**
 * ============================================================
 *  MIDDLEWARE/AUTH.JS — JWT authentication + role authorization
 * ============================================================
 *  Two separate concepts (common viva question):
 *
 *  1. Authentication (verifyToken)
 *     "WHO are you?"  — proves the request carries a valid JWT
 *
 *  2. Authorization (requireRole)
 *     "WHAT can you do?" — checks the user's role (admin/teacher)
 *
 *  Flow:
 *     Login → server signs JWT containing {id, role, name}
 *          → frontend stores it in localStorage
 *          → every API call sends:  Authorization: Bearer <token>
 *          → verifyToken() decodes it and attaches req.user
 * ============================================================
 */
const jwt = require('jsonwebtoken');

/**
 * verifyToken — reads the JWT from the request header and validates it.
 * On success: req.user = { id, role, name, iat, exp }
 * On failure: responds 401 (unauthorized) and stops the request.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  // Header looks like: "Bearer eyJhbGciOi..." — we only need the part after "Bearer "
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    // jwt.verify checks the signature + expiry; throws if invalid
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next(); // token valid → continue to the actual route handler
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * requireRole — role-based access control (RBAC) factory.
 * Usage: router.post('/', requireRole('admin'), handler)
 * Only users whose role is in the allowed list may proceed;
 * everyone else gets 403 (forbidden).
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
