import React, { useState } from 'react';
import { UserCheck, Calendar, Clock, MapPin, Phone, User, FileText, AlertCircle, CheckCircle2, X, Shield, Upload } from 'lucide-react';
import { api } from '../lib/api';
import type { Resident } from '../types';

interface VisitorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident;
  onCreated: () => void;
}

export const VisitorRequestModal: React.FC<VisitorRequestModalProps> = ({
  isOpen,
  onClose,
  resident,
  onCreated,
}) => {
  const [form, setForm] = useState({
    visitorFullName: '',
    visitorMobile: '',
    visitorRelationship: 'Friend',
    visitorGender: 'Male' as 'Male' | 'Female' | 'Other',
    visitorAddress: '',
    visitorIdType: 'Aadhaar Card' as 'Aadhaar Card' | 'PAN Card' | 'Driving License' | 'Passport' | 'Voter ID' | 'Other',
    visitorIdNumber: '',
    visitDate: new Date().toISOString().split('T')[0],
    expectedArrivalTime: '10:00 AM',
    expectedDepartureTime: '05:00 PM',
    purposeOfVisit: '',
    visitorPhotoUrl: '',
    additionalNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.visitorFullName.trim()) {
      setError('Please enter visitor full name.');
      return;
    }
    if (!form.visitorMobile.trim()) {
      setError('Please enter visitor mobile number.');
      return;
    }
    if (!form.purposeOfVisit.trim()) {
      setError('Please provide the purpose of visit.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createVisitorRequest({
        ...form,
        residentId: resident.id,
        residentName: resident.fullName,
        roomNumber: resident.roomNumber,
        floor: resident.floor,
        bedNumber: resident.bedNumber,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit visitor request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Visitor Pre-Approval Request</h2>
              <p className="text-xs text-slate-500">Requires Hostel Owner/Admin approval prior to entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Locked Resident Details Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Attached Resident Info (Auto-Locked)
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                Verified Resident
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Resident Name</span>
                <span className="font-semibold text-slate-800">{resident.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Room Number</span>
                <span className="font-semibold text-slate-800">Room {resident.roomNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Floor</span>
                <span className="font-semibold text-slate-800">Floor {resident.floor}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Bed / Seat</span>
                <span className="font-semibold text-slate-800">{resident.bedNumber || 'Bed 1'}</span>
              </div>
            </div>
          </div>

          {/* Visitor Primary Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Visitor Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={form.visitorFullName}
                  onChange={(e) => setForm({ ...form, visitorFullName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={form.visitorMobile}
                  onChange={(e) => setForm({ ...form, visitorMobile: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship with Resident <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.visitorRelationship}
                  onChange={(e) => setForm({ ...form, visitorRelationship: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="Friend">Friend</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Colleague / Classmate">Colleague / Classmate</option>
                  <option value="Relative">Relative</option>
                  <option value="Delivery / Technician">Delivery / Technician</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor Gender
                </label>
                <select
                  value={form.visitorGender}
                  onChange={(e) => setForm({ ...form, visitorGender: e.target.value as any })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visitor Residential Address
              </label>
              <input
                type="text"
                placeholder="e.g. 14B, Green Park Extension, New Delhi"
                value={form.visitorAddress}
                onChange={(e) => setForm({ ...form, visitorAddress: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor ID Type
                </label>
                <select
                  value={form.visitorIdType}
                  onChange={(e) => setForm({ ...form, visitorIdType: e.target.value as any })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other Official ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visitor ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. XXXX-XXXX-4567"
                  value={form.visitorIdNumber}
                  onChange={(e) => setForm({ ...form, visitorIdNumber: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Schedule & Timing */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Visit Schedule & Timings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visit Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Arrival Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:30 AM"
                  value={form.expectedArrivalTime}
                  onChange={(e) => setForm({ ...form, expectedArrivalTime: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Departure Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 05:00 PM"
                  value={form.expectedDepartureTime}
                  onChange={(e) => setForm({ ...form, expectedDepartureTime: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purpose of Visit <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Family visit, delivering study materials, or health support"
                value={form.purposeOfVisit}
                onChange={(e) => setForm({ ...form, purposeOfVisit: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Visitor Photo / Document URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or uploaded doc link"
                  value={form.visitorPhotoUrl}
                  onChange={(e) => setForm({ ...form, visitorPhotoUrl: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bringing car, will park outside"
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note on Approval:</strong> Submitting this request creates a status of <em>Waiting for Approval</em>. The visitor will be permitted entry only once the Hostel Owner verifies and marks it <em>Approved</em>.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Submit Visitor Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
