const { body } = require('express-validator');

/**
 * Validation rules for the Google authentication login endpoint.
 */
const googleLoginValidation = [
  body('id_token')
    .exists({ checkFalsy: true })
    .withMessage('Google ID token is required')
    .isString()
    .withMessage('Google ID token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Google ID token cannot be empty'),
];

/**
 * Validation rules for the token refresh endpoint.
 */
const refreshValidation = [
  body('refresh_token')
    .exists({ checkFalsy: true })
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Refresh token cannot be empty'),
];

/**
 * Validation rules for the logout endpoint (optional refresh token field check).
 */
const logoutValidation = [
  body('refresh_token')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string')
    .trim(),
];

/**
 * Validation rules for standard email/password registration.
 */
const registerValidation = [
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Validation rules for standard email/password login.
 */
const credentialsLoginValidation = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .notEmpty()
    .withMessage('Password cannot be empty'),
];

module.exports = {
  googleLoginValidation,
  refreshValidation,
  logoutValidation,
  registerValidation,
  credentialsLoginValidation,
};

