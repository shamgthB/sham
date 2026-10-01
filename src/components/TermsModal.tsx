import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UtensilsCrossed,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api';
import { OFFICIAL_TERMS_RULES, OFFICIAL_HOSTEL_HOLIDAYS, HOSTEL_HOLIDAY_NOTICE } from '../lib/termsData';

interface TermsModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAccepted?: () => void;
  isMandatory?: boolean; // If true, cannot close without accepting
  termsVersion?: string;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccepted,
  isMandatory = false,
  termsVersion = 'v2.0-2026',
}) => {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!agreed) {
      setError('You must check the box to confirm you have read and agree to the Hostel Terms & Conditions.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.acceptTerms({
        version: termsVersion,
        deviceBrowser: navigator.userAgent,
      });
      if (onAccepted) onAccepted();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record terms acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Official Hostel Terms &amp; Conditions
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Version {termsVersion}
                </span>
                <span className="text-[11px] text-slate-500">
                  Mandatory Resident Code of Conduct
                </span>
              </div>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed max-h-[58vh] bg-slate-50/30">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-0.5">Important Notice for All Residents</p>
              <p>
                Please scroll through and read all 23 official rules carefully. By checking the agreement below, you accept these terms as a condition of residing in the hostel.
              </p>
            </div>
          </div>

          {/* Section: 23 Numbered Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Hostel Rules &amp; Regulations (Rules 1 to 23)
              </h3>
            </div>

            <div className="space-y-2.5">
              {OFFICIAL_TERMS_RULES.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex items-start gap-3 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Hostel Holidays */}
          <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Hostel Holidays
              </h3>
            </div>
            <p className="text-xs text-slate-600">The hostel holidays are:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OFFICIAL_HOSTEL_HOLIDAYS.map((holiday, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-indigo-50/70 border border-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold text-center"
                >
                  {holiday}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900">
              <UtensilsCrossed className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{HOSTEL_HOLIDAY_NOTICE}</span>
            </div>
          </div>
        </div>

        {/* Acceptance Checkbox & Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-white rounded-b-2xl space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer group select-none p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
            <input
              type="checkbox"
              id="terms-acceptance-checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-colors"
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug group-hover:text-slate-900">
              I have read and agree to the Hostel Terms &amp; Conditions.
            </span>
          </label>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {agreed ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to submit acceptance
                </span>
              ) : (
                'Checkbox required to proceed'
              )}
            </span>

            <div className="flex items-center gap-3">
              {!isMandatory && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                id="btn-accept-terms"
                disabled={!agreed || submitting}
                onClick={handleAccept}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                  agreed && !submitting
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Acceptance...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Agree &amp; Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
