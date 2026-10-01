import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Shield, FileText, Upload, Lock, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Bill, PaymentMethod } from '../types';

interface RentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  onSubmitted: () => void;
}

export const RentConfirmationModal: React.FC<RentConfirmationModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSubmitted,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must confirm that you have initiated/transferred the rent payment.');
      return;
    }
    if ((paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && !transactionReference.trim()) {
      setError('Please provide the UTR / Transaction Reference ID for verification.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.submitRentPaymentConfirmation({
        billId: bill.id,
        monthlyRent: bill.amount,
        billingMonth: bill.month,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        paymentProofUrl: paymentProofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        confirmationAccepted: agreed,
      });

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rent confirmation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Confirm Monthly Rent Payment</h2>
              <p className="text-xs text-slate-500">Subject to Hostel Owner verification & approval</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bill Summary Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span>Invoice #{bill.id}</span>
              <span className="text-indigo-600 font-extrabold text-base">₹{bill.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Billing Cycle:</span>
              <span className="font-semibold text-slate-800">{bill.month}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Resident Name:</span>
              <span className="font-semibold text-slate-800">{bill.residentName} (Room {bill.roomNumber})</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method Used <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['UPI', 'Bank Transfer', 'Card', 'Cash'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                    paymentMethod === m
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* UTR / Transaction Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Reference / UTR Number {paymentMethod !== 'Cash' && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              required={paymentMethod !== 'Cash'}
              placeholder="e.g. 324567891234 or Bank Ref ID"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Proof Screenshot / Document URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Proof / Receipt Screenshot (URL or Image Link)
            </label>
            <input
              type="text"
              placeholder="https://... or uploaded screenshot link"
              value={paymentProofUrl}
              onChange={(e) => setPaymentProofUrl(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Resident Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via Google Pay from HDFC account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Mandatory Confirmation Checkbox */}
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="rent-confirm-checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-800 leading-snug">
                I confirm that I have paid the monthly rent of ₹{bill.amount.toLocaleString('en-IN')} for <strong>{bill.month}</strong>.
              </span>
            </label>

            <p className="text-[11px] text-slate-500 leading-tight pl-6">
              <strong>Owner Verification Notice:</strong> This submission marks your invoice as <em>"Payment Confirmation Pending"</em>. The bill will be officially marked <em>"Paid"</em> only after the Hostel Owner reviews and verifies the transaction.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-rent-confirmation"
              disabled={!agreed || loading}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                agreed && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Confirmation...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Payment for Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
