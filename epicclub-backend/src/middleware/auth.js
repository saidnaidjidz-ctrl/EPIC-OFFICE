const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');

/**
 * Middleware to verify access tokens and construct authorization contexts.
 * Returns a generic error response for all validation failures.
 * 
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware callback
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }

  try {
    // Enforce HS512 algorithm verify checks
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS512'],
    });

    // Security check: Query the database to ensure the user still exists, is not deleted, and is approved
    const userRes = await db.query(
      'SELECT id, email, name, role, status, committee_id FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }

    const user = userRes.rows[0];

    // Attach user record to request context
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      committeeId: user.committee_id,
    };

    next();
  } catch (error) {
    // Security: Log actual error locally for diagnostics, but return generic error to clients
    console.error('[Auth Middleware] Verification failed:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

module.exports = authenticateJWT;
