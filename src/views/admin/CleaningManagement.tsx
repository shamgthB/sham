import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { CleaningRecord, MaintenanceRecord, Room } from '../../types';
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Check,
  X,
  User,
  Calendar,
} from 'lucide-react';

export const CleaningManagement: React.FC = () => {
  const [cleaningRecords, setCleaningRecords] = useState<CleaningRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cleaning' | 'maintenance'>('cleaning');

  // Modals
  const [isAddCleaningModalOpen, setIsAddCleaningModalOpen] = useState(false);
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);

  // Add cleaning form
  const [cleaningForm, setCleaningForm] = useState({
    roomNumber: '101',
    cleaningType: 'Toilet and Bathroom Deep Clean' as CleaningRecord['cleaningType'],
    scheduledDate: new Date().toISOString().split('T')[0],
    cleanerName: 'Sita Ram Cleaning Team',
    notes: 'Sanitization of toilet fixtures and mop floors',
  });

  // Add maintenance form
  const [maintForm, setMaintForm] = useState({
    roomNumber: '101',
    issueType: 'Plumbing',
    description: '',
    priority: 'Medium' as MaintenanceRecord['priority'],
    estimatedCost: 800,
    actualCost: 0,
    contractorName: 'Vinod Services',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, m, rms] = await Promise.all([
        api.getCleaningRecords(),
        api.getMaintenanceRecords(),
        api.getRooms(),
      ]);
      setCleaningRecords(c);
      setMaintenanceRecords(m);
      setRooms(rms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCleaningStatus = async (record: CleaningRecord) => {
    const isNowDone = record.status !== 'Completed';
    try {
      await api.updateCleaningRecord(record.id, {
        status: isNowDone ? 'Completed' : 'Scheduled',
        completedDate: isNowDone ? new Date().toISOString().split('T')[0] : undefined,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update cleaning record');
    }
  };

  const handleAddCleaning = async (e: React.FormEvent) => {
    e.preventDefault();
    const selRoom = rooms.find((r) => r.roomNumber === cleaningForm.roomNumber);
    try {
      await api.createCleaningRecord({
        ...cleaningForm,
        floor: selRoom ? selRoom.floor : 1,
        status: 'Scheduled',
      });
      setIsAddCleaningModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add cleaning task');
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const selRoom = rooms.find((r) => r.roomNumber === maintForm.roomNumber);
    try {
      await api.createMaintenanceRecord({
        ...maintForm,
        floor: selRoom ? selRoom.floor : 1,
        status: 'Pending',
      });
      setIsAddMaintenanceModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add maintenance record');
    }
  };

  const handleUpdateMaintenanceStatus = async (record: MaintenanceRecord, status: MaintenanceRecord['status']) => {
    try {
      await api.updateMaintenanceRecord(record.id, {
        status,
        actualCost: status === 'Completed' ? record.estimatedCost : record.actualCost,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update maintenance record');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Hygiene, Cleaning & Maintenance Logistics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Weekly scheduled room & toilet sanitization compliance across all 21 rooms, plus repair work order ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'cleaning' ? (
            <button
              onClick={() => setIsAddCleaningModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Schedule Cleaning
            </button>
          ) : (
            <button
              onClick={() => setIsAddMaintenanceModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> New Work Order
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
        <button
          onClick={() => setActiveTab('cleaning')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cleaning'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Weekly Cleaning Schedule ({cleaningRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" /> Maintenance Work Orders ({maintenanceRecords.length})
        </button>
      </div>

      {/* TAB 1: Cleaning Schedule */}
      {activeTab === 'cleaning' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Standard Policy: English and Indian attached toilets receive deep chemical disinfection weekly.</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded shadow-2xs">
              All 21 Rooms
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Room & Floor</th>
                    <th className="py-3 px-4">Cleaning Activity</th>
                    <th className="py-3 px-4">Scheduled Date</th>
                    <th className="py-3 px-4">Assigned Cleaner</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cleaningRecords.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">Room {c.roomNumber}</span>
                        <div className="text-[10px] text-slate-400">Floor {c.floor}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{c.cleaningType}</div>
                        {c.notes && <div className="text-[10px] text-slate-500">{c.notes}</div>}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {c.scheduledDate}
                        {c.completedDate && (
                          <div className="text-[10px] text-emerald-600">Done: {c.completedDate}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700">{c.cleanerName}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleCleaningStatus(c)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shadow-2xs ${
                            c.status === 'Completed'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {c.status === 'Completed' ? 'Mark Scheduled' : 'Mark as Done'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Maintenance Work Orders */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-4">Est. vs Actual Cost</th>
                  <th className="py-3 px-4">Contractor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {maintenanceRecords.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{m.id}</td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      Room {m.roomNumber}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{m.issueType}</div>
                      <div className="text-[11px] text-slate-500">{m.description}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-600">Est: ₹{m.estimatedCost.toLocaleString('en-IN')}</div>
                      <div className="font-bold text-slate-900">
                        Actual: ₹{(m.actualCost || 0).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">{m.contractorName}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'In Progress'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {m.status !== 'Completed' ? (
                        <button
                          onClick={() => handleUpdateMaintenanceStatus(m, 'Completed')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">Repaired</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Cleaning */}
      {isAddCleaningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Schedule Cleaning Task
              </h3>
              <button onClick={() => setIsAddCleaningModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCleaning} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Room</label>
                <select
                  value={cleaningForm.roomNumber}
                  onChange={(e) => setCleaningForm({ ...cleaningForm, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.roomNumber}>
                      Room {r.roomNumber} (Floor {r.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cleaning Type</label>
                <select
                  value={cleaningForm.cleaningType}
                  onChange={(e) => setCleaningForm({ ...cleaningForm, cleaningType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Toilet and Bathroom Deep Clean">Toilet and Bathroom Deep Clean</option>
                  <option value="Room Sweeping and Mopping">Room Sweeping and Mopping</option>
                  <option value="Full Sanitization">Full Sanitization</option>
                  <option value="Bed Linen Wash">Bed Linen Wash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={cleaningForm.scheduledDate}
                  onChange={(e) => setCleaningForm({ ...cleaningForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Cleaner / Team</label>
                <input
                  type="text"
                  required
                  value={cleaningForm.cleanerName}
                  onChange={(e) => setCleaningForm({ ...cleaningForm, cleanerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={cleaningForm.notes}
                  onChange={(e) => setCleaningForm({ ...cleaningForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCleaningModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
