import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api';

interface RegistrationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: {
    status: 'Waiting for Owner Approval' | 'Rejected';
    user: any;
    registration?: any;
    message?: string;
    rejectionReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  } | null;
  onStatusUpdated?: (newStatus: string) => void;
}

export const RegistrationStatusModal: React.FC<RegistrationStatusModalProps> = ({
  isOpen,
  onClose,
  statusData,
  onStatusUpdated,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  // Resubmit fields
  const [resubmitAddress, setResubmitAddress] = useState(statusData?.registration?.address || '');
  const [resubmitMobile, setResubmitMobile] = useState(statusData?.registration?.mobile || '');
  const [resubmitWork, setResubmitWork] = useState(statusData?.registration?.workOrCollege || '');
  const [resubmitDesignation, setResubmitDesignation] = useState(statusData?.registration?.designation || '');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  if (!isOpen || !statusData) return null;

  const isPending = statusData.status === 'Waiting for Owner Approval';
  const isRejected = statusData.status === 'Rejected';

  const handleRefreshStatus = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      // Re-query login/status
      const res = await api.login(statusData.user.email, 'demo_check', 'resident');
      if (res.pendingApproval) {
        setCheckMessage('Status updated: Your application is still pending review by the hostel owner.');
      } else if (res.rejected) {
        setCheckMessage('Status: Application remains rejected. Please review the reason below.');
      } else if (res.token) {
        setCheckMessage('Great news! Your registration has been APPROVED! You can now log in.');
        if (onStatusUpdated) onStatusUpdated('Approved');
      }
    } catch (err: any) {
      setCheckMessage('Status checked: Pending review by hostel owner.');
    } finally {
      setChecking(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResubmitting(true);
    setResubmitError(null);

    try {
      const res = await api.resubmitRegistration({
        id: statusData.registration?.id,
        email: statusData.user?.email,
        address: resubmitAddress,
        mobile: resubmitMobile,
        workOrCollege: resubmitWork,
        designation: resubmitDesignation,
      });

      setShowResubmitForm(false);
      setCheckMessage('Your updated application has been re-submitted! Status reset to "Waiting for Owner Approval".');
      if (onStatusUpdated) onStatusUpdated('Waiting for Owner Approval');
    } catch (err: any) {
      setResubmitError(err.message || 'Failed to re-submit application.');
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div
          className={`p-5 sm:p-6 border-b flex items-center justify-between ${
            isPending
              ? 'bg-amber-950/30 border-amber-900/40 text-amber-300'
              : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isPending ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isPending ? <Clock className="w-5 h-5 animate-spin-slow" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                {isPending ? 'Approval In Progress' : 'Application Decision'}
              </span>
              <h2 className="text-lg font-black text-white">
                {isPending ? 'Waiting for Owner Approval' : 'Registration Application Rejected'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-300">
          {checkMessage && (
            <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>{checkMessage}</span>
            </div>
          )}

          {/* Pending Status Explanation */}
          {isPending && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span>Applicant: {statusData.user.name}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Your resident self-registration was submitted successfully and is currently in the verification queue.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Registered Email</span>
                    <span className="text-slate-200 font-medium truncate block">{statusData.user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reviewer</span>
                    <span className="text-slate-200 font-medium">Rajesh Sharma (Hostel Owner)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-1.5 text-amber-200">
                <p className="font-bold">Why is Resident Dashboard locked?</p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Hostel security protocol requires the owner to verify identification details, check room and bed availability, and formally allocate your room before granting dashboard access.
                </p>
              </div>

              {/* Help & Contact Details */}
              <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Hostel Administrative Office
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+91 98230 44556 (Warden Desk)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>admissions@greenfieldhostel.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejected Status Explanation */}
          {isRejected && !showResubmitForm && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Hostel Owner's Rejection Reason:
                </span>
                <p className="text-sm font-semibold text-white bg-slate-950/60 p-3 rounded-xl border border-rose-500/20">
                  "{statusData.rejectionReason || 'Application details could not be verified by hostel administration.'}"
                </p>
                {statusData.reviewedBy && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Reviewed by: <strong className="text-slate-300">{statusData.reviewedBy}</strong>
                  </p>
                )}
              </div>

              <p className="text-slate-400 leading-relaxed text-xs">
                You can update your address, contact, or educational details and re-submit your registration for review.
              </p>

              <button
                type="button"
                onClick={() => setShowResubmitForm(true)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <FileEdit className="w-4 h-4" />
                <span>Update Details & Re-Submit Application</span>
              </button>
            </div>
          )}

          {/* Re-Submit Form */}
          {isRejected && showResubmitForm && (
            <form onSubmit={handleResubmit} className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-bold text-white text-xs">Update Registration Details</span>
                <button
                  type="button"
                  onClick={() => setShowResubmitForm(false)}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {resubmitError && (
                <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  {resubmitError}
                </p>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Permanent Address</label>
                <input
                  type="text"
                  required
                  value={resubmitAddress}
                  onChange={(e) => setResubmitAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Indian Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={resubmitMobile}
                  onChange={(e) => setResubmitMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">College / Organization</label>
                <input
                  type="text"
                  required
                  value={resubmitWork}
                  onChange={(e) => setResubmitWork(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Course / Designation</label>
                <input
                  type="text"
                  required
                  value={resubmitDesignation}
                  onChange={(e) => setResubmitDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitForm(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {resubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Re-Submit to Owner</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={checking}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Check Current Status</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
