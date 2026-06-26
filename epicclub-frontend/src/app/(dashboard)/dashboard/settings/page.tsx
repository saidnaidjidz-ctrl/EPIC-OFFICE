'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Bell, Save, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [notifications, setNotifications] = useState({
    task_assigned: true,
    meeting_scheduled: true,
    committee_updates: false,
    email_digest: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
          <Settings className="w-6 h-6 text-secondary" /> Settings
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage your profile and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-6 space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <User className="w-4 h-4 text-secondary" />
          <h2 className="font-bold text-text-primary">Profile Information</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-black text-white border border-white/10">
            {form.name ? form.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'EC'}
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">{form.name || 'Your Name'}</p>
            <p className="text-xs text-text-secondary capitalize">{user?.role?.replace('_', ' ') || 'member'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Email Address</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-text-secondary">Bio</label>
            <textarea className="input resize-none h-20" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-glass p-6 space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Bell className="w-4 h-4 text-accent" />
          <h2 className="font-bold text-text-primary">Notifications</h2>
        </div>
        <div className="space-y-3">
          {(Object.entries(notifications) as [string, boolean][]).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-text-primary capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {key === 'task_assigned' && 'When a new task is assigned to you'}
                  {key === 'meeting_scheduled' && 'When a meeting is scheduled'}
                  {key === 'committee_updates' && 'Committee news and updates'}
                  {key === 'email_digest' && 'Weekly email summary of activity'}
                </p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, [key]: !enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-secondary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 px-6 py-2.5 transition-all ${saved ? 'bg-success hover:bg-success' : ''}`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </motion.div>
    </div>
  );
}
