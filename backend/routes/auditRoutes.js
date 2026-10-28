// backend/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// View system audit trail
router.get('/', auditController.getAuditLogs);

module.exports = router;
