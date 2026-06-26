'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CheckSquare,
  ClipboardList,
  CalendarDays,
  Bell,
  FolderKanban,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role || 'member';

  const navItems = React.useMemo(() => {
    const items = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <Home className="w-5 h-5" />,
      },
    ];

    if (role === 'president') {
      items.push(
        {
          label: 'Tasks',
          href: '/dashboard/tasks',
          icon: <ClipboardList className="w-5 h-5" />,
        },
        {
          label: 'Committees',
          href: '/dashboard/committees',
          icon: <FolderKanban className="w-5 h-5" />,
        },
        {
          label: 'Meetings',
          href: '/dashboard/meetings',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          label: 'Admin',
          href: '/dashboard/users',
          icon: <Crown className="w-5 h-5" />,
        }
      );
    } else if (role === 'committee_leader') {
      items.push(
        {
          label: 'Tasks',
          href: '/dashboard/tasks',
          icon: <CheckSquare className="w-5 h-5" />,
        },
        {
          label: 'Committees',
          href: '/dashboard/committees',
          icon: <FolderKanban className="w-5 h-5" />,
        },
        {
          label: 'Meetings',
          href: '/dashboard/meetings',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          label: 'Alerts',
          href: '/dashboard/notifications',
          icon: <Bell className="w-5 h-5" />,
        }
      );
    } else {
      items.push(
        {
          label: 'Tasks',
          href: '/dashboard/tasks',
          icon: <CheckSquare className="w-5 h-5" />,
        },
        {
          label: 'Meetings',
          href: '/dashboard/meetings',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          label: 'Alerts',
          href: '/dashboard/notifications',
          icon: <Bell className="w-5 h-5" />,
        }
      );
    }

    return items;
  }, [role]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#1E293B]/95 backdrop-blur-md border-t border-white/5 md:hidden z-40 flex items-center justify-around px-2 shadow-2xl">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-2xs font-bold transition-all duration-200 gap-1 ${
              active
                ? 'text-secondary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className={`${active ? 'scale-110 text-secondary' : 'text-text-secondary'} transition-transform`}>
              {item.icon}
            </span>
            <span className="text-[10px] tracking-wide font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
