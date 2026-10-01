import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Bill, Payment, HostelSettings, Resident } from '../../types';
import {
  Receipt,
  CreditCard,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Printer,
  Plus,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  X,
  FileCheck,
} from 'lucide-react';
import { InvoiceModal } from '../../components/InvoiceModal';

export const BillingManagement: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('September 2026');

  // Modals
  const [activeInvoiceBill, setActiveInvoiceBill] = useState<Bill | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [isGenerateBillsModalOpen, setIsGenerateBillsModalOpen] = useState(false);

  // Record payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'UPI' as 'UPI' | 'Cash' | 'Bank Transfer' | 'Card',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Generate bills form
  const [generateMonth, setGenerateMonth] = useState('October 2026');
  const [generateDueDate, setGenerateDueDate] = useState('2026-10-05');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bls, pmts, set] = await Promise.all([
        api.getBills(),
        api.getPayments(),
        api.getSettings(),
      ]);
      setBills(bls);
      setPayments(pmts);
      setSettings(set);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBills = bills.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (monthFilter !== 'all' && b.billingMonth !== monthFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = b.residentName.toLowerCase().includes(q);
      const matchRoom = b.roomNumber.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      if (!matchName && !matchRoom && !matchId) return false;
    }
    return true;
  });

  const totalBilled = filteredBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalCollected = filteredBills.reduce((acc, b) => acc + b.amountPaid, 0);
  const totalPending = filteredBills.reduce((acc, b) => acc + b.remainingBalance, 0);

  const handleOpenRecordPayment = (bill: Bill) => {
    setSelectedBillForPayment(bill);
    setPaymentForm({
      amount: bill.remainingBalance > 0 ? bill.remainingBalance : bill.totalAmount,
      paymentMethod: 'UPI',
      transactionReference: 'UPI-' + Math.floor(100000 + Math.random() * 900000),
      paymentDate: new Date().toISOString().split('T')[0],
      notes: 'Monthly accommodation payment',
    });
    setIsRecordPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    try {
      await api.recordPayment({
        billId: selectedBillForPayment.id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      setIsRecordPaymentModalOpen(false);
      setSelectedBillForPayment(null);
      await loadData();
      alert('Payment logged successfully and invoice updated!');
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleGenerateMonthlyBills = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generateMonthlyBills(generateMonth, generateDueDate);
      setIsGenerateBillsModalOpen(false);
      await loadData();
      alert(`Successfully generated ${res.count} invoices for ${generateMonth}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate monthly bills');
    }
  };

  const monthsList = Array.from(new Set(bills.map((b) => b.billingMonth)));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" />
            Rent, Billing & Payment Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate monthly rent bills, log cash or online collections, track outstanding balances, and print receipts.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateBillsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" /> Generate Monthly Bills
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Billed</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalBilled.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">For selected month/filter</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Total Collected</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% Collection Efficiency
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Remaining Pending</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">Unpaid or partially paid</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Billing Months</option>
            {monthsList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid in Full</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resident, room, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Room & Floor</th>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Billed Amount</th>
                <th className="py-3 px-4">Paid / Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => {
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {bill.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{bill.residentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{bill.residentId}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          Room {bill.roomNumber}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          Floor {bill.floor} • {bill.roomType}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {bill.billingMonth}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          ₹{bill.totalAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Rent: ₹{bill.rentAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-600">
                          ₹{bill.amountPaid.toLocaleString('en-IN')}
                        </div>
                        {bill.remainingBalance > 0 && (
                          <div className="text-[10px] font-semibold text-rose-600">
                            Due: ₹{bill.remainingBalance.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            bill.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bill.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : bill.status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {bill.status !== 'Paid' && (
                            <button
                              onClick={() => handleOpenRecordPayment(bill)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            >
                              Collect
                            </button>
                          )}

                          <button
                            onClick={() => setActiveInvoiceBill(bill)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print / View Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No billing records matching filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Payment */}
      {isRecordPaymentModalOpen && selectedBillForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Rent Payment
              </h3>
              <button
                onClick={() => setIsRecordPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Resident:</span>
                <span className="font-bold text-slate-900">{selectedBillForPayment.residentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room & Month:</span>
                <span className="font-medium text-slate-800">
                  Room {selectedBillForPayment.roomNumber} • {selectedBillForPayment.billingMonth}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-rose-600">
                  ₹{selectedBillForPayment.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Pay (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Bank Transfer">NEFT / RTGS Bank Transfer</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Receipt No</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/1234567890 or CASH-01"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Record Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Monthly Rent Bills */}
      {isGenerateBillsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Bulk Monthly Rent Invoicing
              </h3>
              <button
                onClick={() => setIsGenerateBillsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Generates official rent bills for all active hostel residents based on their contracted rates.
              Single living is billed at ₹{settings?.singleRent.toLocaleString('en-IN')}, and Double living at ₹{settings?.doubleRent.toLocaleString('en-IN')}/person.
            </p>

            <form onSubmit={handleGenerateMonthlyBills} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Month</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026"
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={generateDueDate}
                  onChange={(e) => setGenerateDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateBillsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Generate Bills for All Tenants
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal Preview & Print */}
      {activeInvoiceBill && (
        <InvoiceModal
          bill={activeInvoiceBill}
          settings={settings}
          onClose={() => setActiveInvoiceBill(null)}
        />
      )}
    </div>
  );
};
