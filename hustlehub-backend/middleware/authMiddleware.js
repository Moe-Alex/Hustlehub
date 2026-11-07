// protect: requires a valid JWT (Authorization: Bearer <token>) on every request.
// requireRole: restricts a route to specific roles (role-based access control).

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const User = require('../models/User');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorised. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Pinning the algorithm stops "alg: none" and algorithm-confusion attacks.
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    // Re-read the user so a deleted account or changed role takes effect immediately, not when the token expires.
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorised. Account no longer exists.' });
    }

    // Logging out raises the user's tokenVersion, so a token issued before that no longer works (it may have been stolen).
    if ((decoded.tv || 0) !== user.tokenVersion) {
      logger.warn('security.token.revoked', { requestId: req.id, userId: user.id, path: req.baseUrl + req.path });
      return res.status(401).json({ success: false, message: 'Not authorised. Your session has ended. Please log in again.' });
    }

    req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      logger.warn('security.token.rejected', { requestId: req.id, reason: err.name, path: req.baseUrl + req.path });
      return res.status(401).json({ success: false, message: 'Not authorised. Token is invalid or has expired.' });
    }
    return next(err); // anything else (e.g. database down) is a real server error
  }
}

// Usage: router.post('/', protect, requireRole('freelancer'), handler)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn('security.access.forbidden', { requestId: req.id, role: req.user ? req.user.role : 'anonymous', method: req.method, path: req.baseUrl + req.path, userId: req.user ? req.user.id : undefined });
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { protect, requireRole };
