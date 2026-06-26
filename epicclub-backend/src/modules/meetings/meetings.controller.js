const meetingsService = require('./meetings.service');

/**
 * Controller to handle REST requests for Meetings.
 */
class MeetingsController {
  /**
   * Action to schedule a new meeting.
   */
  async create(req, res, next) {
    try {
      const { title, description, scheduledAt, location, meetingLink, attendeeIds } = req.body;

      // Only president or committee leaders can host/create meetings
      if (req.user.role !== 'president' && req.user.role !== 'committee_leader') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only the president or committee leaders can schedule meetings.',
        });
      }

      const meeting = await meetingsService.createMeeting({
        title,
        description,
        createdBy: req.user.id,
        scheduledAt,
        location,
        meetingLink,
        attendeeIds,
      });

      return res.status(201).json({
        success: true,
        message: 'Meeting scheduled successfully.',
        meeting,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists all meetings.
   */
  async getAll(req, res, next) {
    try {
      const meetings = await meetingsService.getAllMeetings();
      return res.status(200).json({
        success: true,
        count: meetings.length,
        meetings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves detail info of a single meeting.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const meeting = await meetingsService.getMeetingById(id);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found.',
        });
      }

      return res.status(200).json({
        success: true,
        meeting,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancels/deletes a meeting.
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const meeting = await meetingsService.getMeetingById(id);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found.',
        });
      }

      const isPresident = req.user.role === 'president';
      const isCreator = meeting.created_by === req.user.id;

      if (!isPresident && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only the president or the meeting creator can delete this meeting.',
        });
      }

      await meetingsService.deleteMeeting(id);

      return res.status(200).json({
        success: true,
        message: 'Meeting cancelled successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registers a user as attendee (RSVP).
   */
  async addAttendee(req, res, next) {
    try {
      const { id } = req.params; // meeting_id
      const { userId } = req.body;

      const meeting = await meetingsService.getMeetingById(id);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found.',
        });
      }

      // Users can only sign up themselves, unless they are president/committee leaders
      const isPresident = req.user.role === 'president';
      const isLeader = req.user.role === 'committee_leader';
      const isSelf = userId === req.user.id;

      if (!isPresident && !isLeader && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only RSVP for yourself.',
        });
      }

      const added = await meetingsService.addAttendee(id, userId);

      return res.status(200).json({
        success: true,
        message: added ? 'Attendee added successfully.' : 'Attendee is already registered.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deregisters a user from a meeting (cancel RSVP).
   */
  async removeAttendee(req, res, next) {
    try {
      const { id } = req.params; // meeting_id
      const { userId } = req.body;

      const meeting = await meetingsService.getMeetingById(id);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found.',
        });
      }

      const isPresident = req.user.role === 'president';
      const isLeader = req.user.role === 'committee_leader';
      const isSelf = userId === req.user.id;

      if (!isPresident && !isLeader && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only remove your own RSVP.',
        });
      }

      const removed = await meetingsService.removeAttendee(id, userId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Attendee record not found for this meeting.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Attendee removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MeetingsController();
