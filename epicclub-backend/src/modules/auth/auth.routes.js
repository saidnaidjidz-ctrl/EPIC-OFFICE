const express = require('express');
const authController = require('./auth.controller');
const authenticateJWT = require('../../middleware/auth');
const validate = require('../../middleware/validate');

// Import specific rate limiters
const {
  googleLoginLimiter,
  tokenRefreshLimiter,
  logoutLimiter,
} = require('../../middleware/rateLimiter');

// Import validation rules
const {
  googleLoginValidation,
  refreshValidation,
  logoutValidation,
  registerValidation,
  credentialsLoginValidation,
} = require('./auth.validation');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user with name, email, and password
 * @access Public
 */
router.post(
  '/register',
  [
    googleLoginLimiter,
    ...registerValidation,
    validate,
  ],
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Log in using email and password credentials
 * @access Public
 */
router.post(
  '/login',
  [
    googleLoginLimiter,
    ...credentialsLoginValidation,
    validate,
  ],
  authController.login
);

/**
 * @route POST /api/auth/google
 * @desc Verify Google ID token and log in or register user
 * @access Public
 */
router.post(
  '/google',
  [
    googleLoginLimiter,
    ...googleLoginValidation,
    validate,
  ],
  authController.googleLogin
);

/**
 * @route POST /api/auth/refresh
 * @desc Rotate refresh token and issue a new access token
 * @access Public
 */
router.post(
  '/refresh',
  [
    tokenRefreshLimiter,
    ...refreshValidation,
    validate,
  ],
  authController.refresh
);

/**
 * @route POST /api/auth/logout
 * @desc Revoke refresh token session in database
 * @access Private (Requires valid access token)
 */
router.post(
  '/logout',
  [
    authenticateJWT,
    logoutLimiter,
    ...logoutValidation,
    validate,
  ],
  authController.logout
);

/**
 * @route GET /api/auth/me
 * @desc Retrieve current authenticated user profile details
 * @access Private (Requires valid access token)
 */
router.get(
  '/me',
  [
    authenticateJWT,
  ],
  authController.getMe
);

/**
 * @route POST /api/auth/verify-email/otp
 * @desc Verify email using 6-digit OTP code
 * @access Public
 */
router.post(
  '/verify-email/otp',
  [
    googleLoginLimiter,
  ],
  authController.verifyEmailOTP
);

/**
 * @route GET /api/auth/verify-email/link
 * @desc Verify email using one-click magic link token
 * @access Public
 */
router.get(
  '/verify-email/link',
  authController.verifyEmailLink
);

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend the verification email to the user (rate-limited)
 * @access Public
 */
router.post(
  '/resend-verification',
  [
    googleLoginLimiter,
  ],
  authController.resendVerificationEmail
);

module.exports = router;
