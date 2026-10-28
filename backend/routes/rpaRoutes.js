// backend/routes/rpaRoutes.js
const express = require('express');
const router = express.Router();
const rpaController = require('../controllers/rpaController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

// RPA status is visible to all authenticated staff / admin
router.get('/status', rpaController.getRpaStatus);

// Triggering export, manual import, or 1-click simulation are Admin actions
router.post('/export', requireAdmin, rpaController.exportClaimsToBot);
router.post('/import', requireAdmin, rpaController.importBotResults);
router.post('/simulate', requireAdmin, rpaController.triggerBotSimulation);
router.post('/reset-batch', requireAdmin, rpaController.resetClaimsBatch);

module.exports = router;
