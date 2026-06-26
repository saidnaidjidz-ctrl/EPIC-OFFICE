'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Clock, Plus, Users, Video, ChevronRight } from 'lucide-react';

const mockMeetings = [
  {
    id: 'm1',
    title: 'Epic Club General Sync',
    description: 'Monthly all-hands meeting to review progress across all committees.',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    location: 'Zoom Meeting',
    type: 'virtual',
    attendees: 24,
    committee: 'All Committees',
  },
  {
    id: 'm2',
    title: 'Code Architecture Sync',
    description: 'Technical committee review of current infrastructure and roadmap.',
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    location: 'Conference Room A',
    type: 'in-person',
    attendees: 8,
    committee: 'Technical Committee',
  },
  {
    id: 'm3',
    title: 'Social Event Planning',
    description: 'Plan upcoming summer meetup and networking events.',
    scheduled_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    location: 'Office Lounge',
    type: 'in-person',
    attendees: 12,
    committee: 'Social Committee',
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function MeetingsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Meetings</h1>
          <p className="text-sm text-text-secondary mt-0.5">Upcoming club meetings and events</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      {/* Meetings Grid */}
      <div className="grid gap-4">
        {mockMeetings.map((meeting, i) => (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card-glass p-5 flex items-start gap-5 group hover:border-secondary/30 transition-all cursor-pointer"
          >
            {/* Date Block */}
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-secondary uppercase">
                {new Date(meeting.scheduled_at).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-xl font-black text-text-primary leading-none">
                {new Date(meeting.scheduled_at).getDate()}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-text-primary text-sm group-hover:text-secondary transition-colors">
                  {meeting.title}
                </h3>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  meeting.type === 'virtual'
                    ? 'bg-accent/10 text-accent border-accent/20'
                    : 'bg-success/10 text-success border-success/20'
                }`}>
                  {meeting.type === 'virtual' ? '🌐 Virtual' : '📍 In-Person'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 line-clamp-1">{meeting.description}</p>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Clock className="w-3 h-3" />
                  {formatDate(meeting.scheduled_at)} · {formatTime(meeting.scheduled_at)}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  {meeting.type === 'virtual' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  {meeting.location}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Users className="w-3 h-3" />
                  {meeting.attendees} attendees
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-text-secondary/40 group-hover:text-secondary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
          </motion.div>
        ))}
      </div>

      {/* Schedule modal placeholder */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="card-glass w-full max-w-md p-6 space-y-5 border border-white/10"
          >
            <h2 className="text-lg font-bold text-text-primary">Schedule a Meeting</h2>
            <div className="space-y-3">
              <input className="input w-full" placeholder="Meeting title" />
              <input className="input w-full" type="datetime-local" />
              <input className="input w-full" placeholder="Location / Zoom link" />
              <textarea className="input w-full resize-none h-20" placeholder="Description (optional)" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowModal(false)} className="btn-primary flex-1">Schedule</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
