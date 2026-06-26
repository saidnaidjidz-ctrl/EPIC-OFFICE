'use client';

import React from 'react';
import { Users, CheckSquare, Crown, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import type { Committee } from '@/types';

interface CommitteeCardProps {
  committee: Committee;
  canEdit?: boolean;
  onView: (committee: Committee) => void;
  onEdit?: (committee: Committee) => void;
  onDelete?: (committee: Committee) => void;
}

const COMMITTEE_GRADIENTS = [
  'from-blue-500/20 to-cyan-500/20',
  'from-purple-500/20 to-pink-500/20',
  'from-emerald-500/20 to-teal-500/20',
  'from-orange-500/20 to-red-500/20',
  'from-indigo-500/20 to-blue-500/20',
  'from-rose-500/20 to-orange-500/20',
];

const COMMITTEE_BORDERS = [
  'border-blue-500/30',
  'border-purple-500/30',
  'border-emerald-500/30',
  'border-orange-500/30',
  'border-indigo-500/30',
  'border-rose-500/30',
];

export default function CommitteeCard({
  committee,
  canEdit = false,
  onView,
  onEdit,
  onDelete,
}: CommitteeCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  
  // Stable gradient based on committee id
  const gradientIdx = committee.id
    ? committee.id.charCodeAt(0) % COMMITTEE_GRADIENTS.length
    : 0;

  // Close menu on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const initials = committee.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`card-glass border ${COMMITTEE_BORDERS[gradientIdx]} p-6 flex flex-col gap-4 group hover:scale-[1.01] transition-all duration-300 cursor-pointer`}
      onClick={() => onView(committee)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {/* Avatar */}
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${COMMITTEE_GRADIENTS[gradientIdx]} flex items-center justify-center text-lg font-extrabold text-text-primary border border-white/10 flex-shrink-0`}
        >
          {initials}
        </div>

        {/* Menu (president/leader only) */}
        {canEdit && (
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Committee options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 card-glass border border-white/10 rounded-xl shadow-xl py-1 z-20 animate-fade-in">
                <button
                  onClick={() => { setMenuOpen(false); onView(committee); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
                {onEdit && (
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(committee); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(committee); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name + Description */}
      <div className="flex flex-col gap-1 flex-1">
        <h3 className="text-base font-bold text-text-primary leading-tight line-clamp-1">
          {committee.name}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
          {committee.description || 'No description provided.'}
        </p>
      </div>

      {/* Leader */}
      {committee.leader && (
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <Crown className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <span className="text-xs text-text-secondary">Leader:</span>
          <span className="text-xs font-semibold text-text-primary truncate">
            {committee.leader.name}
          </span>
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Users className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">{committee.member_count}</span>
          <span className="text-xs">members</span>
        </div>

        {/* Joined date */}
        <div className="ml-auto">
          <span className="text-xs text-text-secondary">
            {new Date(committee.created_at).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
