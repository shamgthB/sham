import React, { useState } from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert, HeartPulse, Flame, Shield, HelpCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Resident } from '../types';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident;
  onTriggered?: () => void;
}

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({
  isOpen,
  onClose,
  resident,
  onTriggered,
}) => {
  const [emergencyType, setEmergencyType] = useState<'Medical' | 'Fire' | 'Security' | 'Other'>('Medical');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedAlert, setSubmittedAlert] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.triggerEmergencyAlert({
        emergencyType,
        description: description.trim() || undefined,
      });
      if (res?.success) {
        setSubmittedAlert(res.alert);
        if (onTriggered) onTriggered();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch SOS alert. Please call emergency contacts directly.');
    } finally {
      setLoading(false);
    }
  };

  const emergencyContacts = [
    { name: 'Hostel Chief Warden', number: '+91 98765 43210', available: '24/7 Priority Desk' },
    { name: 'Ambulance & Medical Emergency', number: '108', available: 'National Emergency' },
    { name: 'Police Helpline', number: '112', available: 'Toll-Free Immediate Dispatch' },
    { name: 'Fire Control Station', number: '101', available: 'Emergency Services' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-rose-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold animate-pulse shadow-md shadow-rose-300">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-950">EMERGENCY SOS ALERT</h2>
              <p className="text-xs text-rose-700">Immediate warden and owner alert dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submittedAlert ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  SOS Broadcast Dispatched!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Alert <strong>#{submittedAlert.id}</strong> has been transmitted to the Hostel Owner and emergency staff with your location: <strong>Room {resident.roomNumber}, Floor {resident.floor}</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Type:</span>
                  <span className="font-bold text-rose-600">{submittedAlert.emergencyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resident Mobile:</span>
                  <span className="font-bold text-slate-800">{resident.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-semibold text-slate-700">{new Date(submittedAlert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Direct call buttons */}
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Direct Emergency Hotlines
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:108"
                    className="py-2.5 px-3 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Call Ambulance (108)
                  </a>
                  <a
                    href="tel:112"
                    className="py-2.5 px-3 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Call Police (112)
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mt-2"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Resident location info */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Broadcast Location Details
                </div>
                <p className="text-rose-700">
                  {resident.fullName} • Room {resident.roomNumber} (Floor {resident.floor}, Bed {resident.bedNumber || 'Bed 1'}) • Contact: {resident.mobile}
                </p>
              </div>

              {/* Emergency Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Select Emergency Category
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: 'Medical', label: 'Medical Emergency', icon: HeartPulse, color: 'border-rose-500 bg-rose-50 text-rose-700' },
                    { type: 'Fire', label: 'Fire / Hazard', icon: Flame, color: 'border-orange-500 bg-orange-50 text-orange-700' },
                    { type: 'Security', label: 'Security / Intruder', icon: Shield, color: 'border-amber-500 bg-amber-50 text-amber-700' },
                    { type: 'Other', label: 'Other Urgent Distress', icon: HelpCircle, color: 'border-slate-500 bg-slate-50 text-slate-700' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = emergencyType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setEmergencyType(item.type as any)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? `${item.color} ring-2 ring-rose-500/20 shadow-sm font-bold`
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief Situation Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Severe chest pain / smoke in corridor / immediate help needed"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Emergency Contacts List */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Emergency Helplines
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {emergencyContacts.map((c) => (
                    <div key={c.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-[10px] text-slate-500">{c.available}</div>
                      </div>
                      <a
                        href={`tel:${c.number.replace(/\s+/g, '')}`}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-50 font-bold flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span className="text-xs">{c.number}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Trigger Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-confirm-trigger-sos"
                  disabled={loading}
                  onClick={handleTrigger}
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold bg-rose-600 hover:bg-rose-700 active:scale-98 text-white transition-all shadow-lg shadow-rose-300 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Broadcasting Emergency SOS...</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-5 h-5" />
                      <span>CONFIRM & TRIGGER EMERGENCY SOS NOW</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
