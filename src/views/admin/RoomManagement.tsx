import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Room, Resident, Bill, HostelSettings } from '../../types';
import {
  DoorClosed,
  Bed,
  Plus,
  Edit2,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Check,
  X,
  ArrowRightLeft,
  UserMinus,
  Sparkles,
  Info,
} from 'lucide-react';

interface RoomManagementProps {
  onNavigateToResidents?: () => void;
  onNavigateToBilling?: () => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  onNavigateToResidents,
  onNavigateToBilling,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeRoomDetail, setActiveRoomDetail] = useState<Room | null>(null);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Move resident modal
  const [moveModalData, setMoveModalData] = useState<{ resident: Resident; currentRoom: Room } | null>(null);
  const [targetRoomNumber, setTargetRoomNumber] = useState('');
  const [targetBedNumber, setTargetBedNumber] = useState('');

  // Form states for Add Room
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState(1);
  const [newType, setNewType] = useState<'single' | 'double'>('single');
  const [newCapacity, setNewCapacity] = useState(1);
  const [newRent, setNewRent] = useState(9000);
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rms, res, bls, set] = await Promise.all([
        api.getRooms(),
        api.getResidents(),
        api.getBills(),
        api.getSettings(),
      ]);
      setRooms(rms);
      setResidents(res);
      setBills(bls);
      setSettings(set);
    } catch (err) {
      console.error('Error fetching room management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor !== selectedFloor) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchOccupant = r.beds.some((b) => b.residentName?.toLowerCase().includes(q));
      if (!matchRoom && !matchOccupant) return false;
    }
    return true;
  });

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Partially Occupied':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Fully Occupied':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Maintenance':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber) return;

    try {
      await api.createRoom({
        roomNumber: newRoomNumber,
        floor: Number(newFloor),
        type: newType,
        capacity: Number(newCapacity),
        rentPerPerson: Number(newRent),
        notes: newNotes,
      });
      setIsAddRoomModalOpen(false);
      setNewRoomNumber('');
      setNewNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add room');
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    try {
      await api.updateRoom(editingRoom.id, {
        type: editingRoom.type,
        capacity: editingRoom.capacity,
        status: editingRoom.status,
        rentPerPerson: editingRoom.rentPerPerson,
        notes: editingRoom.notes,
        facilities: editingRoom.facilities,
      });
      setIsEditRoomModalOpen(false);
      setEditingRoom(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update room');
    }
  };

  const handleToggleMaintenance = async (room: Room) => {
    const newStatus = room.status === 'Maintenance' ? 'Available' : 'Maintenance';
    try {
      await api.updateRoom(room.id, { status: newStatus });
      await loadData();
      if (activeRoomDetail?.id === room.id) {
        setActiveRoomDetail({ ...activeRoomDetail, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle maintenance status');
    }
  };

  const handleMoveResident = async () => {
    if (!moveModalData || !targetRoomNumber || !targetBedNumber) return;

    try {
      await api.changeResidentRoom(moveModalData.resident.id, {
        newRoomNumber: targetRoomNumber,
        newBedNumber: targetBedNumber,
        updateRent: true,
      });
      setMoveModalData(null);
      setTargetRoomNumber('');
      setTargetBedNumber('');
      await loadData();
      alert(`Resident ${moveModalData.resident.fullName} moved successfully to Room ${targetRoomNumber} (${targetBedNumber})`);
    } catch (err: any) {
      alert(err.message || 'Failed to move resident');
    }
  };

  const handleVacateResident = async (residentId: string) => {
    if (!confirm('Are you sure you want to vacate/check-out this resident? This will free their bed.')) return;
    try {
      await api.checkoutResident(residentId, {
        remarks: 'Vacated from Room Management view',
      });
      await loadData();
      if (activeRoomDetail) {
        const updated = await api.getRooms();
        const cur = updated.find((r) => r.id === activeRoomDetail.id);
        if (cur) setActiveRoomDetail(cur);
      }
      alert('Resident checked out successfully and bed released.');
    } catch (err: any) {
      alert(err.message || 'Failed to vacate resident');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DoorClosed className="w-6 h-6 text-indigo-600" />
            Room & Bed Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            21 Initial Logical Rooms (101–107 on Floor 1, 201–207 on Floor 2, 301–307 on Floor 3). Owner can add or expand rooms dynamically.
          </p>
        </div>

        <button
          onClick={() => {
            setNewType('single');
            setNewCapacity(1);
            setNewRent(settings?.singleRent || 9000);
            setIsAddRoomModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Room
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Floor tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedFloor === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Floors
            </button>
            <button
              onClick={() => setSelectedFloor(1)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedFloor === 1
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Floor 1 (101–107)
            </button>
            <button
              onClick={() => setSelectedFloor(2)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedFloor === 2
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Floor 2 (201–207)
            </button>
            <button
              onClick={() => setSelectedFloor(3)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedFloor === 3
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Floor 3 (301–307)
            </button>
          </div>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Room Types</option>
            <option value="single">Single Living (1 Bed • ₹{settings?.singleRent.toLocaleString('en-IN')})</option>
            <option value="double">Double Living (2 Beds • ₹{settings?.doubleRent.toLocaleString('en-IN')}/person)</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Partially Occupied">Partially Occupied</option>
            <option value="Fully Occupied">Fully Occupied</option>
            <option value="Maintenance">Under Maintenance</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search room # or resident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredRooms.map((room) => {
          const occupiedCount = room.beds.filter((b) => b.isOccupied).length;
          const availableCount = room.capacity - occupiedCount;
          const isSingle = room.type === 'single';

          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Room Card Top Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Floor {room.floor}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      Room {room.roomNumber}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusColor(room.status)}`}>
                        {room.status}
                      </span>
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Rent / Resident</span>
                    <div className="text-base font-bold text-indigo-600">
                      ₹{room.rentPerPerson.toLocaleString('en-IN')}
                      <span className="text-[10px] font-normal text-slate-400">/mo</span>
                    </div>
                    {room.type === 'double' && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Room Total: ₹{(room.rentPerPerson * 2).toLocaleString('en-IN')}/mo
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md capitalize">
                    {room.type} Living
                  </span>
                  <span>•</span>
                  <span>Capacity: {room.capacity} Bed{room.capacity > 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span className={availableCount > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                    {availableCount} Available
                  </span>
                </div>

                {/* Deposit & Revenue Accounting Note */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Caution Deposit:</span>
                  <span className="font-bold text-slate-700">
                    {room.type === 'single'
                      ? '₹4,500 / resident (₹4,500 room total)'
                      : '₹3,500 / resident (₹7,000 room total)'}
                  </span>
                </div>
              </div>

              {/* Individual Bed Tracking Section */}
              <div className="p-5 bg-slate-50/60 flex-1 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Individual Bed Allocations
                </span>

                <div className="space-y-2">
                  {room.beds.map((bed, idx) => (
                    <div
                      key={bed.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        bed.isOccupied
                          ? 'bg-white border-indigo-200 shadow-2xs'
                          : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bed className={`w-4 h-4 ${bed.isOccupied ? 'text-indigo-600' : 'text-emerald-600'}`} />
                        <div>
                          <span className="font-bold text-slate-800">{bed.bedNumber}</span>
                          {bed.isOccupied && bed.residentName ? (
                            <p className="text-[11px] text-indigo-700 font-medium">{bed.residentName}</p>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-semibold">Vacant / Ready</p>
                          )}
                        </div>
                      </div>

                      {bed.isOccupied ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                          Occupied
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          Available
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Key Facilities Snapshot */}
                <div className="pt-2 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">Toilet & Bath:</span>{' '}
                  {isSingle ? '1 English Toilet, Attached Bath' : '1 Indian Toilet, Attached Bath'}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveRoomDetail(room)}
                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors text-center"
                >
                  View Details & Occupants
                </button>

                <button
                  onClick={() => {
                    setEditingRoom(room);
                    setIsEditRoomModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit Room"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleMaintenance(room)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    room.status === 'Maintenance'
                      ? 'bg-rose-100 text-rose-700'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={room.status === 'Maintenance' ? 'Remove from maintenance' : 'Mark under maintenance'}
                >
                  <Wrench className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Full Room Details & Occupant Inspector */}
      {activeRoomDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Floor {activeRoomDetail.floor} • Room Details
                </span>
                <h3 className="text-2xl font-black text-slate-900">
                  Room {activeRoomDetail.roomNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                  {activeRoomDetail.type} Living Accommodation • Capacity: {activeRoomDetail.capacity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(activeRoomDetail.status)}`}>
                  {activeRoomDetail.status}
                </span>
                <button
                  onClick={() => setActiveRoomDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Room Rent & Pricing Calculation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Rent Per Person</span>
                <div className="text-base font-bold text-slate-900">
                  ₹{activeRoomDetail.rentPerPerson.toLocaleString('en-IN')}/mo
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Room Yield</span>
                <div className="text-base font-bold text-indigo-700">
                  ₹{activeRoomDetail.totalRoomRent.toLocaleString('en-IN')}/mo
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Food & Facilities</span>
                <div className="text-xs font-semibold text-emerald-700">4 Meals Included</div>
              </div>
            </div>

            {/* Current Occupants List with Payment Status */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Assigned Occupants & Beds</span>
                <span className="text-indigo-600 font-semibold text-xs">
                  {activeRoomDetail.beds.filter((b) => b.isOccupied).length} of {activeRoomDetail.capacity} Occupied
                </span>
              </h4>

              <div className="space-y-3">
                {activeRoomDetail.beds.map((bed) => {
                  const residentDoc = bed.residentId
                    ? residents.find((r) => r.id === bed.residentId)
                    : null;
                  const residentBills = bed.residentId
                    ? bills.filter((b) => b.residentId === bed.residentId)
                    : [];
                  const latestBill = residentBills[0];

                  return (
                    <div
                      key={bed.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {bed.bedNumber}
                        </div>
                        <div>
                          {bed.isOccupied ? (
                            <>
                              <h5 className="text-sm font-bold text-slate-900">
                                {residentDoc?.fullName || bed.residentName}
                              </h5>
                              <p className="text-xs text-slate-500">
                                ID: {residentDoc?.id || bed.residentId} • Joined: {residentDoc?.joiningDate || 'Active'}
                              </p>
                            </>
                          ) : (
                            <>
                              <h5 className="text-sm font-bold text-emerald-600">Available Bed / Seat</h5>
                              <p className="text-xs text-slate-400">Ready for new tenant check-in</p>
                            </>
                          )}
                        </div>
                      </div>

                      {bed.isOccupied && residentDoc && (
                        <div className="flex flex-wrap items-center gap-2">
                          {latestBill && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                latestBill.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Rent: {latestBill.status}
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setMoveModalData({
                                resident: residentDoc,
                                currentRoom: activeRoomDetail,
                              });
                            }}
                            className="p-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 border border-indigo-200 font-semibold"
                            title="Move to another room"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Move
                          </button>

                          <button
                            onClick={() => handleVacateResident(residentDoc.id)}
                            className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 border border-rose-200 font-semibold"
                            title="Vacate resident"
                          >
                            <UserMinus className="w-3.5 h-3.5" /> Vacate
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Facilities List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Room Facilities & Fixtures
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeRoomDetail.facilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            {activeRoomDetail.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Room Notes:</span> {activeRoomDetail.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add New Room */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> Add Room to Hostel
              </h3>
              <button onClick={() => setIsAddRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 401"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Floor *</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={newFloor}
                    onChange={(e) => setNewFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as 'single' | 'double';
                      setNewType(t);
                      if (t === 'single') {
                        setNewCapacity(1);
                        setNewRent(settings?.singleRent || 9000);
                      } else {
                        setNewCapacity(2);
                        setNewRent(settings?.doubleRent || 6500);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="single">Single Living</option>
                    <option value="double">Double Living</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Beds)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rent Per Person (₹/month) *</label>
                <input
                  type="number"
                  required
                  value={newRent}
                  onChange={(e) => setNewRent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Specifics</label>
                <input
                  type="text"
                  placeholder="e.g. Corner room with balcony"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save & Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Room */}
      {isEditRoomModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Room {editingRoom.roomNumber}</h3>
              <button onClick={() => setIsEditRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                  <select
                    value={editingRoom.type}
                    onChange={(e) =>
                      setEditingRoom({
                        ...editingRoom,
                        type: e.target.value as 'single' | 'double',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="single">Single Living</option>
                    <option value="double">Double Living</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={editingRoom.capacity}
                    onChange={(e) =>
                      setEditingRoom({
                        ...editingRoom,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Status</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      status: e.target.value as Room['status'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Available">Available</option>
                  <option value="Partially Occupied">Partially Occupied</option>
                  <option value="Fully Occupied">Fully Occupied</option>
                  <option value="Maintenance">Under Maintenance</option>
                  <option value="Temporarily Unavailable">Temporarily Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rent Per Person (₹/mo)</label>
                <input
                  type="number"
                  value={editingRoom.rentPerPerson}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      rentPerPerson: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingRoom.notes || ''}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditRoomModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Move Resident To Another Room */}
      {moveModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                Move Resident: {moveModalData.resident.fullName}
              </h3>
              <button onClick={() => setMoveModalData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Current: Room {moveModalData.currentRoom.roomNumber} ({moveModalData.resident.bedNumber})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Room Number</label>
                <select
                  value={targetRoomNumber}
                  onChange={(e) => {
                    setTargetRoomNumber(e.target.value);
                    const selRoom = rooms.find((r) => r.roomNumber === e.target.value);
                    const openBed = selRoom?.beds.find((b) => !b.isOccupied);
                    if (openBed) setTargetBedNumber(openBed.bedNumber);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Destination Room...</option>
                  {rooms
                    .filter((r) => r.beds.some((b) => !b.isOccupied))
                    .map((r) => (
                      <option key={r.id} value={r.roomNumber}>
                        Room {r.roomNumber} (Floor {r.floor} • {r.type} • ₹{r.rentPerPerson}/mo)
                      </option>
                    ))}
                </select>
              </div>

              {targetRoomNumber && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Available Bed</label>
                  <select
                    value={targetBedNumber}
                    onChange={(e) => setTargetBedNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {rooms
                      .find((r) => r.roomNumber === targetRoomNumber)
                      ?.beds.filter((b) => !b.isOccupied)
                      .map((b) => (
                        <option key={b.id} value={b.bedNumber}>
                          {b.bedNumber} (Vacant)
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMoveModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetRoomNumber || !targetBedNumber}
                onClick={handleMoveResident}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
