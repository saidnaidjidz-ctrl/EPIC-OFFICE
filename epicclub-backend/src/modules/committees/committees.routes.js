const express = require('express');
const committeesController = require('./committees.controller');
const authenticateJWT      = require('../../middleware/auth');
const { requireRole }      = require('../../middleware/rbac');
const validate             = require('../../middleware/validate');
const {
  createCommitteeValidation,
  updateCommitteeValidation,
  idValidation,
  addMemberValidation,
  memberPathValidation,
  membersQueryValidation,
} = require('./committees.validation');

const router = express.Router();

// All committee routes require a valid, approved session
router.use(authenticateJWT);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/committees
 * @desc   Create a new committee (optionally with a leader)
 * @access President only
 */
router.post(
  '/',
  requireRole('president'),
  ...createCommitteeValidation,
  validate,
  committeesController.create
);

/**
 * @route  GET /api/committees
 * @desc   List all committees with stats and leader info
 * @access All approved users
 */
router.get('/', committeesController.getAll);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE COMMITTEE ROUTES  — id param
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/committees/:id
 * @desc   Detailed committee view (members, tasks, stats)
 * @access President | Committee Leader (own committee)
 */
router.get(
  '/:id',
  ...idValidation,
  validate,
  committeesController.getById
);

/**
 * @route  PATCH /api/committees/:id
 * @desc   Update name, description, or leader
 * @access President only
 */
router.patch(
  '/:id',
  requireRole('president'),
  ...updateCommitteeValidation,
  validate,
  committeesController.update
);

/**
 * @route  DELETE /api/committees/:id
 * @desc   Delete committee (409 if active tasks exist)
 * @access President only
 */
router.delete(
  '/:id',
  requireRole('president'),
  ...idValidation,
  validate,
  committeesController.remove
);

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER SUB-ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/committees/:id/members
 * @desc   Paginated list of committee members
 * @access President | Committee Leader (own committee)
 */
router.get(
  '/:id/members',
  requireRole('president', 'committee_leader'),
  ...membersQueryValidation,
  validate,
  committeesController.getMembers
);

/**
 * @route  POST /api/committees/:id/members
 * @desc   Add an approved user to a committee
 * @access President only
 */
router.post(
  '/:id/members',
  requireRole('president'),
  ...addMemberValidation,
  validate,
  committeesController.addMember
);

/**
 * @route  DELETE /api/committees/:id/members/:userId
 * @desc   Remove a user from a committee
 * @access President only
 */
router.delete(
  '/:id/members/:userId',
  requireRole('president'),
  ...memberPathValidation,
  validate,
  committeesController.removeMember
);

module.exports = router;
