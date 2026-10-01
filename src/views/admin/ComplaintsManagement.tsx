import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Complaint, HostelSettings } from '../../types';
import {
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Wrench,
  X,
  Plus,
  MessageSquare,
  AlertTriangle,
  Send,
} from 'lucide-react';

export const ComplaintsManagement: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [assignedStaff, setAssignedStaff] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState<Complaint['status']>('In Progress');
  const [createMaintenance, setCreateMaintenance] = useState(false);
  const [maintenanceCost, setMaintenanceCost] = useState(500);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchRes = c.residentName.toLowerCase().includes(q);
      const matchRoom = c.roomNumber.toLowerCase().includes(q);
      if (!matchTitle && !matchRes && !matchRoom) return false;
    }
    return true;
  });

  const handleOpenAction = (c: Complaint) => {
    setActiveComplaint(c);
    setNewStatus(c.status);
    setAssignedStaff(c.assignedTo || 'Ramesh Electrical Services');
    setAdminReply(c.adminResponse || '');
  };

  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    try {
      await api.updateComplaint(activeComplaint.id, {
        status: newStatus,
        assignedTo: assignedStaff,
        adminResponse: adminReply,
        createMaintenanceRecord: createMaintenance,
        estimatedCost: maintenanceCost,
        note: adminReply,
      });
      setActiveComplaint(null);
      await loadComplaints();
      alert('Complaint ticket updated and resident notified!');
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    }
  };

  const getPriorityBadge = (p: Complaint['priority']) => {
    switch (p) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusBadge = (s: Complaint['status']) => {
    switch (s) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Closed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-indigo-600" />
          Complaints & Issue Resolution Hub
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Real-time ticketing system for maintenance requests, room repairs, Wi-Fi, electricity, plumbing, and cleaning.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Ticket Statuses</option>
            <option value="Submitted">Submitted (New)</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="Electricity">Electricity</option>
            <option value="Plumbing">Plumbing / Water</option>
            <option value="Wi-Fi">Wi-Fi & Internet</option>
            <option value="Cleaning">Cleaning & Hygiene</option>
            <option value="Food">Food & Mess</option>
            <option value="Furniture">Furniture</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search complaint, room, or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {filteredComplaints.length > 0 ? (
          filteredComplaints.map((c) => (
            <div
              key={c.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700">{c.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getPriorityBadge(c.priority)}`}>
                    {c.priority} Priority
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {c.category}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{c.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>
                    Reported by: <b className="text-slate-700">{c.residentName}</b>
                  </span>
                  <span>•</span>
                  <span>
                    Location: <b className="text-indigo-700">Room {c.roomNumber} (Floor {c.floor})</b>
                  </span>
                  <span>•</span>
                  <span>Date: {new Date(c.createdAt).toLocaleDateString()}</span>
                  {c.assignedTo && (
                    <>
                      <span>•</span>
                      <span>Assigned: <b className="text-slate-700">{c.assignedTo}</b></span>
                    </>
                  )}
                </div>

                {c.adminResponse && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                    <span className="font-bold">Manager Response:</span> {c.adminResponse}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => handleOpenAction(c)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  Manage Ticket
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No complaints matching current filters
          </div>
        )}
      </div>

      {/* MODAL: Manage Ticket & Assign */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Action Ticket: {activeComplaint.id}
              </h3>
              <button onClick={() => setActiveComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{activeComplaint.title}</div>
              <p className="text-slate-600">{activeComplaint.description}</p>
              <div className="text-[11px] text-slate-500 pt-1">
                Room {activeComplaint.roomNumber} • Tenant: {activeComplaint.residentName}
              </div>
            </div>

            <form onSubmit={handleUpdateComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Update Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Submitted">Submitted (New)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Staff / Contractor</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Electrician / Shankar Plumber"
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reply / Update to Tenant</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Electrician scheduled to inspect tomorrow at 10 AM."
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Work order checkbox */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createMaintenance}
                    onChange={(e) => setCreateMaintenance(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Create Maintenance Log & Track Repair Cost</span>
                </label>

                {createMaintenance && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Estimated Repair Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={maintenanceCost}
                      onChange={(e) => setMaintenanceCost(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveComplaint(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save & Update Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
