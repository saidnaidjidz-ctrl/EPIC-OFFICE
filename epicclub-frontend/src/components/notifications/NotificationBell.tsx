'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import { AnimatePresence, motion } from 'framer-motion';

export default function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);

  // Hook handles unread notifications caching and SSE stream
  const { unreadCount } = useNotifications();
  const prevCountRef = useRef(unreadCount);

  // Trigger bounce animation when unreadCount increases
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const closeDropdown = () => setDropdownOpen(false);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <motion.button
        onClick={toggleDropdown}
        animate={shouldPulse ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, 15, -15, 10, -10, 0] } : {}}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className={`p-2 rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors duration-200 focus:outline-none relative ${
          dropdownOpen ? 'bg-surface-2 text-text-primary' : ''
        }`}
        aria-label="Open notifications"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-extrabold text-white ring-2 ring-surface animate-fade-in shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Floating Dropdown Card */}
      <AnimatePresence>
        {dropdownOpen && <NotificationDropdown onClose={closeDropdown} />}
      </AnimatePresence>
    </div>
  );
}
