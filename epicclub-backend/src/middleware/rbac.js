/**
 * Factory middleware to check user roles and approval statuses.
 * Rejects requests if credentials or status requirements are not satisfied.
 * 
 * @param {...string} allowedRoles - List of roles permitted to call the endpoint
 * @returns {import('express').RequestHandler} Role check middleware handler
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    // Security checks: Check if user status is exactly approved
    if (req.user.status !== 'approved') {
      console.warn(`[RBAC Middleware] Access blocked: User ${req.user.id} has status '${req.user.status}'`);
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    // Check if user role matches allowed designations
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC Middleware] Access blocked: User role '${req.user.role}' is not in allowed roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
};
