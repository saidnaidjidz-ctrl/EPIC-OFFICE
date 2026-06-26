const db = require('../../config/db');

/**
 * Service to execute database operations on meetings and meeting_attendees.
 */
class MeetingsService {
  /**
   * Creates a meeting and assigns initial attendees atomically within a transaction.
   */
  async createMeeting({
    title,
    description,
    createdBy,
    scheduledAt,
    location,
    meetingLink,
    attendeeIds,
  }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const meetingRes = await client.query(
        `INSERT INTO meetings (title, description, created_by, scheduled_at, location, meeting_link)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description || null, createdBy, scheduledAt, location || null, meetingLink || null]
      );
      const meeting = meetingRes.rows[0];

      // Add attendees to the junction table if provided
      if (attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
        const values = [];
        const placeholders = [];

        attendeeIds.forEach((uid, index) => {
          values.push(meeting.id, uid);
          placeholders.push(`($${index * 2 + 1}, $${index * 2 + 2})`);
        });

        const queryText = `INSERT INTO meeting_attendees (meeting_id, user_id) VALUES ${placeholders.join(', ')}`;
        await client.query(queryText, values);
      }

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      // Notify attendees about the new scheduled meeting
      if (attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
        try {
          const notificationsService = require('../notifications/notifications.service');
          for (const uid of attendeeIds) {
            await notificationsService.createNotification(
              uid,
              'meeting_scheduled',
              'New Meeting Scheduled',
              `You have been scheduled for a new meeting: "${meeting.title}" on ${new Date(meeting.scheduled_at).toLocaleString()}.`,
              { meetingId: meeting.id, scheduledAt: meeting.scheduled_at }
            );
          }
        } catch (err) {
          console.error('[Meetings Service] Failed to send meeting_scheduled notifications:', err.message);
        }
      }

      return meeting;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves list of all scheduled meetings.
   */
  async getAllMeetings() {
    const res = await db.query(
      `SELECT m.*, u.name as creator_name
       FROM meetings m
       LEFT JOIN users u ON m.created_by = u.id
       ORDER BY m.scheduled_at ASC`
    );
    return res.rows;
  }

  /**
   * Retrieves detail profile of a single meeting, merging its attendee records.
   */
  async getMeetingById(id) {
    const meetingRes = await db.query(
      `SELECT m.*, u.name as creator_name
       FROM meetings m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.id = $1`,
      [id]
    );

    if (meetingRes.rowCount === 0) return null;
    const meeting = meetingRes.rows[0];

    const attendeesRes = await db.query(
      `SELECT u.id, u.email, u.name, u.role
       FROM meeting_attendees ma
       JOIN users u ON ma.user_id = u.id
       WHERE ma.meeting_id = $1`,
      [id]
    );
    meeting.attendees = attendeesRes.rows;

    return meeting;
  }

  /**
   * Deletes a meeting.
   */
  async deleteMeeting(id) {
    // Retrieve meeting details with attendees list first
    const meeting = await this.getMeetingById(id);
    if (!meeting) return null;

    const res = await db.query('DELETE FROM meetings WHERE id = $1 RETURNING *', [id]);

    // Invalidate dashboard cache
    const dashboardService = require('../dashboard/dashboard.service');
    dashboardService.invalidateDashboardCache().catch(() => {});

    // Send notifications to all attendees
    if (meeting.attendees && Array.isArray(meeting.attendees) && meeting.attendees.length > 0) {
      try {
        const notificationsService = require('../notifications/notifications.service');
        for (const attendee of meeting.attendees) {
          await notificationsService.createNotification(
            attendee.id,
            'meeting_cancelled',
            'Meeting Cancelled',
            `The meeting "${meeting.title}" originally scheduled at ${new Date(meeting.scheduled_at).toLocaleString()} has been cancelled.`,
            { meetingId: id }
          );
        }
      } catch (err) {
        console.error('[Meetings Service] Failed to send meeting_cancelled notifications:', err.message);
      }
    }

    return res.rows[0] || null;
  }

  /**
   * Adds an attendee to a meeting.
   */
  async addAttendee(meetingId, userId) {
    const res = await db.query(
      `INSERT INTO meeting_attendees (meeting_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [meetingId, userId]
    );
    if (res.rowCount > 0) {
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});
    }
    return res.rowCount > 0;
  }

  /**
   * Removes an attendee from a meeting.
   */
  async removeAttendee(meetingId, userId) {
    const res = await db.query(
      `DELETE FROM meeting_attendees
       WHERE meeting_id = $1 AND user_id = $2
       RETURNING *`,
      [meetingId, userId]
    );
    if (res.rowCount > 0) {
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});
    }
    return res.rowCount > 0;
  }
}

module.exports = new MeetingsService();
