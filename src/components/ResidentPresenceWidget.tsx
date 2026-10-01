import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Shield, CheckCircle2, AlertCircle, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import type { PresenceSession, PresenceStatus } from '../types';

interface ResidentPresenceWidgetProps {
  residentId?: string;
  onStatusChanged?: (newStatus: PresenceStatus) => void;
}

export const ResidentPresenceWidget: React.FC<ResidentPresenceWidgetProps> = ({
  residentId,
  onStatusChanged,
}) => {
  const [status, setStatus] = useState<PresenceStatus>('IN');
  const [since, setSince] = useState<string>(new Date().toISOString());
  const [durationFormatted, setDurationFormatted] = useState<string>('0m');
  const [history, setHistory] = useState<PresenceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [optionalNotes, setOptionalNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.getPresenceStatus(residentId);
      if (res?.state) {
        setStatus(res.state.status || 'IN');
        setSince(res.state.since || new Date().toISOString());
        setDurationFormatted(res.durationFormatted || '0m');
      }
      const hist = await api.getPresenceHistory(residentId);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e) {
      console.error('Failed to fetch presence status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh interval for live timer
    const interval = setInterval(() => {
      if (since) {
        const diffMs = Math.max(0, Date.now() - new Date(since).getTime());
        const mins = Math.floor(diffMs / 60000);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        setDurationFormatted(hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [residentId, since]);

  const handleAction = async (targetAction: 'IN' | 'OUT') => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.recordPresence(targetAction, optionalNotes.trim() || undefined);
      if (res?.success) {
        setStatus(targetAction);
        setSince(new Date().toISOString());
        setDurationFormatted('0m');
        setFeedback({
          type: 'success',
          message: res.message || `Successfully recorded status as ${targetAction}!`,
        });
        setOptionalNotes('');
        setShowNotesInput(false);
        if (onStatusChanged) onStatusChanged(targetAction);
        await fetchStatus();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to record ${targetAction} status.`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Resident IN / OUT System</h3>
            <p className="text-xs text-slate-500">Live presence tracker & gate attendance session log</p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="self-start sm:self-auto p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
          title="Refresh presence status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Real-time Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Badge & Live Timer */}
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            status === 'IN'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Live Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm ${
                status === 'IN'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              STATUS: {status === 'IN' ? 'INSIDE HOSTEL' : 'OUTSIDE HOSTEL'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-600">
              Active Session Duration:
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-baseline gap-2">
              <span>{durationFormatted}</span>
              <span className="text-xs font-normal text-slate-500">
                ({status === 'IN' ? 'time inside premises' : 'time outside premises'})
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Since {new Date(since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {new Date(since).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Record Gate Attendance Action
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Whenever leaving or returning to the hostel premises, click the corresponding action button below to create a verified timestamped session.
            </p>
          </div>

          {/* Quick Notes Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNotesInput(!showNotesInput)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {showNotesInput ? '- Hide Notes' : '+ Add Optional Purpose / Notes'}
              </button>
            </div>
            {showNotesInput && (
              <input
                type="text"
                value={optionalNotes}
                onChange={(e) => setOptionalNotes(e.target.value)}
                placeholder="e.g. Going to library, returning by 8 PM"
                className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            )}
          </div>

          {/* Big Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              id="btn-presence-record-in"
              disabled={actionLoading}
              onClick={() => handleAction('IN')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                status === 'IN'
                  ? 'bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300'
              }`}
            >
              <LogIn className="w-4 h-4 text-emerald-400 group-hover:text-white" />
              <span>RECORD IN</span>
            </button>

            <button
              type="button"
              id="btn-presence-record-out"
              disabled={actionLoading}
              onClick={() => handleAction('OUT')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                status === 'OUT'
                  ? 'bg-slate-100 text-slate-600 hover:bg-amber-600 hover:text-white border border-slate-200'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 hover:shadow-amber-300'
              }`}
            >
              <LogOut className="w-4 h-4 text-amber-200 group-hover:text-white" />
              <span>RECORD OUT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Recent Sessions History */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Recent In / Out Sessions
          </span>
          <span className="text-xs text-slate-400">
            {history.length} logged records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            No attendance sessions recorded yet. Click <strong>RECORD IN</strong> or <strong>RECORD OUT</strong> above to start tracking.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
            {history.slice(0, 10).map((item) => {
              const dateStr = item.date || item.createdAt.split('T')[0];
              const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isEntry = item.status === 'IN';
              return (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isEntry ? 'IN' : 'OUT'}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800">
                        {isEntry ? 'Checked IN to Hostel' : 'Checked OUT of Hostel'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {dateStr} at {timeStr}
                        {item.notes ? ` • Note: "${item.notes}"` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {item.durationMinutes ? (
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Logged</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
