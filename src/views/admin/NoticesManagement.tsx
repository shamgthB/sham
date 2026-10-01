import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Notice } from '../../types';
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  Layers,
  DoorClosed,
  Calendar,
  X,
  Pin,
  Check,
} from 'lucide-react';

export const NoticesManagement: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetAudience: 'All Residents' as Notice['targetAudience'],
    targetFloor: 1,
    targetRoomNumber: '101',
    category: 'General' as Notice['category'],
    isPinned: false,
    expiryDate: '',
  });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await api.getNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createNotice({
        title: form.title,
        content: form.content,
        targetAudience: form.targetAudience,
        targetFloor: form.targetAudience === 'Specific Floor' ? Number(form.targetFloor) : undefined,
        targetRoomNumber: form.targetAudience === 'Specific Room' ? form.targetRoomNumber : undefined,
        category: form.category,
        isPinned: form.isPinned,
        expiryDate: form.expiryDate || undefined,
      });
      setIsCreateModalOpen(false);
      setForm({
        title: '',
        content: '',
        targetAudience: 'All Residents',
        targetFloor: 1,
        targetRoomNumber: '101',
        category: 'General',
        isPinned: false,
        expiryDate: '',
      });
      await loadNotices();
      alert('Notice published to the hostel bulletin!');
    } catch (err: any) {
      alert(err.message || 'Failed to publish notice');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to remove this notice?')) return;
    try {
      await api.deleteNotice(id);
      await loadNotices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete notice');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            Hostel Notice Board & Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast official updates to all residents or deliver targeted alerts to specific floors or rooms.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Announcement
        </button>
      </div>

      {/* Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`p-6 rounded-2xl border transition-all relative flex flex-col justify-between ${
              n.isPinned
                ? 'bg-amber-50/40 border-amber-300/80 shadow-xs'
                : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {n.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      <Pin className="w-3 h-3" /> Pinned Notice
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                    {n.category}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
                    Audience: {n.targetAudience}
                    {n.targetFloor && ` (Floor ${n.targetFloor})`}
                    {n.targetRoomNumber && ` (Room ${n.targetRoomNumber})`}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteNotice(n.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">{n.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                {n.content}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Published by {n.publishedBy}</span>
              <span>{new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Create Notice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                Publish Announcement
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wi-Fi Maintenance Window"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Food & Mess">Food & Mess</option>
                    <option value="Rules & Regulations">Rules & Regulations</option>
                    <option value="Holiday / Festival">Holiday / Festival</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All Residents">All Residents</option>
                    <option value="Specific Floor">Specific Floor</option>
                    <option value="Specific Room">Specific Room</option>
                  </select>
                </div>
              </div>

              {form.targetAudience === 'Specific Floor' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Floor</label>
                  <select
                    value={form.targetFloor}
                    onChange={(e) => setForm({ ...form, targetFloor: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value={1}>Floor 1 (101–107)</option>
                    <option value={2}>Floor 2 (201–207)</option>
                    <option value={3}>Floor 3 (301–307)</option>
                  </select>
                </div>
              )}

              {form.targetAudience === 'Specific Room' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={form.targetRoomNumber}
                    onChange={(e) => setForm({ ...form, targetRoomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Announcement Body *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type notice message..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="pin" className="font-semibold text-slate-700 cursor-pointer">
                  Pin to top of resident notice board
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
