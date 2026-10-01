import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Resident, Room, HostelSettings, Bill } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  ArrowRightLeft,
  UserMinus,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Home,
  Briefcase,
  Shield,
  FileText,
  X,
  Plus,
  Key,
} from 'lucide-react';

export const ResidentManagement: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');

  // Modals
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutResident, setCheckoutResident] = useState<Resident | null>(null);
  const [checkoutData, setCheckoutData] = useState({
    deductionAmount: 0,
    deductionReason: '',
    remarks: '',
  });

  // Generated credentials popup after onboarding
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  // Onboarding form state
  const [onboardForm, setOnboardForm] = useState({
    fullName: '',
    phone: '',
    altPhone: '',
    email: '',
    dob: '2000-01-01',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    permanentAddress: '',
    cityStatePin: '',
    workOrCollegeName: '',
    designationOrCourse: '',
    roomNumber: '',
    bedNumber: '',
    idProofType: 'Aadhaar Card' as 'Aadhaar Card' | 'Passport' | 'PAN Card' | 'Voter ID' | 'Driving License',
    idProofNumber: '',
    emergencyContactName: '',
    emergencyContactRelation: 'Parent',
    emergencyContactPhone: '',
    securityDeposit: 4500,
    securityDepositStatus: 'Paid' as 'Paid' | 'Pending',
    joiningDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, rms, set] = await Promise.all([
        api.getResidents(),
        api.getRooms(),
        api.getSettings(),
      ]);
      setResidents(res);
      setRooms(rms);
      setSettings(set);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredResidents = residents.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (floorFilter !== 'all' && r.floor !== Number(floorFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.fullName.toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchPhone = r.phone.includes(q);
      if (!matchName && !matchId && !matchRoom && !matchPhone) return false;
    }
    return true;
  });

  const handleRoomSelectInOnboarding = (roomNum: string) => {
    const selRoom = rooms.find((r) => r.roomNumber === roomNum);
    if (!selRoom) return;

    const availableBed = selRoom.beds.find((b) => !b.isOccupied);
    const roomDeposit = selRoom.type === 'single'
      ? (settings?.defaultSecurityDepositSingle ?? 4500)
      : (settings?.defaultSecurityDepositDouble ?? 3500);

    setOnboardForm({
      ...onboardForm,
      roomNumber: roomNum,
      bedNumber: availableBed ? availableBed.bedNumber : 'Bed 1',
      securityDeposit: roomDeposit,
    });
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.fullName || !onboardForm.phone || !onboardForm.roomNumber) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const res = await api.createResident(onboardForm);
      setIsOnboardModalOpen(false);
      setCreatedCredentials(res.loginCredentials);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to onboard resident');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResident) return;

    try {
      await api.updateResident(editingResident.id, editingResident);
      setIsEditModalOpen(false);
      setEditingResident(null);
      await loadData();
      alert('Resident updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update resident');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutResident) return;

    try {
      await api.checkoutResident(checkoutResident.id, checkoutData);
      setIsCheckoutModalOpen(false);
      setCheckoutResident(null);
      await loadData();
      alert('Resident successfully checked out and security deposit settlement recorded.');
    } catch (err: any) {
      alert(err.message || 'Failed to checkout resident');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Resident CRM & Onboarding
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete database of tenant profiles, ID verification, bed assignment, contract rents, and checkout management.
          </p>
        </div>

        <button
          onClick={() => {
            const availableRoom = rooms.find((r) => r.beds.some((b) => !b.isOccupied));
            const availableBed = availableRoom?.beds.find((b) => !b.isOccupied);
            const initialDeposit = availableRoom?.type === 'single'
              ? (settings?.defaultSecurityDepositSingle ?? 4500)
              : (settings?.defaultSecurityDepositDouble ?? 3500);
            setOnboardForm({
              ...onboardForm,
              roomNumber: availableRoom?.roomNumber || '',
              bedNumber: availableBed?.bedNumber || '',
              securityDeposit: initialDeposit,
            });
            setIsOnboardModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Onboard / Check-in Resident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Resident Statuses</option>
            <option value="Active">Active Tenants</option>
            <option value="Notice Period">Notice Period</option>
            <option value="Vacated">Vacated / Checked-out</option>
          </select>

          {/* Floor filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1 (101–107)</option>
            <option value="2">Floor 2 (201–207)</option>
            <option value="3">Floor 3 (301–307)</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, phone, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Resident</th>
                <th className="py-3 px-4">Room & Bed</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Rent / Mo</th>
                <th className="py-3 px-4">Deposit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredResidents.length > 0 ? (
                filteredResidents.map((resident) => {
                  return (
                    <tr key={resident.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resident.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                            alt={resident.fullName}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{resident.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{resident.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Room & Bed */}
                      <td className="py-3 px-4">
                        {resident.roomNumber ? (
                          <div>
                            <span className="font-bold text-indigo-700">
                              Room {resident.roomNumber} ({resident.bedNumber})
                            </span>
                            <div className="text-[10px] text-slate-500 capitalize">
                              Floor {resident.floor} • {resident.roomType} living
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None (Vacated)</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{resident.phone}</div>
                        <div className="text-[11px] text-slate-400">{resident.email}</div>
                      </td>

                      {/* Rent */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          ₹{resident.monthlyRent.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-emerald-600">4 Meals Included</div>
                      </td>

                      {/* Security Deposit */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          ₹{resident.securityDeposit.toLocaleString('en-IN')}
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            resident.securityDepositStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {resident.securityDepositStatus}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            resident.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : resident.status === 'Notice Period'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {resident.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedResident(resident)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingResident({ ...resident });
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Resident"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {resident.status === 'Active' && (
                            <button
                              onClick={() => {
                                setCheckoutResident(resident);
                                setCheckoutData({
                                  deductionAmount: 0,
                                  deductionReason: '',
                                  remarks: '',
                                });
                                setIsCheckoutModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Checkout / Vacate"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No residents matching current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP: New Resident Generated Credentials */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Resident Onboarded Successfully!</h3>
                <p className="text-xs text-slate-500">Login credentials generated for the resident</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-indigo-900 font-medium">Username:</span>
                <span className="font-mono font-bold text-indigo-700">{createdCredentials.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-900 font-medium">Temporary Password:</span>
                <span className="font-mono font-bold text-indigo-700">{createdCredentials.password}</span>
              </div>
              <p className="text-[11px] text-indigo-800 pt-1">
                The resident can use these credentials to log in, view their room details, inspect invoices, submit complaints, and view meal menus.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Resident Profile */}
      {selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedResident.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                  alt={selectedResident.fullName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-200"
                />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedResident.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    Resident ID: <span className="font-mono font-semibold">{selectedResident.id}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {selectedResident.status}
                    </span>
                    <span className="text-xs text-slate-500">Joined: {selectedResident.joiningDate}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedResident(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room & Rent Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Room</span>
                <div className="text-sm font-bold text-indigo-700 mt-0.5">
                  Room {selectedResident.roomNumber} ({selectedResident.bedNumber})
                </div>
                <div className="text-[10px] text-slate-500">Floor {selectedResident.floor}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Room Type</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5 capitalize">
                  {selectedResident.roomType} Living
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Rent</span>
                <div className="text-sm font-bold text-emerald-600 mt-0.5">
                  ₹{selectedResident.monthlyRent.toLocaleString('en-IN')}/mo
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Security Deposit</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  ₹{selectedResident.securityDeposit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Personal & Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Personal & Contact Information
                </h4>
                <div>
                  <span className="text-slate-400">Phone:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedResident.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400">Alternate Phone:</span>{' '}
                  <span className="text-slate-800">{selectedResident.altPhone || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="text-slate-800">{selectedResident.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">DOB & Gender:</span>{' '}
                  <span className="text-slate-800">{selectedResident.dob} ({selectedResident.gender})</span>
                </div>
                <div>
                  <span className="text-slate-400">Permanent Address:</span>
                  <p className="text-slate-700 mt-0.5">{selectedResident.permanentAddress}, {selectedResident.cityStatePin}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Work, Study & Emergency
                </h4>
                <div>
                  <span className="text-slate-400">Work / College:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedResident.workOrCollegeName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Designation / Course:</span>{' '}
                  <span className="text-slate-800">{selectedResident.designationOrCourse}</span>
                </div>
                <div>
                  <span className="text-slate-400">ID Verification:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedResident.idProofType}</span> ({selectedResident.idProofNumber})
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-semibold text-rose-700 block">Emergency Contact:</span>
                  <div className="text-slate-800 mt-0.5">
                    {selectedResident.emergencyContactName} ({selectedResident.emergencyContactRelation})
                  </div>
                  <div className="font-medium text-slate-700">{selectedResident.emergencyContactPhone}</div>
                </div>
              </div>
            </div>

            {selectedResident.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Admin Remarks:</span> {selectedResident.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Onboard / Check-in Form */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" /> Onboard / Check-in New Resident
              </h3>
              <button onClick={() => setIsOnboardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={onboardForm.fullName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@example.com"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional secondary phone"
                    value={onboardForm.altPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, altPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Room & Bed Selection */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <span className="font-bold text-indigo-900 block text-xs">
                  Room Allocation (Automatic Rent & Meal Assignment)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Select Room *</label>
                    <select
                      required
                      value={onboardForm.roomNumber}
                      onChange={(e) => handleRoomSelectInOnboarding(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select an available room...</option>
                      {rooms
                        .filter((r) => r.beds.some((b) => !b.isOccupied))
                        .map((r) => (
                          <option key={r.id} value={r.roomNumber}>
                            Room {r.roomNumber} (Floor {r.floor} • {r.type} • ₹{r.rentPerPerson}/mo)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Bed Number *</label>
                    <select
                      required
                      value={onboardForm.bedNumber}
                      onChange={(e) => setOnboardForm({ ...onboardForm, bedNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {onboardForm.roomNumber &&
                        rooms
                          .find((r) => r.roomNumber === onboardForm.roomNumber)
                          ?.beds.filter((b) => !b.isOccupied)
                          .map((b) => (
                            <option key={b.id} value={b.bedNumber}>
                              {b.bedNumber} (Vacant)
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Security Caution Deposit Allocation */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 block text-xs">
                    Security Caution Deposit (Refundable)
                  </span>
                  {(() => {
                    const selR = rooms.find((r) => r.roomNumber === onboardForm.roomNumber);
                    if (!selR) return null;
                    return (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800">
                        {selR.type === 'single' ? 'Single Living Room (Default: ₹4,500)' : 'Double Living Room (Default: ₹3,500)'}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Security Deposit Amount (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        required
                        value={onboardForm.securityDeposit}
                        onChange={(e) => setOnboardForm({ ...onboardForm, securityDeposit: Number(e.target.value) })}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Refundable caution deposit (₹4,500 for Single / ₹3,500 for Double)
                    </p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deposit Payment Status *</label>
                    <select
                      value={onboardForm.securityDepositStatus}
                      onChange={(e) => setOnboardForm({ ...onboardForm, securityDepositStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Paid">Paid (Collected in Full)</option>
                      <option value="Pending">Pending (To be collected)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Status recorded in Security Deposit custody ledger
                    </p>
                  </div>
                </div>
              </div>

              {/* Work / College & ID Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">College / Employer</label>
                  <input
                    type="text"
                    placeholder="e.g. Infosys / Christ University"
                    value={onboardForm.workOrCollegeName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, workOrCollegeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Course</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer / B.Tech"
                    value={onboardForm.designationOrCourse}
                    onChange={(e) => setOnboardForm({ ...onboardForm, designationOrCourse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ID Proof Type *</label>
                  <select
                    value={onboardForm.idProofType}
                    onChange={(e) => setOnboardForm({ ...onboardForm, idProofType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ID Document Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234 5678 9012"
                    value={onboardForm.idProofNumber}
                    onChange={(e) => setOnboardForm({ ...onboardForm, idProofNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Parent / Guardian"
                    value={onboardForm.emergencyContactName}
                    onChange={(e) => setOnboardForm({ ...onboardForm, emergencyContactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship *</label>
                  <input
                    type="text"
                    required
                    placeholder="Father / Mother / Spouse"
                    value={onboardForm.emergencyContactRelation}
                    onChange={(e) => setOnboardForm({ ...onboardForm, emergencyContactRelation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={onboardForm.emergencyContactPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Confirm Check-in & Create Resident Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Checkout / Vacate Resident */}
      {isCheckoutModalOpen && checkoutResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-600" /> Checkout / Vacate Resident
              </h3>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Vacating <span className="font-bold text-slate-900">{checkoutResident.fullName}</span> from Room {checkoutResident.roomNumber}.
              This will free their bed and settle the security deposit.
            </p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Deposit Held:</span>
                  <span className="font-bold text-slate-900">₹{checkoutResident.securityDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deduction from Deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={checkoutResident.securityDeposit}
                  value={checkoutData.deductionAmount}
                  onChange={(e) => setCheckoutData({ ...checkoutData, deductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {checkoutData.deductionAmount > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deduction Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wall painting damage / Room key replacement"
                    value={checkoutData.deductionReason}
                    onChange={(e) => setCheckoutData({ ...checkoutData, deductionReason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between font-bold text-emerald-900">
                <span>Net Refund to Resident:</span>
                <span>₹{(checkoutResident.securityDeposit - checkoutData.deductionAmount).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Confirm Checkout & Release Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
