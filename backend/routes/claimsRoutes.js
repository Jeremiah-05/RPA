// backend/routes/claimsRoutes.js
const express = require('express');
const router = express.Router();
const claimsController = require('../controllers/claimsController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All claims routes require active JWT authentication
router.use(authenticateToken);

// Dashboard statistics
router.get('/stats/summary', claimsController.getDashboardStats);

// List claims with search and filters
router.get('/', claimsController.getAllClaims);

// Fetch single claim with verification history and audit trail
router.get('/:id', claimsController.getClaimById);

// Submit new claim with receipt file attachment
router.post('/', upload.single('receipt'), claimsController.createClaim);

// Bulk import claims via Excel (.xlsx, .xls) or CSV spreadsheet
router.post('/bulk-import', upload.single('file'), claimsController.bulkImportClaims);

// Edit an existing claim (allowed only if 'Submitted' or 'Needs Correction')
router.put('/:id', upload.single('receipt'), claimsController.updateClaim);

// Admin review: Approve, Reject, or Request Correction
router.patch('/:id/review', requireAdmin, claimsController.reviewClaim);

// Admin AI Advisory Note generation (cached)
router.post('/:id/ai-summary', requireAdmin, claimsController.getClaimAiSummary);

module.exports = router;
