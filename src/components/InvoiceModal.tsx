import React from 'react';
import type { Bill, HostelSettings } from '../types';
import { X, Printer, CheckCircle, Clock, AlertTriangle, Building, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  bill: Bill | null;
  settings: HostelSettings | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bill, settings, onClose }) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: Bill['status']) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> PAID IN FULL
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> PARTIALLY PAID
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" /> OVERDUE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:my-0">
        {/* Header Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm tracking-wide">Hostel Rent Invoice & Payment Receipt</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-invoice" className="p-8 sm:p-10 bg-white text-slate-800">
          {/* Top Hostel Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  H
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {settings?.hostelName || 'Greenfield Executive Residency & Hostel'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Affordable Luxury Student & Working Professional Living</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2.5 max-w-md leading-relaxed">
                {settings?.address || 'Plot 42, Metro Residency Lane, Knowledge City, Bangalore - 560066'}
              </p>
              <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-1">
                <span>Phone: {settings?.phone || '+91 98765 43210'}</span>
                <span>Email: {settings?.email || 'management@greenfieldhostel.com'}</span>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Reference</div>
              <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">{bill.id}</div>
              <div className="mt-2">{getStatusBadge(bill.status)}</div>
              <div className="text-xs text-slate-500 mt-2">
                Date Issued: <span className="font-medium text-slate-700">{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Resident & Room Meta Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Billed To Resident</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{bill.residentName}</h3>
              <p className="text-xs text-slate-600 mt-0.5">Resident ID: <span className="font-mono font-semibold text-slate-800">{bill.residentId}</span></p>
              <p className="text-xs text-slate-600">Status: Active Resident</p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Accommodation Allocated</span>
              <div className="text-base font-bold text-indigo-700 mt-1">
                Room {bill.roomNumber} (Floor {bill.floor})
              </div>
              <p className="text-xs text-slate-600 mt-0.5 capitalize">
                Type: <span className="font-semibold">{bill.roomType} Living Accommodation</span>
              </p>
              <p className="text-xs text-slate-600">
                Payment Due Date: <span className="font-semibold text-rose-600">{bill.dueDate}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Itemized Billing Details</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-2">Description</th>
                    <th className="py-3 px-2">Period / Note</th>
                    <th className="py-3 px-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3.5 px-2 font-medium text-slate-900">
                      Monthly Room Rent ({bill.roomType === 'single' ? 'Single Room' : 'Double Sharing Per Person'})
                      <div className="text-xs text-slate-500 font-normal mt-0.5">
                        Includes 4x daily meals, free Wi-Fi, 24h electricity, RO water & weekly cleaning
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-slate-600 font-medium">{bill.billingMonth}</td>
                    <td className="py-3.5 px-2 text-right font-semibold text-slate-900">₹{bill.rentAmount.toLocaleString('en-IN')}</td>
                  </tr>

                  {bill.otherCharges > 0 && (
                    <tr>
                      <td className="py-3.5 px-2 font-medium text-slate-900">
                        Additional Configured Charges
                        {bill.otherChargesNote && (
                          <div className="text-xs text-slate-500 font-normal mt-0.5">{bill.otherChargesNote}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-slate-600">Standard Extra</td>
                      <td className="py-3.5 px-2 text-right font-semibold text-slate-900">₹{bill.otherCharges.toLocaleString('en-IN')}</td>
                    </tr>
                  )}

                  {bill.previousBalance > 0 && (
                    <tr>
                      <td className="py-3.5 px-2 font-medium text-amber-900">Previous Outstanding Balance</td>
                      <td className="py-3.5 px-2 text-slate-600">Arrears Carried Forward</td>
                      <td className="py-3.5 px-2 text-right font-semibold text-amber-700">₹{bill.previousBalance.toLocaleString('en-IN')}</td>
                    </tr>
                  )}

                  {bill.discount > 0 && (
                    <tr>
                      <td className="py-3.5 px-2 font-medium text-emerald-900">Special Discount / Adjustment</td>
                      <td className="py-3.5 px-2 text-slate-600">Concession Applied</td>
                      <td className="py-3.5 px-2 text-right font-semibold text-emerald-600">-₹{bill.discount.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="max-w-xs text-xs text-slate-500 leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Management Receipt
              </div>
              Rent is payable by the 5th of each calendar month. Historical bills are locked to their effective rates at the time of invoice generation.
            </div>

            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid:</span>
                <span className="font-bold">₹{bill.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300 text-base font-bold text-slate-900">
                <span>Remaining Balance:</span>
                <span className={bill.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  ₹{bill.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-12 pt-6 border-t border-dashed border-slate-300 flex flex-col sm:flex-row justify-between items-end text-xs text-slate-500 gap-4">
            <div>
              <p>Generated electronically via Greenfield Hostel Management Portal</p>
              <p className="font-mono mt-0.5 text-[11px] text-slate-400">Timestamp: {new Date().toISOString()}</p>
            </div>
            <div className="text-right">
              <div className="w-44 border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800 text-center font-serif italic">
                Rajesh Sharma
              </div>
              <p className="text-center font-medium">Authorized Hostel Manager Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
