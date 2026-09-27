'use client';

import React from 'react';
import { 
  MapPin, 
  Video, 
  Users, 
  ExternalLink,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Meeting } from '@/types';

// Helper to format dates beautifully in Arabic
function formatMeetingTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
    const dayNum = date.toLocaleDateString('en-US', { day: 'numeric' });
    const month = date.toLocaleDateString('ar-EG', { month: 'short' });
    const time = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return { dayName, dayNum, month, time };
  } catch {
    return { dayName: 'غير محدد', dayNum: '--', month: '', time: '--:--' };
  }
}

interface UpcomingMeetingsProps {
  meetings: Meeting[];
}

export default function UpcomingMeetings({ meetings = [] }: UpcomingMeetingsProps) {
  return (
    <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full min-h-[350px]">
      <div className="flex justify-between items-center border-b border-[#CFE8ED] pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">الاجتماعات القادمة</h3>
          <p className="text-xs text-[#66858F]">جلسات المزامنة واللقاءات الدورية المجدولة</p>
        </div>
        <span className="badge bg-[#2DC5D9]/20 text-[#173B47] border border-[#2DC5D9]/40 text-xs font-bold px-2.5 py-1">
          {meetings.length} اجتماع
        </span>
      </div>

      {meetings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="p-4 rounded-full bg-[#F0F8FA] border border-[#CFE8ED] text-[#66858F] mb-3">
            <Calendar className="w-6 h-6 text-[#2DC5D9]" />
          </div>
          <span className="text-sm font-medium text-[#66858F]">لا توجد اجتماعات مجدولة حالياً</span>
        </div>
      ) : (
        <div className="flex-grow flex flex-col gap-3.5 overflow-y-auto max-h-[380px] hide-scrollbar pl-1">
          {meetings.slice(0, 5).map((meeting) => {
            const { dayName, dayNum, month, time } = formatMeetingTime(meeting.scheduled_at);
            const isOnline = !!meeting.meeting_link;

            return (
              <div 
                key={meeting.id}
                className="group flex gap-4 p-4 rounded-2xl bg-[#F0F8FA] border border-[#CFE8ED]/70 hover:border-[#2DC5D9]/60 hover:bg-[#F5FBFD] transition-all duration-200 relative overflow-hidden"
              >
                {/* Visual marker line on RTL right side */}
                <div className={`absolute top-0 right-0 bottom-0 w-1 ${isOnline ? 'bg-[#2DC5D9]' : 'bg-[#7F91FF]'}`} />
                
                {/* Time Badge (Right side in RTL) */}
                <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-white border border-[#CFE8ED] w-20 text-center flex-shrink-0 shadow-2xs">
                  <span className="text-[11px] font-bold text-[#66858F]">{dayName}</span>
                  <span className="text-lg font-black text-[#2DC5D9] leading-none my-1 font-jakarta">{dayNum}</span>
                  <span className="text-[10px] font-semibold text-[#173B47]">{month}</span>
                </div>

                {/* Info Container */}
                <div className="flex flex-col flex-grow min-w-0 justify-between">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-bold text-[#173B47] truncate group-hover:text-[#2DC5D9] transition-colors duration-200">
                      {meeting.title}
                    </h4>
                    {meeting.description && (
                      <p className="text-xs text-[#66858F] line-clamp-1 mt-0.5">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-[#66858F] font-medium border-t border-[#CFE8ED]/40 pt-2 font-cairo">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#2DC5D9]" />
                      <span>{time}</span>
                    </div>

                    {isOnline ? (
                      <a 
                        href={meeting.meeting_link || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#2DC5D9] hover:underline transition-colors font-semibold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>اجتماع عن بُعد</span>
                        <ExternalLink className="w-2.5 h-2.5 mr-0.5" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#7F91FF]" />
                        <span className="truncate max-w-[140px]">
                          {meeting.location || 'مقر النادي الرئيسي'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mr-auto">
                      <Users className="w-3.5 h-3.5 text-[#66858F]" />
                      <span className="font-jakarta">{meeting.attendee_count || 0} مشارك</span>
                    </div>
                  </div>
                </div>

                {/* Hover arrow indicator in RTL */}
                <div className="self-center text-[#66858F] opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all duration-200">
                  <ChevronLeft className="w-5 h-5 text-[#2DC5D9]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
