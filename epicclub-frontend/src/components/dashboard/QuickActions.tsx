'use client';

import React from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  CalendarPlus, 
  Users, 
  CheckSquare, 
  BellRing, 
  FolderKanban,
  Activity,
  ArrowLeft
} from 'lucide-react';
import type { UserRole } from '@/types';

interface QuickActionTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
}

function QuickActionTile({ title, description, icon, href, colorClass }: QuickActionTileProps) {
  return (
    <Link href={href} className="group relative block rounded-2xl border border-[#CFE8ED] bg-[#F0F8FA] p-4 transition-all duration-200 hover:border-[#2DC5D9] hover:bg-[#F5FBFD] shadow-2xs">
      <div className="flex gap-3.5 items-start">
        <div className={`p-3 rounded-xl ${colorClass} shadow-sm flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-sm font-bold text-[#173B47] group-hover:text-[#2DC5D9] transition-colors duration-200 font-cairo">
              {title}
            </span>
            <ArrowLeft className="w-3.5 h-3.5 text-[#66858F] opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </div>
          <span className="text-[11px] text-[#66858F] mt-1 font-medium leading-relaxed font-cairo">
            {description}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface QuickActionsProps {
  role: UserRole;
}

export default function QuickActions({ role }: QuickActionsProps) {
  const isLeader = role === 'president' || role === 'committee_leader';

  return (
    <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full">
      <div className="flex flex-col gap-1 border-b border-[#CFE8ED] pb-4">
        <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">إجراءات سريعة</h3>
        <p className="text-xs text-[#66858F]">روابط مباشرة لأبرز العمليات اليومية</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-3.5">
        {isLeader ? (
          <>
            <QuickActionTile 
              title="إضافة مهمة جديدة" 
              description="تكليف عضو في اللجنة بمهمة محددة" 
              icon={<PlusCircle className="w-5 h-5 text-white" />} 
              href="/dashboard/tasks" 
              colorClass="bg-[#2DC5D9]"
            />
            <QuickActionTile 
              title="جدولة اجتماع" 
              description="تنظيم لقاء حضوري أو افتراضي" 
              icon={<CalendarPlus className="w-5 h-5 text-white" />} 
              href="/dashboard/meetings" 
              colorClass="bg-[#38C9D8]"
            />
            <QuickActionTile 
              title="مركز اللجان" 
              description="متابعة أداء الفرق وهيكلة الأعضاء" 
              icon={<FolderKanban className="w-5 h-5 text-[#173B47]" />} 
              href="/dashboard/committees" 
              colorClass="bg-[#CFE8ED]"
            />
            <QuickActionTile 
              title="سجل التدقيق" 
              description="استعراض العمليات وإجراءات النظام" 
              icon={<Activity className="w-5 h-5 text-[#7F91FF]" />} 
              href="/dashboard/audit" 
              colorClass="bg-[#7F91FF]/15 border border-[#7F91FF]/30"
            />
          </>
        ) : (
          <>
            <QuickActionTile 
              title="لوحة مهامي" 
              description="متابعة وتحديث حالات المهام المسندة" 
              icon={<CheckSquare className="w-5 h-5 text-white" />} 
              href="/dashboard/tasks" 
              colorClass="bg-[#2DC5D9]"
            />
            <QuickActionTile 
              title="جدول الاجتماعات" 
              description="الاطلاع على المواعيد وتأكيد الحضور" 
              icon={<CalendarPlus className="w-5 h-5 text-white" />} 
              href="/dashboard/meetings" 
              colorClass="bg-[#38C9D8]"
            />
            <QuickActionTile 
              title="لجان النادي" 
              description="استعراض اللجان والتواصل مع الفرق" 
              icon={<Users className="w-5 h-5 text-[#173B47]" />} 
              href="/dashboard/committees" 
              colorClass="bg-[#CFE8ED]"
            />
            <QuickActionTile 
              title="مركز التنبيهات" 
              description="استعراض كافة الإشعارات والتحديثات" 
              icon={<BellRing className="w-5 h-5 text-[#7F91FF]" />} 
              href="/dashboard/notifications" 
              colorClass="bg-[#7F91FF]/15 border border-[#7F91FF]/30"
            />
          </>
        )}
      </div>
    </div>
  );
}
