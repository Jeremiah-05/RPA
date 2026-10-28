// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected user routes
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;
