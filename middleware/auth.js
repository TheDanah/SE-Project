/**
 * Authentication and authorization middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'amam_secret_key';

/**
 * Admin authorization middleware
 * Checks for ADMIN_KEY in environment, or a valid JWT with admin role
 * Attaches adminId to req for downstream handlers
 */
function requireAdmin(req, res, next) {
  try {
    const adminKey = process.env.ADMIN_KEY;
    // 1) If ADMIN_KEY is set, allow requests with x-admin-key header or query param
    if (adminKey) {
      const provided =
        req.headers['x-admin-key'] || req.query.adminKey || (req.body && req.body.adminKey);
      if (provided && provided === adminKey) return next();
      return res.status(401).json({ error: 'Missing or invalid admin key' });
    }

    // 2) Otherwise, accept a Bearer JWT and verify accountType or role === 'admin'
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ error: 'Missing admin token' });

    const token = auth.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload && (payload.accountType === 'admin' || payload.role === 'admin')) {
        // Attach adminId for downstream handlers
        req.adminId = payload.userId || payload.userID || payload.id;
        return next();
      }
      return res.status(403).json({ error: 'Not an admin' });
    } catch (e) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  } catch (e) {
    console.warn('requireAdmin error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { requireAdmin };
