// Protects routes using a JWT sent as: Authorization: Bearer <token>. The token is verified on every request - never trusted just because it was valid once at login.

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorised. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, username, role } - available to controllers
    next();
  } catch (err) {
    logger.warn(`Rejected request with invalid/expired token: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Not authorised. Token is invalid or has expired.' });
  }
}

// Reserved for role-based access control in Part 2 (Client/Freelancer/Admin).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { protect, requireRole };