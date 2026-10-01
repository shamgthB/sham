import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { SecurityDepositRecord, Room } from '../../types';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  DollarSign,
  Info,
} from 'lucide-react';

export const SecurityDepositsView: React.FC = () => {
  const [deposits, setDeposits] = useState<SecurityDepositRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDeposits = async () => {
    setLoading(true);
    try {
      const [depData, rmData] = await Promise.all([
        api.getDeposits(),
        api.getRooms(),
      ]);
      setDeposits(depData);
      setRooms(rmData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, []);

  const filtered = deposits.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.residentName.toLowerCase().includes(q);
      const matchRoom = d.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchRoom) return false;
    }
    return true;
  });

  const totalHeld = deposits
    .filter((d) => d.status === 'Held' || d.status === 'Paid')
    .reduce((acc, d) => acc + d.amount, 0);
  const totalRefunded = deposits.reduce((acc, d) => acc + (d.refundAmount || 0), 0);
  const totalDeductions = deposits.reduce((acc, d) => acc + (d.deductionAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          Tenant Security Deposits & Refund Settlement
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Complete ledger of security caution deposits collected upon admission, interest-free custody, and checkout settlement.
        </p>
      </div>

      {/* Policy banner */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-indigo-950 font-medium">
          <Info className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>Security Caution Deposit Standard Rates:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 bg-white border border-indigo-200 rounded-xl text-indigo-900 font-bold shadow-2xs">
            Single Living Room: ₹4,500
          </span>
          <span className="px-3 py-1 bg-white border border-indigo-200 rounded-xl text-indigo-900 font-bold shadow-2xs">
            Double Living Room: ₹3,500
          </span>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Deposits In Custody</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            ₹{totalHeld.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Held securely for active residents</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Total Refunded at Checkout</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            ₹{totalRefunded.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Returned to vacated tenants</p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Total Deductions</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            ₹{totalDeductions.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-600 mt-1">Room damages or unpaid arrears</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Deposit Statuses</option>
          <option value="Held">Held in Custody</option>
          <option value="Refunded">Fully Refunded</option>
          <option value="Partially Refunded">Partially Refunded</option>
          <option value="Pending">Pending Payment</option>
        </select>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resident or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Room & Floor</th>
                <th className="py-3 px-4">Deposit Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Refund / Deductions</th>
                <th className="py-3 px-4">Collection Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{d.residentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{d.residentId}</div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <div>Room {d.roomNumber}</div>
                    {(() => {
                      const roomObj = rooms.find((r) => r.roomNumber === d.roomNumber);
                      const type = roomObj?.type || (d.amount === 4500 ? 'single' : 'double');
                      return (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            type === 'single'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {type === 'single' ? 'Single (₹4,500)' : 'Double (₹3,500)'}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-900">
                    ₹{d.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.status === 'Held' || d.status === 'Paid'
                          ? 'bg-indigo-100 text-indigo-800'
                          : d.status === 'Refunded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    {d.refundAmount !== undefined ? (
                      <div>
                        <span className="font-semibold text-emerald-600">
                          Refund: ₹{d.refundAmount.toLocaleString('en-IN')}
                        </span>
                        {d.deductionAmount ? (
                          <div className="text-[10px] text-rose-600">
                            Ded: ₹{d.deductionAmount.toLocaleString('en-IN')} ({d.deductionReason})
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No refund processed</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {d.paidDate || 'On Admission'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
