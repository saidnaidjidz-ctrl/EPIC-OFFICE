const express = require('express');
const usersController = require('./users.controller');
const authenticateJWT = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const validate = require('../../middleware/validate');

const {
  listUsersValidation,
  idValidation,
  approveValidation,
  rejectValidation,
  updateRoleValidation,
} = require('./users.validation');

const router = express.Router();

// Protect all users management routes with authentication
router.use(authenticateJWT);

/**
 * @route GET /api/users
 * @desc Retrieve paginated and filtered users list
 * @access Private (President Only)
 */
router.get(
  '/',
  [
    requireRole('president'),
    ...listUsersValidation,
    validate,
  ],
  usersController.getUsers
);

/**
 * @route GET /api/users/pending
 * @desc Retrieve registrations awaiting administrative approval
 * @access Private (President Only)
 */
router.get(
  '/pending',
  [
    requireRole('president'),
  ],
  usersController.getPending
);

/**
 * @route GET /api/users/:id
 * @desc Retrieve user profile details
 * @access Private (President or Self)
 */
router.get(
  '/:id',
  [
    ...idValidation,
    validate,
  ],
  usersController.getUserById
);

/**
 * @route PATCH /api/users/:id/approve
 * @desc Approve a pending user request
 * @access Private (President Only)
 */
router.patch(
  '/:id/approve',
  [
    requireRole('president'),
    ...approveValidation,
    validate,
  ],
  usersController.approve
);

/**
 * @route PATCH /api/users/:id/reject
 * @desc Reject a pending user request
 * @access Private (President Only)
 */
router.patch(
  '/:id/reject',
  [
    requireRole('president'),
    ...rejectValidation,
    validate,
  ],
  usersController.reject
);

/**
 * @route PATCH /api/users/:id/role
 * @desc Update user role and committee assignments
 * @access Private (President Only)
 */
router.patch(
  '/:id/role',
  [
    requireRole('president'),
    ...updateRoleValidation,
    validate,
  ],
  usersController.updateRole
);

/**
 * @route DELETE /api/users/:id
 * @desc Soft delete a user and revoke active sessions
 * @access Private (President Only)
 */
router.delete(
  '/:id',
  [
    requireRole('president'),
    ...idValidation,
    validate,
  ],
  usersController.deleteUser
);

module.exports = router;
