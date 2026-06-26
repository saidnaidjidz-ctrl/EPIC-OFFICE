'use client';

import React from 'react';
import { 
  MapPin, 
  Video, 
  Users, 
  ExternalLink,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import type { Meeting } from '@/types';

// Helper to format dates beautifully
function formatMeetingTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { day, time };
  } catch {
    return { day: 'Unknown Date', time: 'Unknown Time' };
  }
}

interface UpcomingMeetingsProps {
  meetings: Meeting[];
}

export default function UpcomingMeetings({ meetings = [] }: UpcomingMeetingsProps) {
  return (
    <div className="card-glass p-6 flex flex-col gap-6 h-full min-h-[350px]">
      <div className="flex justify-between items-center border-b border-border/50 pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-text-primary">Upcoming Meetings</h3>
          <p className="text-xs text-text-secondary">Scheduled syncs and conferences</p>
        </div>
        <span className="badge-primary text-2xs font-semibold px-2 py-1">
          {meetings.length} Total
        </span>
      </div>

      {meetings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="p-4 rounded-full bg-surface-2 border border-border/50 text-text-secondary mb-3">
            <Calendar className="w-6 h-6 opacity-60" />
          </div>
          <span className="text-sm font-medium text-text-secondary">No upcoming meetings scheduled</span>
        </div>
      ) : (
        <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[380px] hide-scrollbar pr-1">
          {meetings.slice(0, 5).map((meeting) => {
            const { day, time } = formatMeetingTime(meeting.scheduled_at);
            const isOnline = !!meeting.meeting_link;

            return (
              <div 
                key={meeting.id}
                className="group flex gap-4 p-4 rounded-2xl bg-surface-2/30 border border-border/30 hover:border-border/80 hover:bg-surface-2/50 transition-all duration-300 relative overflow-hidden"
              >
                {/* Visual marker line */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${isOnline ? 'bg-accent' : 'bg-secondary'}`} />
                
                {/* Time Badge (Left side) */}
                <div className="flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-surface-2 border border-border/60 w-20 text-center flex-shrink-0">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{day.split(' ')[0]}</span>
                  <span className="text-lg font-extrabold text-accent leading-none my-1">{day.split(' ')[2]}</span>
                  <span className="text-2xs font-semibold text-text-secondary">{day.split(' ')[1]}</span>
                </div>

                {/* Info Container */}
                <div className="flex flex-col flex-grow min-w-0 justify-between">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors duration-200">
                      {meeting.title}
                    </h4>
                    {meeting.description && (
                      <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-2xs text-text-secondary font-medium border-t border-border/20 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent" />
                      <span>{time}</span>
                    </div>

                    {isOnline ? (
                      <a 
                        href={meeting.meeting_link || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:text-secondary hover:underline transition-colors duration-150"
                      >
                        <Video className="w-3 h-3" />
                        <span>Online</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-secondary" />
                        <span className="truncate max-w-[120px]">
                          {meeting.location || 'HQ Office'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <Users className="w-3 h-3 text-text-secondary opacity-60" />
                      <span>{meeting.attendee_count || 0} attendees</span>
                    </div>
                  </div>
                </div>

                {/* Hover arrow indicator */}
                <div className="self-center text-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
