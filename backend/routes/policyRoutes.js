// backend/routes/policyRoutes.js
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

// All users can view active policies
router.get('/', policyController.getAllPolicies);

// Policy configuration modifications are restricted to Admin
router.post('/', requireAdmin, policyController.createPolicy);
router.put('/:id', requireAdmin, policyController.updatePolicy);
router.delete('/:id', requireAdmin, policyController.deletePolicy);

module.exports = router;
