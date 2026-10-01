import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { DashboardStats, HostelSettings, Bill, Room } from '../../types';
import {
  Building,
  DoorOpen,
  Users,
  Bed,
  CreditCard,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  FileCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  ShieldCheck,
  QrCode,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
  onOpenInvoice?: (bill: Bill) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenInvoice }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const handleNavigate = (tab: string) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    } else {
      navigate(tab === 'dashboard' ? '/admin' : `/admin/${tab}`);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [st, set, rm] = await Promise.all([
        api.getDashboardStats(),
        api.getSettings(),
        api.getRooms(),
      ]);
      setStats(st);
      setSettings(set);
      setRooms(rm);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading hostel metrics...</p>
        </div>
      </div>
    );
  }

  // Floor-wise calculation
  const floorMap = [1, 2, 3].map((floorNum) => {
    const floorRooms = rooms.filter((r) => r.floor === floorNum);
    const totalBeds = floorRooms.reduce((acc, r) => acc + r.capacity, 0);
    const occupiedBeds = floorRooms.reduce(
      (acc, r) => acc + r.beds.filter((b) => b.isOccupied).length,
      0
    );
    const availableBeds = totalBeds - occupiedBeds;
    const occupiedRooms = floorRooms.filter((r) => r.beds.some((b) => b.isOccupied)).length;
    return {
      floor: floorNum,
      roomsCount: floorRooms.length,
      occupiedRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      rate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Hostel Summary & Quick Action Buttons */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Building className="w-3.5 h-3.5" />
              <span>3 Floors • 21 Total Rooms (101–107, 201–207, 301–307)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {settings?.hostelName || 'Greenfield Executive Residency'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Active configuration: Single Living ₹{settings?.singleRent.toLocaleString('en-IN')}/mo • Double Living ₹{settings?.doubleRent.toLocaleString('en-IN')}/person/mo (All 4 meals & Wi-Fi included).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleNavigate('approvals')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Resident Approvals</span>
              {stats?.pendingRegistrationsCount ? (
                <span className="px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded-full text-[10px] font-black">
                  {stats.pendingRegistrationsCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => handleNavigate('attendance')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95"
            >
              <QrCode className="w-4 h-4" /> QR Attendance
            </button>
            <button
              onClick={() => handleNavigate('residents')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Check-in Resident
            </button>
            <button
              onClick={() => handleNavigate('billing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Receipt className="w-4 h-4" /> Record Payment
            </button>
            <button
              onClick={() => handleNavigate('cleaning')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" /> Cleaning Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Owner Notification Alert for Pending Resident Registrations */}
      {stats?.pendingRegistrationsCount ? (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>{stats.pendingRegistrationsCount} Resident Registration{stats.pendingRegistrationsCount > 1 ? 's' : ''} Waiting for Approval</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-extrabold uppercase">Action Required</span>
              </p>
              <p className="text-xs text-amber-800">
                Applicants have verified their Indian mobile and email OTP. Review profile information and allocate beds.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('approvals')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0 transition-all active:scale-95"
          >
            <span>Review Applications</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* Row 1: Key Inventory Stats (Floors, Rooms, Beds, Residents) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rooms Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Rooms</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats?.totalRooms || 21}</span>
            <span className="text-xs text-slate-500 font-medium">in 3 Floors</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Occupied: <b className="text-slate-800">{rooms.filter((r) => r.beds.some((b) => b.isOccupied)).length}</b></span>
            <span>Vacant: <b className="text-emerald-600">{stats?.vacantRooms || 0}</b></span>
          </div>
        </div>

        {/* Beds / Capacity Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Beds / Seats</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Bed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats?.totalBeds || 0}</span>
            <span className="text-xs text-blue-600 font-semibold">
              {stats?.totalBeds ? Math.round(((stats.occupiedBeds || 0) / stats.totalBeds) * 100) : 0}% Occupied
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Occupied: <b className="text-slate-800">{stats?.occupiedBeds || 0}</b></span>
            <span>Available: <b className="text-emerald-600">{stats?.availableBeds || 0}</b></span>
          </div>
        </div>

        {/* Residents Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Residents</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats?.totalResidents || 0}</span>
            <span className="text-xs text-emerald-600 font-medium">Tenants</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Single: <b className="text-slate-800">{stats?.singleRoomsOccupied || 0}</b></span>
            <span>Double: <b className="text-slate-800">{stats?.doubleRoomsOccupied || 0}</b></span>
          </div>
        </div>

        {/* Complaints & Cleaning Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Complaints</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats?.openComplaints || 0}</span>
            <span className="text-xs text-slate-400 font-medium">Pending action</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Resolved: <b className="text-emerald-600">{stats?.resolvedComplaints || 0}</b></span>
            <span>Due Cleanings: <b className="text-indigo-600">{stats?.upcomingCleanings || 0}</b></span>
          </div>
        </div>
      </div>

      {/* Row 2: Financial Stats (Expected, Collected, Pending, Overdue) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Monthly Rent & Collection Overview (September 2026)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live financial health: tracks expected billed rent vs actual collections and overdue balances.
            </p>
          </div>
          <button
            onClick={() => handleNavigate('billing')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Manage All Bills <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Rent</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              ₹{(stats?.currentMonthExpectedRent || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total billing generated this month</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Rent Collected</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              ₹{(stats?.rentCollected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              {stats?.currentMonthExpectedRent
                ? Math.round(((stats.rentCollected || 0) / stats.currentMonthExpectedRent) * 100)
                : 0}% collection rate
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Rent</span>
            <div className="text-xl font-bold text-amber-700 mt-1">
              ₹{(stats?.rentPending || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-amber-600 mt-1">Awaiting tenant payment</p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/70">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Overdue Accounts</span>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {stats?.overduePayments || 0} <span className="text-sm font-normal text-rose-600">bills</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Past due date (5th of month)</p>
          </div>
        </div>

        {/* Security Deposit Custody (Strict Accounting Separation) */}
        <div className="mt-5 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-950 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Security Deposit Caution Money in Custody: ₹{(stats?.totalSecurityDepositsHeld || 103500).toLocaleString('en-IN')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Separated from Monthly Rent
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Standard caution money: <strong>Single Living ₹4,500</strong> • <strong>Double Living ₹3,500 / resident (₹7,000 / room)</strong>. Deposit funds are held in trust and refunded at checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('deposits')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 self-start md:self-auto inline-flex items-center gap-1.5"
          >
            <span>Deposit Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Floor Layout Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Floor-Wise Capacity & Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">3 Floors, 7 rooms per floor (Total 21 Rooms)</p>
          </div>
          <button
            onClick={() => handleNavigate('floors')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
          >
            Visual Floor Plan <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          {floorMap.map((fl) => (
            <div
              key={fl.floor}
              onClick={() => handleNavigate('floors')}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Floor {fl.floor} ({fl.floor}01 – {fl.floor}07)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {fl.rate}% Full
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${fl.rate}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Total Rooms:</span>{' '}
                  <span className="font-semibold text-slate-800">{fl.roomsCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Occupied Rms:</span>{' '}
                  <span className="font-semibold text-slate-800">{fl.occupiedRooms}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Beds:</span>{' '}
                  <span className="font-semibold text-slate-800">{fl.totalBeds}</span>
                </div>
                <div>
                  <span className="text-slate-400">Available Beds:</span>{' '}
                  <span className="font-semibold text-emerald-600">{fl.availableBeds}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Free Wi-Fi Active</span>
                <span className="text-indigo-600 font-medium">View Rooms →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Recent Activities (Recent Payments & Recent Complaints) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" /> Recent Rent Payments
            </h3>
            <button
              onClick={() => handleNavigate('billing')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{p.residentName}</div>
                    <div className="text-slate-500 text-[11px]">
                      Room {p.roomNumber} • Ref: {p.transactionReference}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</div>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mt-0.5">
                      {p.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No recent payments logged</p>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Recent Complaints & Issues
            </h3>
            <button
              onClick={() => handleNavigate('complaints')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {stats?.recentComplaints && stats.recentComplaints.length > 0 ? (
              stats.recentComplaints.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-slate-500 text-[11px]">
                      Room {c.roomNumber} • {c.residentName} • Cat: {c.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'In Progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No complaints submitted</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
