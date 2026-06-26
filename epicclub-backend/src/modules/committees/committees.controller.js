const committeesService = require('./committees.service');

/**
 * Controller for all Committee REST operations.
 */
class CommitteesController {
  /**
   * Creates a new committee.
   * Automatically promotes the supplied leader_id to 'committee_leader' role.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const { name, description, leader_id } = req.body;
      const committee = await committeesService.createCommittee({ name, description, leader_id });

      return res.status(201).json({
        success: true,
        message: 'Committee created successfully',
        committee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists all committees with member count, task stats, and leader info.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getAll(req, res, next) {
    try {
      const committees = await committeesService.getAllCommittees();
      return res.status(200).json({
        success: true,
        count: committees.length,
        committees,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns detailed view of a single committee:
   * stats, leader, members list, recent tasks.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committeeId } = req.user;

      // Committee leaders can only view their own committee
      if (role === 'committee_leader' && id !== committeeId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }

      const committee = await committeesService.getCommitteeById(id);
      if (!committee) {
        return res.status(404).json({ success: false, message: 'Committee not found' });
      }

      return res.status(200).json({ success: true, committee });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a committee's name, description, or leader.
   * Leader change triggers role promotion/demotion atomically.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const committee = await committeesService.updateCommittee(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Committee updated successfully',
        committee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a committee.
   * Returns 409 if non-completed tasks exist — includes the blocking task list.
   * Otherwise nullifies member assignments and removes the committee.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const result = await committeesService.deleteCommittee(id);

      // Active tasks are blocking the deletion
      if (result.blocked) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete committee: ${result.tasks.length} active task(s) must be completed or removed first`,
          blocking_tasks: result.tasks,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Committee deleted successfully',
        committee: result.committee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns paginated list of committee members.
   * Accessible by president (any committee) or committee_leader (own only).
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getMembers(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committeeId } = req.user;
      const { page = 1, limit = 20 } = req.query;

      // Leaders scoped to own committee
      if (role === 'committee_leader' && id !== committeeId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }

      const result = await committeesService.getMembers(id, page, limit);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adds an approved user to a committee.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      const user = await committeesService.addMember(id, user_id);
      return res.status(200).json({
        success: true,
        message: 'Member added to committee successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Removes a user from a committee (sets committee_id → NULL).
   * Automatically demotes committee_leader back to member.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async removeMember(req, res, next) {
    try {
      const { id, userId } = req.params;

      const user = await committeesService.removeMember(id, userId);
      return res.status(200).json({
        success: true,
        message: 'Member removed from committee successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommitteesController();
