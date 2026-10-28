// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_expense_rpa_2026_secure_key';
    const decoded = jwt.verify(token, secret);
    
    // Attach user payload to request
    // decoded contains: { id, email, role, name, department }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication session expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

module.exports = authenticateToken;
