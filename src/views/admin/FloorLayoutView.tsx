import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Room, Resident, HostelSettings } from '../../types';
import {
  Layers,
  DoorClosed,
  Wifi,
  Users,
  Bed,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  Sparkles,
  Info,
  ChevronRight,
  Coffee,
} from 'lucide-react';

export const FloorLayoutView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [settings, setSettings] = useState<HostelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [rms, set] = await Promise.all([api.getRooms(), api.getSettings()]);
        setRooms(rms);
        setSettings(set);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'Available':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Available',
        };
      case 'Partially Occupied':
        return {
          bg: 'bg-blue-500/10 text-blue-700 border-blue-300',
          dot: 'bg-blue-500',
          label: 'Partially Occupied',
        };
      case 'Fully Occupied':
        return {
          bg: 'bg-slate-500/10 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
          label: 'Fully Occupied',
        };
      case 'Maintenance':
        return {
          bg: 'bg-rose-500/10 text-rose-700 border-rose-300',
          dot: 'bg-rose-500',
          label: 'Maintenance',
        };
      default:
        return {
          bg: 'bg-amber-500/10 text-amber-700 border-amber-300',
          dot: 'bg-amber-500',
          label: status,
        };
    }
  };

  const floors = [1, 2, 3];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-600" />
          Floor-Wise Architectural Layout
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Interactive floor plan displaying room statuses, bed occupancies, common living spaces, and floor amenities.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 text-xs shadow-2xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-700 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-slate-700 font-medium">Partially Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span className="text-slate-700 font-medium">Fully Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-700 font-medium">Under Maintenance</span>
        </div>
      </div>

      {/* Floors List */}
      <div className="space-y-8">
        {floors.map((floorNum) => {
          const floorRooms = rooms.filter((r) => r.floor === floorNum);
          const totalRooms = floorRooms.length;
          const occupiedRooms = floorRooms.filter((r) => r.beds.some((b) => b.isOccupied)).length;
          const availableRooms = totalRooms - occupiedRooms;
          const totalCapacity = floorRooms.reduce((acc, r) => acc + r.capacity, 0);
          const occupiedSeats = floorRooms.reduce(
            (acc, r) => acc + r.beds.filter((b) => b.isOccupied).length,
            0
          );
          const availableSeats = totalCapacity - occupiedSeats;

          return (
            <div
              key={floorNum}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
            >
              {/* Floor Header Bar */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 font-bold rounded-lg text-xs uppercase tracking-wider border border-indigo-500/30">
                      LEVEL {floorNum}
                    </span>
                    <h3 className="text-lg font-bold">
                      FLOOR {floorNum} ({floorNum}01 – {floorNum}07)
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-indigo-400" /> Free 5G Wi-Fi Active
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5 text-amber-400" /> 1 Common Living Lounge
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> RO Water Dispenser On Floor
                    </span>
                  </div>
                </div>

                {/* Floor Statistics Badges */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Rooms</span>
                    <span className="font-bold text-sm text-white">{totalRooms}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Occ Rms</span>
                    <span className="font-bold text-sm text-slate-200">{occupiedRooms}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Vacant</span>
                    <span className="font-bold text-sm text-emerald-400">{availableRooms}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Capacity</span>
                    <span className="font-bold text-sm text-white">{totalCapacity}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Occ Seats</span>
                    <span className="font-bold text-sm text-slate-200">{occupiedSeats}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-slate-400 block uppercase">Free Seats</span>
                    <span className="font-bold text-sm text-emerald-400">{availableSeats}</span>
                  </div>
                </div>
              </div>

              {/* Room Cards Runway on Floor (101 to 107) */}
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  {floorRooms.map((room) => {
                    const badge = getStatusBadge(room.status);
                    const occupiedBedsCount = room.beds.filter((b) => b.isOccupied).length;

                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-98 relative flex flex-col justify-between min-h-[140px] ${
                          selectedRoom?.id === room.id
                            ? 'ring-2 ring-indigo-600 shadow-md'
                            : 'hover:shadow-xs'
                        } ${badge.bg}`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-slate-900 tracking-tight">
                              {room.roomNumber}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                          </div>

                          <span className="text-[11px] font-semibold text-slate-600 block mt-1 capitalize">
                            {room.type} Living
                          </span>

                          <div className="text-[11px] text-slate-500 mt-1">
                            {occupiedBedsCount}/{room.capacity} Beds
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <div className="text-[11px] font-bold text-indigo-700">
                            ₹{room.rentPerPerson.toLocaleString('en-IN')}
                            <span className="text-[9px] font-normal text-slate-500">/mo</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {room.status}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Common Floor Area Card */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800">Floor {floorNum} Living Lounge:</span>
                    <span>Furnished sofas, TV station, hot water kettle, shared refrigerator & microwave.</span>
                  </div>
                  <div className="text-indigo-600 font-semibold text-[11px]">
                    Access for Rooms {floorNum}01 – {floorNum}07
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Room Details Drawer */}
      {selectedRoom && (
        <div className="p-6 bg-white rounded-2xl border-2 border-indigo-300 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Floor {selectedRoom.floor} Inspector
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Room {selectedRoom.roomNumber} ({selectedRoom.type} living)
              </h3>
              <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                <p>
                  <strong>Monthly Rent:</strong> ₹{selectedRoom.rentPerPerson.toLocaleString('en-IN')} / resident / month
                  {selectedRoom.type === 'double' && (
                    <span className="text-indigo-700 font-bold ml-1.5">
                      (Total Room Potential: ₹{(selectedRoom.rentPerPerson * 2).toLocaleString('en-IN')}/mo for 2 beds)
                    </span>
                  )}
                </p>
                <p>
                  <strong>Caution Deposit:</strong>{' '}
                  {selectedRoom.type === 'single'
                    ? '₹4,500 / resident (₹4,500 total room deposit)'
                    : '₹3,500 / resident (₹7,000 total room deposit for 2 residents)'}
                  <span className="text-slate-400 ml-2">• Status: {selectedRoom.status}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1 bg-slate-100 rounded-lg"
            >
              Close Details
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedRoom.beds.map((bed) => (
              <div
                key={bed.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{bed.bedNumber}</span>
                  <p className="text-[11px] text-slate-500">
                    {bed.isOccupied ? `Occupant: ${bed.residentName}` : 'Vacant Bed'}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    bed.isOccupied ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {bed.isOccupied ? 'Occupied' : 'Ready to Assign'}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-600 pt-2">
            <span className="font-semibold text-slate-800">Facilities:</span>{' '}
            {selectedRoom.facilities.join(' • ')}
          </div>
        </div>
      )}
    </div>
  );
};
