// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

// Download executive Excel report (Admin only)
router.get('/export', requireAdmin, reportController.exportReportsExcel);

module.exports = router;
