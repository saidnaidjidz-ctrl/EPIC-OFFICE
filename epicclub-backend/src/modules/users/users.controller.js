const usersService = require('./users.service');

/**
 * Controller coordinating Users Management REST interactions.
 */
class UsersController {
  /**
   * Retrieves a paginated list of users filtered by status, committee, or role.
   * Authorized: President Only.
   */
  async getUsers(req, res, next) {
    try {
      const { status, committee_id, role, page, limit } = req.query;
      const result = await usersService.getAllUsers({
        status,
        committee_id,
        role,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves user profile details.
   * Authorized: President, or Self (Member/Leader checking their own page).
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const isPresident = req.user.role === 'president';
      const isSelf = req.user.id === id;

      if (!isPresident && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden',
        });
      }

      const profile = await usersService.getUserById(id);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      return res.status(200).json({
        success: true,
        user: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approves a pending user request.
   * Authorized: President Only.
   */
  async approve(req, res, next) {
    try {
      const { id } = req.params;
      const { committee_id, role } = req.body;
      const ipAddress = req.ip;

      const user = await usersService.approveUser(
        id,
        { committee_id, role },
        req.user.id,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: 'User approved successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rejects a pending user request.
   * Authorized: President Only.
   */
  async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const ipAddress = req.ip;

      const user = await usersService.rejectUser(
        id,
        { reason },
        req.user.id,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: 'User registration rejected',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an approved user's role and committee.
   * Authorized: President Only.
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committee_id } = req.body;
      const ipAddress = req.ip;

      const user = await usersService.updateUserRole(
        id,
        { role, committee_id },
        req.user.id,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft deletes a user and revokes their active sessions.
   * Authorized: President Only.
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Self deletion is forbidden',
        });
      }

      const user = await usersService.softDeleteUser(
        id,
        req.user.id,
        ipAddress
      );

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves list of all pending user requests.
   * Authorized: President Only.
   */
  async getPending(req, res, next) {
    try {
      const pendingUsers = await usersService.getPendingUsers();
      return res.status(200).json({
        success: true,
        count: pendingUsers.length,
        users: pendingUsers,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsersController();
