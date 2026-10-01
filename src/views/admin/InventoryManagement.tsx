import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { InventoryItem, InventoryCategory, DamageRecord, DamageStatus } from '../../types';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Layers,
  DoorOpen,
  DollarSign,
  FileText,
  Wrench,
  RefreshCw,
  X,
  ShieldCheck,
  Camera,
  Trash2,
} from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'damage'>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState<InventoryItem | null>(null);
  const [isRecordDamageOpen, setIsRecordDamageOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add item form
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Furniture' as InventoryCategory,
    totalQuantity: 1,
    unitCost: 1000,
    currentCondition: 'Good' as any,
    location: 'Main Store',
    notes: '',
  });

  // Assign form
  const [assignForm, setAssignForm] = useState({
    roomNumber: '101',
    floor: 1,
    quantity: 1,
    notes: '',
  });

  // Damage form
  const [damageForm, setDamageForm] = useState({
    roomNumber: '101',
    floor: 1,
    item: '',
    type: 'Damage' as any,
    description: '',
    estimatedCost: 500,
    residentName: '',
    chargeToResident: false,
    recoveryAmount: 500,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const invRes = await api.getInventoryItems(categoryFilter !== 'all' ? categoryFilter : undefined);
      setItems(invRes.items || []);
      setStats(invRes.stats || null);

      const dmgRes = await api.getDamageRecords();
      setDamageRecords(dmgRes || []);
    } catch (e) {
      console.error('Failed to load inventory data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInventoryItem(itemForm);
      setFeedback({ type: 'success', message: 'New inventory asset created successfully!' });
      setIsAddItemOpen(false);
      setItemForm({
        name: '',
        category: 'Furniture',
        totalQuantity: 1,
        unitCost: 1000,
        currentCondition: 'Good',
        location: 'Main Store',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add item' });
    }
  };

  const handleAssignItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAssign) return;
    try {
      await api.assignInventoryItem(selectedItemForAssign.id, assignForm);
      setFeedback({
        type: 'success',
        message: `Successfully assigned ${assignForm.quantity} unit(s) to Room ${assignForm.roomNumber}!`,
      });
      setIsAssignModalOpen(false);
      setSelectedItemForAssign(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign item' });
    }
  };

  const handleRecordDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.recordDamage(damageForm);
      setFeedback({ type: 'success', message: 'Damage / Loss incident recorded successfully!' });
      setIsRecordDamageOpen(false);
      setDamageForm({
        roomNumber: '101',
        floor: 1,
        item: '',
        type: 'Damage',
        description: '',
        estimatedCost: 500,
        residentName: '',
        chargeToResident: false,
        recoveryAmount: 500,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record damage' });
    }
  };

  const handleUpdateDamageStatus = async (id: string, status: DamageStatus, chargeRecovery = false) => {
    try {
      await api.reviewDamageRecord(id, {
        status,
        recoveryApproved: chargeRecovery,
      });
      setFeedback({ type: 'success', message: `Incident updated to ${status}` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update incident' });
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const name = (item.name || item.itemName || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-600" />
            Hostel Inventory & Asset Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track hostel assets, room assignments, furniture conditions, and resident damage recoveries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset / Item</span>
          </button>
          <button
            onClick={() => setIsRecordDamageOpen(true)}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Damage / Loss</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400">Total Unique Items</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalUniqueItems || items.length}</div>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-emerald-700">In Stock / Available</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats?.availableUnits || 0} units</div>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-indigo-700">Assigned to Rooms</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{stats?.assignedUnits || 0} units</div>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-rose-700">Damaged / Missing</div>
          <div className="text-2xl font-black text-rose-900 mt-1">
            {(stats?.damagedUnits || 0) + (stats?.lostUnits || 0)} units
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Inventory Catalog ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('damage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'damage'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Damage & Loss Incident Logs ({damageRecords.length})</span>
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inventory assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Furniture">Furniture</option>
                <option value="Electrical">Electrical</option>
                <option value="Sanitary">Sanitary</option>
                <option value="Bedding">Bedding</option>
                <option value="Appliances">Appliances</option>
                <option value="Safety & Security">Safety & Security</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Item Name & Code</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Total Stock</th>
                  <th className="py-3.5 px-4">Available</th>
                  <th className="py-3.5 px-4">Assigned</th>
                  <th className="py-3.5 px-4">Damaged/Lost</th>
                  <th className="py-3.5 px-4">Condition</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{item.name || item.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{item.totalQuantity}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">{item.availableQuantity}</td>
                    <td className="py-3.5 px-4 text-indigo-600 font-bold">{item.assignedQuantity}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-bold">
                      {item.damagedQuantity + item.lostQuantity}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.currentCondition || item.condition || 'Good'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForAssign(item);
                          setIsAssignModalOpen(true);
                        }}
                        disabled={item.availableQuantity <= 0}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.availableQuantity > 0
                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Assign to Room
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Damage & Loss Incident Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {damageRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No damage or loss incidents reported yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Incident ID & Item</th>
                  <th className="py-3.5 px-4">Room & Resident</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Estimated Cost</th>
                  <th className="py-3.5 px-4">Recovery Status</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {damageRecords.map((dmg) => (
                  <tr key={dmg.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{dmg.item || dmg.itemName || 'Asset'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{dmg.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">Room {dmg.roomNumber} (Fl {dmg.floor})</div>
                      <div className="text-[10px] text-slate-500">{dmg.residentName || 'Unassigned'}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">{dmg.description}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">₹{dmg.estimatedCost.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      {dmg.recoveryApproved || dmg.recoveryChargeApproved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Charged: ₹{dmg.chargeToResidentAmount || dmg.recoveryAmount || dmg.estimatedCost}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Hostel Expense</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {dmg.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {dmg.status !== 'Closed' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateDamageStatus(dmg.id, 'Confirmed', true)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold"
                          >
                            Charge Resident
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDamageStatus(dmg.id, 'Repaired', false)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                          >
                            Mark Repaired
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900">Add New Inventory Asset</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Study Table, Ceiling Fan, Mattress"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Sanitary">Sanitary</option>
                    <option value="Bedding">Bedding</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Safety & Security">Safety & Security</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemForm.totalQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, totalQuantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Condition</label>
                  <select
                    value={itemForm.currentCondition}
                    onChange={(e) => setItemForm({ ...itemForm, currentCondition: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddItemOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Item Modal */}
      {isAssignModalOpen && selectedItemForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900">Assign to Room: {selectedItemForAssign.name || selectedItemForAssign.itemName}</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAssignItem} className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl">
                Available In Stock: <strong>{selectedItemForAssign.availableQuantity} units</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Target Room Number</label>
                  <input
                    type="text"
                    required
                    value={assignForm.roomNumber}
                    onChange={(e) => setAssignForm({ ...assignForm, roomNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Floor</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={assignForm.floor}
                    onChange={(e) => setAssignForm({ ...assignForm, floor: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Quantity to Assign</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForAssign.availableQuantity}
                  value={assignForm.quantity}
                  onChange={(e) => setAssignForm({ ...assignForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Damage Modal */}
      {isRecordDamageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-base font-bold text-slate-900">Record Damage / Asset Loss</h3>
              <button onClick={() => setIsRecordDamageOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleRecordDamage} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={damageForm.roomNumber}
                    onChange={(e) => setDamageForm({ ...damageForm, roomNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Item / Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wardrobe door, Tap, Fan"
                    value={damageForm.item}
                    onChange={(e) => setDamageForm({ ...damageForm, item: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Responsible Resident Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={damageForm.residentName}
                  onChange={(e) => setDamageForm({ ...damageForm, residentName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description of Damage *</label>
                <textarea
                  required
                  rows={2}
                  value={damageForm.description}
                  onChange={(e) => setDamageForm({ ...damageForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={damageForm.estimatedCost}
                    onChange={(e) => setDamageForm({ ...damageForm, estimatedCost: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={damageForm.chargeToResident}
                      onChange={(e) => setDamageForm({ ...damageForm, chargeToResident: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <span className="font-semibold text-rose-700">Charge to resident</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsRecordDamageOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-sm">Record Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
