import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Building,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  ShieldAlert,
  Calendar,
  BedDouble,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { ResidentRegistration, Room } from '../../types';

export const ResidentApprovalsView: React.FC = () => {
  const [registrations, setRegistrations] = useState<ResidentRegistration[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected registration for detailed review
  const [selectedReg, setSelectedReg] = useState<ResidentRegistration | null>(null);

  // Approval modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [customRent, setCustomRent] = useState<number>(0);
  const [customDeposit, setCustomDeposit] = useState<number>(0);
  const [approving, setApproving] = useState(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regsRes, roomsRes] = await Promise.all([
        api.getRegistrations(),
        api.getRooms(),
      ]);
      setRegistrations(regsRes.registrations || []);
      setRooms(roomsRes || []);
    } catch (err: any) {
      console.error(err);
      setActionAlert({ type: 'error', message: err.message || 'Failed to load registration records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchesTab =
      filterTab === 'all'
        ? true
        : filterTab === 'pending'
        ? r.status === 'Waiting for Owner Approval'
        : filterTab === 'approved'
        ? r.status === 'Approved'
        : r.status === 'Rejected';

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.mobile.includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.workOrCollege.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const pendingCount = registrations.filter((r) => r.status === 'Waiting for Owner Approval').length;
  const approvedCount = registrations.filter((r) => r.status === 'Approved').length;
  const rejectedCount = registrations.filter((r) => r.status === 'Rejected').length;

  // Available rooms for assignment
  const availableRooms = rooms.filter((room) =>
    room.beds.some((bed) => !bed.isOccupied)
  );

  const handleOpenApprove = (reg: ResidentRegistration) => {
    setSelectedReg(reg);
    const defaultRoom = availableRooms[0];
    if (defaultRoom) {
      setSelectedRoomNumber(defaultRoom.roomNumber);
      const availableBed = defaultRoom.beds.find((b) => !b.isOccupied);
      setSelectedBedNumber(availableBed?.bedNumber || 'Bed 1');
      setCustomRent(defaultRoom.rentPerPerson);
      setCustomDeposit(defaultRoom.type === 'single' ? 4500 : 3500);
    }
    setShowApproveModal(true);
  };

  const handleRoomChange = (roomNum: string) => {
    setSelectedRoomNumber(roomNum);
    const room = rooms.find((r) => r.roomNumber === roomNum);
    if (room) {
      const availBed = room.beds.find((b) => !b.isOccupied);
      setSelectedBedNumber(availBed?.bedNumber || room.beds[0]?.bedNumber || 'Bed 1');
      setCustomRent(room.rentPerPerson);
      setCustomDeposit(room.type === 'single' ? 4500 : 3500);
    }
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;

    setApproving(true);
    setActionAlert(null);

    try {
      const res = await api.approveRegistration(selectedReg.id, {
        roomNumber: selectedRoomNumber,
        bedNumber: selectedBedNumber,
        monthlyRent: customRent,
        securityDeposit: customDeposit,
      });

      setActionAlert({
        type: 'success',
        message: `Success! ${selectedReg.fullName} has been approved and assigned to Room ${selectedRoomNumber} (${selectedBedNumber}).`,
      });

      setShowApproveModal(false);
      setSelectedReg(null);
      await fetchData();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to approve registration.' });
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReject = (reg: ResidentRegistration) => {
    setSelectedReg(reg);
    setRejectionReason('No suitable room available at this time.');
    setShowRejectModal(true);
  };

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg || !rejectionReason.trim()) return;

    setRejecting(true);
    setActionAlert(null);

    try {
      await api.rejectRegistration(selectedReg.id, rejectionReason.trim());

      setActionAlert({
        type: 'success',
        message: `Registration application for ${selectedReg.fullName} has been marked as Rejected.`,
      });

      setShowRejectModal(false);
      setSelectedReg(null);
      await fetchData();
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to reject registration.' });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Resident Approval Requests
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review and verify incoming resident sign-ups, check KYC & emergency contacts, and allocate rooms.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Alert Banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Waiting for Approval</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'approved'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Approved</span>
              <span className="text-[10px] text-slate-400 font-semibold">({approvedCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'rejected'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Rejected</span>
              <span className="text-[10px] text-slate-400 font-semibold">({rejectedCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All ({registrations.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, mobile, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Registrations List / Cards */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs font-medium">Loading resident registration requests...</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2 shadow-sm">
          <UserCheck className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No registration requests found</p>
          <p className="text-xs text-slate-400">
            {filterTab === 'pending'
              ? 'All resident applications have been reviewed.'
              : 'Try changing your search query or filter tab.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRegistrations.map((reg) => {
            const isPending = reg.status === 'Waiting for Owner Approval';
            const isApproved = reg.status === 'Approved';
            const isRejected = reg.status === 'Rejected';

            return (
              <div
                key={reg.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                  isPending
                    ? 'border-amber-200 bg-amber-50/20'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                {/* Card Header: Avatar & Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={reg.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                      alt={reg.fullName}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{reg.fullName}</h3>
                        <span className="text-[10px] text-slate-400">({reg.gender}, {reg.dob})</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {reg.designation} • {reg.workOrCollege}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Submitted {new Date(reg.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border ${
                      isPending
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : isApproved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile & Verification</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {reg.mobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <span className="font-semibold text-slate-800 truncate flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{reg.email}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Permanent Address</span>
                    <span className="text-slate-700 truncate block">
                      {reg.city}, {reg.state} ({reg.pinCode})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
                    <span className="text-slate-700 truncate block">
                      {reg.emergencyContactName} ({reg.emergencyRelationship}) - {reg.emergencyContactNumber}
                    </span>
                  </div>
                </div>

                {/* Rejection / Approval Info */}
                {isRejected && reg.rejectionReason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <span className="font-bold block text-[11px]">Rejection Reason:</span>
                    <p className="text-rose-700">{reg.rejectionReason}</p>
                  </div>
                )}

                {isApproved && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                    <span>
                      Allocated: <strong>Room {reg.assignedRoomNumber}</strong> ({reg.assignedBedNumber})
                    </span>
                    <span className="font-bold">Rent: ₹{reg.assignedMonthlyRent?.toLocaleString('en-IN')}/mo</span>
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedReg(reg)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Details</span>
                  </button>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReject(reg)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenApprove(reg)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Allocate Bed</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Full Detail Inspection */}
      {selectedReg && !showApproveModal && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedReg.avatar}
                  alt={selectedReg.fullName}
                  className="w-14 h-14 rounded-2xl object-cover border"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-black text-lg text-slate-900">{selectedReg.fullName}</h3>
                  <span className="text-xs text-slate-500">{selectedReg.whatTheyDo} • Application ID: {selectedReg.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedReg(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Sections */}
            <div className="space-y-4 text-xs text-slate-700 max-h-[65vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Contact & Verification</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile</span>
                    <span className="font-semibold text-slate-800">{selectedReg.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email (OTP Verified)</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedReg.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Date of Birth</span>
                    <span>{selectedReg.dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Gender</span>
                    <span>{selectedReg.gender}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Permanent Address</h4>
                <p className="text-slate-800">{selectedReg.address}</p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">City</span>
                    <span className="font-medium text-slate-800">{selectedReg.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">State</span>
                    <span className="font-medium text-slate-800">{selectedReg.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PIN Code</span>
                    <span className="font-mono font-medium text-slate-800">{selectedReg.pinCode}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Emergency Contact Verification</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact Person</span>
                    <span className="font-semibold text-slate-800">{selectedReg.emergencyContactName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Relationship</span>
                    <span className="text-slate-800">{selectedReg.emergencyRelationship}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Emergency Phone</span>
                    <span className="font-semibold text-slate-800">{selectedReg.emergencyContactNumber}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Education / Employment</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Institution / Company</span>
                    <span className="font-semibold text-slate-800">{selectedReg.workOrCollege}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Course / Role</span>
                    <span className="font-semibold text-slate-800">{selectedReg.designation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              {selectedReg.status === 'Waiting for Owner Approval' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenReject(selectedReg);
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Reject Application
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenApprove(selectedReg);
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                  >
                    Approve & Allocate Bed
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Approve & Allocate Bed */}
      {showApproveModal && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                  Hostel Owner Approval Workflow
                </span>
                <h3 className="font-black text-lg text-slate-900">
                  Approve Registration & Allocate Bed
                </h3>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <img
                  src={selectedReg.avatar}
                  alt={selectedReg.fullName}
                  className="w-10 h-10 rounded-xl object-cover border"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-emerald-950">{selectedReg.fullName}</h4>
                  <p className="text-[11px] text-emerald-800">{selectedReg.mobile} • {selectedReg.email}</p>
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Room Allocation <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedRoomNumber}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availableRooms.map((r) => {
                    const freeBeds = r.beds.filter((b) => !b.isOccupied).length;
                    return (
                      <option key={r.id} value={r.roomNumber}>
                        Room {r.roomNumber} ({r.type.toUpperCase()} • Floor {r.floor}) - {freeBeds} bed(s) free • ₹{r.rentPerPerson}/mo
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bed Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Bed <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedBedNumber}
                  onChange={(e) => setSelectedBedNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {rooms
                    .find((r) => r.roomNumber === selectedRoomNumber)
                    ?.beds.filter((b) => !b.isOccupied)
                    .map((bed) => (
                      <option key={bed.bedNumber} value={bed.bedNumber}>
                        {bed.bedNumber} (Vacant)
                      </option>
                    ))}
                </select>
              </div>

              {/* Rent & Deposit Customization */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Monthly Rent (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={customRent}
                    onChange={(e) => setCustomRent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Security Deposit (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={customDeposit}
                    onChange={(e) => setCustomDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p>• Automatically marks bed as occupied and creates active resident profile.</p>
                <p>• Records security deposit and initializes first monthly rent invoice.</p>
                <p>• Grants immediate access for the resident to sign into their portal.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {approving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm Approval & Allocate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Application */}
      {showRejectModal && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Reject Resident Application
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Are you sure you want to reject the registration of <strong className="text-slate-900">{selectedReg.fullName}</strong>?
                Please specify the reason below (this will be shown to the applicant).
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Quick Reason Suggestions */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick templates:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'No vacant beds in requested category.',
                    'Incomplete identification / address details.',
                    'Emergency contact number unreachable.',
                    'Did not meet student/working residency criteria.',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectionReason(r)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {rejecting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
