// backend/middleware/roleMiddleware.js

// Restrict route access to specific user roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin: requireRole('admin'),
  requireEmployee: requireRole('employee', 'admin') // Admins can also perform employee actions
};
