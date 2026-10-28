// backend/routes/monitoringRoutes.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const { getMonitoringSummary, getMonitoringRuns } = require('../controllers/monitoringController');

// All monitoring routes require Admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/monitoring/summary
router.get('/summary', getMonitoringSummary);

// GET /api/monitoring/runs
router.get('/runs', getMonitoringRuns);

module.exports = router;

