import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Maximize2,
  X,
  Search,
  Filter,
  FileSpreadsheet,
  Layers,
  UtensilsCrossed,
  Dumbbell,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { api } from '../../lib/api';
import { generateQRCodeDataUrl } from '../../lib/qrUtils';
import type { QRSession, CheckInRecord, Resident, FacilityType } from '../../types';

export const QRAttendanceManagement: React.FC = () => {
  const [sessions, setSessions] = useState<(QRSession & { todayScans?: number; totalScans?: number })[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    attendanceTodayCount: 0,
    uniqueResidentsPresentToday: 0,
    totalResidents: 0,
    attendanceRate: 0,
    facilityScansToday: 0,
    facilityBreakdown: {} as Record<string, number>,
  });

  const [loading, setLoading] = useState(true);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'attendance' | 'facility'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDisplayModalOpen, setIsDisplayModalOpen] = useState(false);
  const [isKioskModeOpen, setIsKioskModeOpen] = useState(false);
  const [isManualCheckInModalOpen, setIsManualCheckInModalOpen] = useState(false);

  // Selected session for viewing/printing
  const [selectedSession, setSelectedSession] = useState<QRSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'attendance' as 'attendance' | 'facility',
    facilityType: 'Dining / Mess' as FacilityType,
    facilityName: '',
    location: 'Main Reception & Gate 1',
    date: new Date().toISOString().split('T')[0],
    sessionTime: '06:00 - 23:00',
    notes: '',
  });

  // Manual check-in form
  const [manualForm, setManualForm] = useState({
    residentId: '',
    qrSessionId: '',
    status: 'Present',
    notes: '',
  });

  // Real-time clock for kiosk
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, checkInsData, residentsData] = await Promise.all([
        api.getQRSessions(),
        api.getCheckIns({ date: dateFilter }),
        api.getResidents ? api.getResidents() : fetch('/api/residents', {
          headers: { Authorization: `Bearer ${localStorage.getItem('hms_auth_token')}` },
        }).then(r => r.json()).catch(() => []),
      ]);

      setSessions(sessionsData || []);
      setCheckIns(checkInsData.records || []);
      setStats(checkInsData.stats || {
        totalToday: 0,
        attendanceTodayCount: 0,
        uniqueResidentsPresentToday: 0,
        totalResidents: 0,
        attendanceRate: 0,
        facilityScansToday: 0,
        facilityBreakdown: {},
      });
      if (Array.isArray(residentsData)) {
        setResidents(residentsData);
      }
    } catch (err) {
      console.error('Failed to load QR check-in data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  // Open Display modal for a session
  const handleViewQR = async (session: QRSession) => {
    setSelectedSession(session);
    try {
      const payload = {
        token: session.token,
        code: session.code,
        type: session.type,
        sessionId: session.id,
        title: session.title,
        location: session.location,
      };
      const url = await generateQRCodeDataUrl(payload);
      setQrCodeDataUrl(url);
      setIsDisplayModalOpen(true);
    } catch (err) {
      console.error('Error generating QR image:', err);
    }
  };

  // Open Kiosk full-screen display
  const handleOpenKiosk = async (session: QRSession) => {
    setSelectedSession(session);
    try {
      const payload = {
        token: session.token,
        code: session.code,
        type: session.type,
        sessionId: session.id,
        title: session.title,
        location: session.location,
      };
      const url = await generateQRCodeDataUrl(payload, { width: 500 });
      setQrCodeDataUrl(url);
      setIsKioskModeOpen(true);
    } catch (err) {
      console.error('Error generating Kiosk QR:', err);
    }
  };

  // Create new QR session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      await api.createQRSession({
        title: createForm.title.trim(),
        type: createForm.type,
        facilityType: createForm.type === 'facility' ? createForm.facilityType : undefined,
        facilityName: createForm.type === 'facility' ? (createForm.facilityName.trim() || createForm.facilityType) : undefined,
        location: createForm.location.trim(),
        date: createForm.date,
        sessionTime: createForm.sessionTime,
        notes: createForm.notes,
      });

      setIsCreateModalOpen(false);
      setCreateForm({
        title: '',
        type: 'attendance',
        facilityType: 'Dining / Mess',
        facilityName: '',
        location: 'Main Reception & Gate 1',
        date: new Date().toISOString().split('T')[0],
        sessionTime: '06:00 - 23:00',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create QR session');
    }
  };

  // Toggle active status
  const handleToggleActive = async (session: QRSession) => {
    try {
      await api.updateQRSession(session.id, { isActive: !session.isActive });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update session');
    }
  };

  // Regenerate security token
  const handleRegenerateToken = async (session: QRSession) => {
    if (!confirm(`Generate a new security token & code for "${session.title}"? Previous printed or saved codes for this session will expire immediately.`)) {
      return;
    }
    try {
      await api.updateQRSession(session.id, { regenerateToken: true });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to regenerate token');
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this QR session?')) return;
    try {
      await api.deleteQRSession(sessionId);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete session');
    }
  };

  // Manual Check-in
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.residentId) {
      alert('Please select a resident');
      return;
    }

    try {
      await api.manualCheckIn({
        residentId: manualForm.residentId,
        qrSessionId: manualForm.qrSessionId || undefined,
        status: manualForm.status,
        notes: manualForm.notes,
      });

      setIsManualCheckInModalOpen(false);
      setManualForm({ residentId: '', qrSessionId: '', status: 'Present', notes: '' });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to record manual check-in');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (checkIns.length === 0) {
      alert('No check-in records to export for this date');
      return;
    }

    const headers = ['Record ID', 'Date', 'Time', 'Resident Name', 'Room', 'Bed', 'Session Title', 'Type', 'Facility', 'Method', 'Status', 'Notes'];
    const rows = checkIns.map((c) => [
      c.id,
      c.date,
      new Date(c.timestamp).toLocaleTimeString(),
      `"${c.residentName}"`,
      c.roomNumber,
      c.bedNumber,
      `"${c.sessionTitle}"`,
      c.type,
      c.facilityName || 'N/A',
      c.method,
      c.status,
      `"${c.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hostel_CheckIns_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Badge
  const handlePrintBadge = () => {
    window.print();
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    if (activeTypeFilter !== 'all' && s.type !== activeTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.facilityName && s.facilityName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Check-in Records
  const filteredCheckIns = checkIns.filter((c) => {
    if (activeTypeFilter !== 'all' && c.type !== activeTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.residentName.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q) ||
        c.sessionTitle.toLowerCase().includes(q) ||
        (c.facilityName && c.facilityName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  QR Code Attendance & Facility Pass
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Generate dynamic QR codes for daily resident roll-call and track facility usage in real time.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsManualCheckInModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span>Manual Check-in</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Log</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create QR Session</span>
            </button>
          </div>
        </div>

        {/* Analytics Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Today's Scans</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalToday}</div>
            <span className="text-[11px] text-slate-500 font-medium">All check-in scans</span>
          </div>

          <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Daily Attendance</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {stats.uniqueResidentsPresentToday}{' '}
              <span className="text-xs font-medium text-indigo-500">/ {stats.totalResidents || residents.length}</span>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600">
              {stats.attendanceRate}% Attendance Rate
            </span>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Facility Visits</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.facilityScansToday}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Mess, Gym, Library & Laundry</span>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Active QR Passes</span>
            <div className="text-2xl font-black text-amber-800 mt-1">
              {sessions.filter((s) => s.isActive).length}{' '}
              <span className="text-xs font-medium text-amber-600">/ {sessions.length}</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium">Ready for resident scanning</span>
          </div>
        </div>
      </div>

      {/* Filter and View Selection Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              activeTypeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Passes & Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeFilter('attendance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1 ${
              activeTypeFilter === 'attendance'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Daily Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeFilter('facility')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1 ${
              activeTypeFilter === 'facility'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Facility Usage</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search session, resident, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Section 1: Active QR Code Passes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Active QR Passes & Counters</span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700">
              {filteredSessions.length}
            </span>
          </h2>
          <span className="text-xs text-slate-500">
            Click "Display QR" to show to residents or project on gate counter
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => {
            const isAttendance = session.type === 'attendance';
            return (
              <div
                key={session.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                  session.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${
                        isAttendance
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isAttendance ? <UserCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      <span>{isAttendance ? 'Daily Roll Call' : session.facilityType || 'Facility'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(session)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        session.isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {session.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  {/* Title & Location */}
                  <h3 className="text-base font-black text-slate-900 mt-2.5 line-clamp-1">{session.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{session.location}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{session.sessionTime || 'All Day'}</span>
                  </p>

                  {/* Human Code & Scan Badge */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Pass Code</span>
                      <span className="font-mono font-black text-slate-800 tracking-wider text-sm">
                        {session.code}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Today's Scans</span>
                      <span className="font-bold text-indigo-600 text-sm">
                        {session.todayScans || 0} <span className="text-slate-400 font-normal">scans</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRegenerateToken(session)}
                      title="Regenerate Security Token (invalidates leaked copies)"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      title="Delete Session"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenKiosk(session)}
                      className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1"
                      title="Kiosk / Fullscreen Mode for Tablets at reception"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Kiosk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewQR(session)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Display QR</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Live Check-In Activity Feed & Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Live Attendance & Usage Records</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 font-bold">
                {filteredCheckIns.length} Records
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing scans and check-ins recorded for {new Date(dateFilter).toLocaleDateString('en-IN', { dateStyle: 'full' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Auto-logged from resident mobile scans</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Room / Bed</th>
                <th className="py-3 px-4">Session / Facility</th>
                <th className="py-3 px-4">Scan Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCheckIns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No check-ins recorded for this date or filter.
                  </td>
                </tr>
              ) : (
                filteredCheckIns.map((record) => {
                  const isAttendance = record.type === 'attendance';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{record.residentName}</div>
                        <div className="text-[10px] text-slate-400">{record.residentId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">Room {record.roomNumber}</span>
                        <div className="text-[10px] text-slate-400">
                          Floor {record.floor} • {record.bedNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          {isAttendance ? (
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate max-w-[180px]">{record.sessionTitle}</span>
                        </div>
                        {record.facilityName && (
                          <div className="text-[10px] text-slate-500 ml-5">{record.facilityName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-slate-600 font-medium">
                          {record.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md inline-flex items-center gap-1 ${
                            record.status === 'Present' || record.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{record.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Remove this check-in entry for ${record.residentName}?`)) {
                              await api.deleteCheckIn(record.id);
                              loadData();
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Display & Print QR Code Badge */}
      {isDisplayModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">Hostel QR Pass Badge</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDisplayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Badge Preview */}
            <div id="printable-qr-badge" className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div className="text-[11px] font-bold tracking-widest text-indigo-700 uppercase">
                Greenfield Executive Hostel
              </div>
              <h4 className="text-xl font-black text-slate-900 mt-1">{selectedSession.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedSession.location}</p>

              {/* QR Code Container */}
              <div className="mt-4 inline-block p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-56 h-56 mx-auto object-contain" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Human Code */}
              <div className="mt-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Check-In Pass Code
                </span>
                <span className="font-mono text-xl font-black text-indigo-900 tracking-wider">
                  {selectedSession.code}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2 font-medium">
                Residents: Open your Hostel App and point camera to mark attendance or verify facility access.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenKiosk(selectedSession)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Fullscreen Kiosk Mode</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={qrCodeDataUrl}
                  download={`Hostel_QR_${selectedSession.code}.png`}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Image</span>
                </a>

                <button
                  type="button"
                  onClick={handlePrintBadge}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Badge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Fullscreen Kiosk Mode (for tablets/reception desks) */}
      {isKioskModeOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-10 animate-in fade-in duration-200">
          {/* Top Kiosk Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Greenfield Executive Hostel
                </h1>
                <p className="text-xs text-slate-400">Reception & Gate Check-in Terminal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-indigo-400">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-400">
                  {currentTime.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsKioskModeOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Exit Kiosk"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Central QR Display Card */}
          <div className="my-auto text-center space-y-5 bg-slate-900/90 border border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedSession.type === 'attendance' ? 'Daily Attendance Gate Pass' : selectedSession.facilityType}
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedSession.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400">{selectedSession.location}</p>

            {/* Glowing QR Frame */}
            <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl border-4 border-indigo-500/30">
              <img src={qrCodeDataUrl} alt="Kiosk QR" className="w-64 h-64 sm:w-72 sm:h-72 object-contain" />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Manual Entry Code
              </div>
              <div className="font-mono text-2xl font-black text-indigo-400 tracking-widest">
                {selectedSession.code}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Scan with Hostel App</span>
              </div>
              <div>•</div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Encrypted Verification</span>
              </div>
            </div>
          </div>

          {/* Bottom Kiosk Status Bar */}
          <div className="w-full max-w-4xl text-center text-xs text-slate-500">
            Live Check-ins Today: <strong className="text-indigo-400">{selectedSession.todayScans || 0}</strong> • Terminal ID: {selectedSession.id}
          </div>
        </div>
      )}

      {/* MODAL 3: Create QR Session */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Create New QR Pass Session</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pass Purpose</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, type: 'attendance', title: 'Daily Hostel Attendance & Gate Entry' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      createForm.type === 'attendance'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Daily Attendance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, type: 'facility', title: 'Hostel Facility Access' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      createForm.type === 'facility'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Facility Usage</span>
                  </button>
                </div>
              </div>

              {createForm.type === 'facility' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Facility Category</label>
                  <select
                    value={createForm.facilityType}
                    onChange={(e) => setCreateForm({ ...createForm, facilityType: e.target.value as FacilityType })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Dining / Mess">Dining / Mess (Meals Service)</option>
                    <option value="Gym & Fitness">Gym & Fitness Center</option>
                    <option value="Study / Library Hall">Study & Library Hall</option>
                    <option value="Laundry Area">Laundry & Washing Machines</option>
                    <option value="Recreation Lounge">Recreation Lounge & TV Room</option>
                    <option value="Coworking / Wi-Fi Zone">Coworking & High-Speed Wi-Fi Zone</option>
                    <option value="Other Facility">Other Facility</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Session / Pass Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Attendance - Gate 1 or Lunch Mess Service"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Location / Counter</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gate 1 Reception"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Active Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 - 23:00"
                    value={createForm.sessionTime}
                    onChange={(e) => setCreateForm({ ...createForm, sessionTime: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Scan at desk to record attendance"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Generate Pass & QR Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Manual Check-In Override */}
      {isManualCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Manual Resident Check-In</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualCheckInModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Resident</label>
                <select
                  required
                  value={manualForm.residentId}
                  onChange={(e) => setManualForm({ ...manualForm, residentId: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Resident --</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} (Room {r.roomNumber} - {r.bedNumber}) [{r.id}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Pass / Session</label>
                <select
                  value={manualForm.qrSessionId}
                  onChange={(e) => setManualForm({ ...manualForm, qrSessionId: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Default: Daily Attendance (Hostel Gate)</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.type === 'attendance' ? 'Attendance' : s.facilityType}) [{s.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Present">Present</option>
                  <option value="Verified">Verified</option>
                  <option value="Late">Late Entry</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Admin Note</label>
                <input
                  type="text"
                  placeholder="e.g. Phone battery drained, physical check-in verified"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualCheckInModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Mark Check-In Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
