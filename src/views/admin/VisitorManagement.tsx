import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { VisitorRequest, VisitorStatus } from '../../types';
import {
  UserCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Shield,
  FileText,
  Phone,
  MapPin,
  AlertCircle,
  Printer,
  ChevronDown,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const VisitorManagement: React.FC = () => {
  const [visitors, setVisitors] = useState<VisitorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const data = await api.getVisitorRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: dateFilter || undefined,
      });
      setVisitors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load visitors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [statusFilter, dateFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.reviewVisitorRequest(id, 'approve');
      setFeedback({ type: 'success', message: res.message || 'Visitor request approved successfully!' });
      await fetchVisitors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve request' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.reviewVisitorRequest(rejectingId, 'reject', rejectionReason.trim() || undefined);
      setFeedback({ type: 'success', message: res.message || 'Visitor request rejected.' });
      setRejectingId(null);
      setRejectionReason('');
      await fetchVisitors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject request' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.checkInVisitor(id);
      setFeedback({ type: 'success', message: res.message || 'Visitor marked as Checked In!' });
      await fetchVisitors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record check-in' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (id: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.checkOutVisitor(id);
      setFeedback({ type: 'success', message: res.message || 'Visitor marked as Checked Out!' });
      await fetchVisitors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record check-out' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered list by search query
  const filteredVisitors = visitors.filter((v) => {
    const q = searchQuery.toLowerCase();
    const vName = (v.visitorFullName || v.visitorName || '').toLowerCase();
    const rName = (v.residentName || '').toLowerCase();
    const rm = (v.roomNumber || '').toLowerCase();
    const mob = (v.visitorMobile || '').toLowerCase();
    return vName.includes(q) || rName.includes(q) || rm.includes(q) || mob.includes(q);
  });

  const pendingCount = visitors.filter((v) => v.status === 'Waiting for Approval').length;
  const insideCount = visitors.filter((v) => v.status === 'Checked In').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-indigo-600" />
            Visitor Approvals & Gate Pass Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review resident visitor pre-approval requests, verify identity documents, and record gate check-ins/check-outs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVisitors}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400">Total Requests</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{visitors.length}</div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-amber-700">Waiting for Approval</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-emerald-700">Currently Inside</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{insideCount}</div>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-indigo-700">Approved Today</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">
            {visitors.filter((v) => v.status === 'Approved').length}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search visitor, resident, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="Waiting for Approval">Waiting for Approval</option>
            <option value="Approved">Approved</option>
            <option value="Checked In">Checked In</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title="Filter by Visit Date"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-rose-600 hover:underline px-1"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Visitors Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading visitor requests...</p>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <UserCheck className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">No visitor requests match your filters</p>
            <p className="text-xs">Incoming resident requests will appear here for review and gate control.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Visitor Info</th>
                  <th className="py-3.5 px-4">Resident & Room</th>
                  <th className="py-3.5 px-4">Visit Date & Time</th>
                  <th className="py-3.5 px-4">Purpose</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((v) => {
                  const visitorName = v.visitorFullName || v.visitorName || 'Visitor';
                  const isPending = v.status === 'Waiting for Approval';
                  const isApproved = v.status === 'Approved';
                  const isCheckedIn = v.status === 'Checked In';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Visitor Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{visitorName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{v.visitorMobile}</span>
                          <span>•</span>
                          <span>{v.relationship || v.visitorRelationship || 'Guest'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ID: {v.idType || v.visitorIdType || 'ID'} {v.idNumber || v.visitorIdNumber ? `(${v.idNumber || v.visitorIdNumber})` : ''}
                        </div>
                      </td>

                      {/* Resident & Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{v.residentName}</div>
                        <div className="text-[11px] text-indigo-600 font-bold">
                          Room {v.roomNumber} (Floor {v.floor})
                        </div>
                        <div className="text-[10px] text-slate-400">Bed: {v.bedNumber || 'Bed 1'}</div>
                      </td>

                      {/* Timing */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {v.visitDate}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {v.expectedArrivalTime} – {v.expectedDepartureTime}
                        </div>
                        {v.actualCheckInTime && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                            In: {new Date(v.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {v.actualCheckOutTime && (
                          <div className="text-[10px] text-slate-500">
                            Out: {new Date(v.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Purpose */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="line-clamp-2 text-slate-700">
                          {v.purposeOfVisit || v.purpose || 'Visit'}
                        </div>
                        {v.additionalNotes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                            "{v.additionalNotes}"
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            v.status === 'Waiting for Approval'
                              ? 'bg-amber-100 text-amber-800'
                              : v.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800'
                              : v.status === 'Checked In'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'Checked Out'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {v.status === 'Checked In' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                          {v.status}
                        </span>
                        {v.rejectionReason && (
                          <div className="text-[10px] text-rose-600 mt-1 max-w-[140px] truncate" title={v.rejectionReason}>
                            Reason: {v.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedVisitor(v)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval Actions */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleApprove(v.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setRejectingId(v.id);
                                  setRejectionReason('');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Gate Security Check-In */}
                          {isApproved && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleCheckIn(v.id)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Check In</span>
                            </button>
                          )}

                          {/* Gate Security Check-Out */}
                          {isCheckedIn && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleCheckOut(v.id)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check Out</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Reject Visitor Request</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Please specify the reason for rejecting this visitor request. This will be visible on the resident's profile.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Quiet hours policy / unapproved overnight request / prior notice required"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Details & Gate Pass Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Visitor Pass: {selectedVisitor.id}
                  </h3>
                  <p className="text-[11px] text-slate-400">Hostel Security Gate Clearance</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Visitor Full Name:</span>
                  <span className="font-bold text-slate-900">{selectedVisitor.visitorFullName || selectedVisitor.visitorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile Number:</span>
                  <span className="font-semibold text-slate-800">{selectedVisitor.visitorMobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Relationship:</span>
                  <span className="font-semibold text-slate-800">{selectedVisitor.relationship || selectedVisitor.visitorRelationship}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identity Proof:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVisitor.idType || selectedVisitor.visitorIdType} ({selectedVisitor.idNumber || selectedVisitor.visitorIdNumber || 'N/A'})
                  </span>
                </div>
                {selectedVisitor.address || selectedVisitor.visitorAddress ? (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Address:</span>
                    <span className="text-slate-800">{selectedVisitor.address || selectedVisitor.visitorAddress}</span>
                  </div>
                ) : null}
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-indigo-600 font-semibold">Visiting Resident:</span>
                  <span className="font-bold text-slate-900">{selectedVisitor.residentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 font-semibold">Assigned Location:</span>
                  <span className="font-bold text-indigo-900">
                    Room {selectedVisitor.roomNumber}, Floor {selectedVisitor.floor}, Bed {selectedVisitor.bedNumber || 'Bed 1'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 font-semibold">Visit Schedule:</span>
                  <span className="text-slate-800">
                    {selectedVisitor.visitDate} ({selectedVisitor.expectedArrivalTime} – {selectedVisitor.expectedDepartureTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600 font-semibold">Purpose:</span>
                  <span className="text-slate-800">{selectedVisitor.purposeOfVisit || selectedVisitor.purpose}</span>
                </div>
              </div>

              {selectedVisitor.durationStayMinutes && (
                <div className="p-3 bg-emerald-50 rounded-xl flex justify-between items-center text-emerald-900">
                  <span className="font-semibold">Actual Duration of Stay:</span>
                  <span className="font-bold">
                    {Math.floor(selectedVisitor.durationStayMinutes / 60)}h {selectedVisitor.durationStayMinutes % 60}m
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Gate Pass</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVisitor(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
