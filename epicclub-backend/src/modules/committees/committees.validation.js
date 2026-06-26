const { body, param, query } = require('express-validator');

/** Strip HTML tags from a string value. */
const stripHTML = (val) =>
  typeof val === 'string' ? val.replace(/<\/?[^>]+(>|$)/g, '').trim() : val;

/**
 * Validation rules for creating a committee.
 */
const createCommitteeValidation = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('Committee name is required')
    .isString().withMessage('Name must be a string')
    .customSanitizer(stripHTML)
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .customSanitizer(stripHTML)
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('leader_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID().withMessage('Leader ID must be a valid UUID'),
];

/**
 * Validation rules for updating a committee (all fields optional).
 */
const updateCommitteeValidation = [
  param('id').isUUID().withMessage('Committee ID must be a valid UUID'),

  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .customSanitizer(stripHTML)
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .isString().withMessage('Description must be a string')
    .customSanitizer(stripHTML)
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('leader_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID().withMessage('Leader ID must be a valid UUID'),
];

/**
 * Validate UUID path parameter :id.
 */
const idValidation = [
  param('id').isUUID().withMessage('Committee ID must be a valid UUID'),
];

/**
 * Validate member add body: { user_id: UUID }.
 */
const addMemberValidation = [
  param('id').isUUID().withMessage('Committee ID must be a valid UUID'),
  body('user_id')
    .exists({ checkFalsy: true }).withMessage('User ID is required')
    .isUUID().withMessage('User ID must be a valid UUID'),
];

/**
 * Validate :id and :userId path params.
 */
const memberPathValidation = [
  param('id').isUUID().withMessage('Committee ID must be a valid UUID'),
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
];

/**
 * Pagination query params for members list.
 */
const membersQueryValidation = [
  param('id').isUUID().withMessage('Committee ID must be a valid UUID'),
  query('page')
    .optional().isInt({ min: 1 }).withMessage('Page must be >= 1').toInt(),
  query('limit')
    .optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1–50').toInt(),
];

module.exports = {
  createCommitteeValidation,
  updateCommitteeValidation,
  idValidation,
  addMemberValidation,
  memberPathValidation,
  membersQueryValidation,
};
