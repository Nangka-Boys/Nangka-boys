const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied: Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }

    try {
      // Real-time verification that user is active and has not been suspended
      const checkUser = await db.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decodedUser.id]
      );

      if (checkUser.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'User account no longer exists.' });
      }

      const user = checkUser.rows[0];
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          account_suspended: true,
          message: 'Access revoked: Your account has been suspended by an administrator.',
        });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Auth verification error:', dbErr);
      return res.status(500).json({ success: false, message: 'Server error verifying authentication.' });
    }
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      req.user = null;
      return next();
    }

    try {
      const checkUser = await db.query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decodedUser.id]
      );

      if (checkUser.rows.length > 0 && checkUser.rows[0].is_active) {
        req.user = checkUser.rows[0];
      } else {
        req.user = null;
      }
      next();
    } catch (dbErr) {
      console.error('Optional auth verification error:', dbErr);
      req.user = null;
      next();
    }
  });
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  authorizeRoles,
};
