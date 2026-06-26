const express = require('express');
const { query, param } = require('express-validator');
const dashboardController = require('./dashboard.controller');
const authenticateJWT = require('../../middleware/auth');
const { dashboardLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');

const router = express.Router();

// Enforce authentication on all dashboard/analytics routes
router.use(authenticateJWT);

// Apply specific Dashboard Rate Limiting (30 requests/minute)
router.use(dashboardLimiter);

/**
 * @route GET /api/dashboard/stats
 * @desc Get user-role scoped stats and analytics (cached for 60s)
 * @access Private (All Approved Users)
 */
router.get('/stats', dashboardController.getStats);

/**
 * @route GET /api/dashboard/activity-feed
 * @desc Get recent audit activity log feed (paginated, scoped)
 * @access Private (All Approved Users)
 */
router.get(
  '/activity-feed',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer >= 1')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be an integer between 1 and 20')
      .toInt(),
    validate,
  ],
  dashboardController.getActivityFeed
);

/**
 * @route GET /api/dashboard/performance/:committeeId
 * @desc Get member performance breakdown for a committee
 * @access Private (President or target Committee Leader only)
 */
router.get(
  '/performance/:committeeId',
  [
    param('committeeId')
      .isUUID()
      .withMessage('Committee ID must be a valid UUID format'),
    validate,
  ],
  dashboardController.getPerformance
);

module.exports = router;
