const dashboardService = require('./dashboard.service');

/**
 * Controller to handle Dashboard and Analytics requests with caching.
 */
class DashboardController {
  /**
   * Retrieves dashboard statistics scoped to user role.
   * Caches results for 60 seconds.
   */
  async getStats(req, res, next) {
    try {
      const user = req.user;
      const keyId = user.role === 'committee_leader' ? user.committeeId : user.id;
      const cacheKey = `stats:${user.role}:${keyId}`;

      // Try reading from cache
      const cached = await dashboardService.getCached(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          from_cache: true,
          ...cached,
        });
      }

      let data;
      if (user.role === 'president') {
        data = await dashboardService.getPresidentStats();
      } else if (user.role === 'committee_leader') {
        if (!user.committeeId) {
          return res.status(400).json({
            success: false,
            message: 'Access denied: User is not assigned to a committee.',
          });
        }
        data = await dashboardService.getLeaderStats(user.committeeId, user.id);
      } else {
        data = await dashboardService.getMemberStats(user.id);
      }

      // Write results to cache
      await dashboardService.setCached(cacheKey, data);

      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves recent paginated activity feed.
   */
  async getActivityFeed(req, res, next) {
    try {
      const user = req.user;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 20));

      const keyId = user.role === 'president' ? 'all' : (user.committeeId || 'none');
      const cacheKey = `activity:${user.role}:${keyId}:p${page}:l${limit}`;

      // Try reading cache
      const cached = await dashboardService.getCached(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          from_cache: true,
          ...cached,
        });
      }

      const result = await dashboardService.getActivityFeed(user, { page, limit });

      // Save to cache
      await dashboardService.setCached(cacheKey, result);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves member task performance metrics for a specific committee.
   * Restricted to President or that Committee's Leader.
   */
  async getPerformance(req, res, next) {
    try {
      const { committeeId } = req.params;
      const user = req.user;

      // Access control: President sees all; Leader sees their own committee only
      if (user.role !== 'president' && (user.role !== 'committee_leader' || user.committeeId !== committeeId)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden. You do not have permissions to view this committee\'s performance.',
        });
      }

      const cacheKey = `performance:${committeeId}`;

      // Check cache
      const cached = await dashboardService.getCached(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          from_cache: true,
          performance: cached,
        });
      }

      const performance = await dashboardService.getCommitteePerformance(committeeId);

      // Save to cache
      await dashboardService.setCached(cacheKey, performance);

      return res.status(200).json({
        success: true,
        performance,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
