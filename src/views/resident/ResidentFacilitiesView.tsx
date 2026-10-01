import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { MealMenu } from '../../types';
import {
  UtensilsCrossed,
  Wifi,
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  Droplets,
  Zap,
  Shirt,
  Moon,
  Sun,
  Sunset,
  Coffee,
  QrCode,
} from 'lucide-react';

export const ResidentFacilitiesView: React.FC = () => {
  const { settings } = useAuth();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealMenu[]>([]);

  useEffect(() => {
    api.getMeals().then(setMeals).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Hostel Amenities, Mess Timetable & Code of Conduct
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Everything included in your stay: all 4 daily meals, gigabit Wi-Fi, 24-hr electricity, RO water, and laundry.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/resident/qr-checkin')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Facility Pass</span>
        </button>
      </div>

      {/* Inclusions Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">4 Meals Daily Included</h3>
          <p className="text-[11px] text-slate-500">
            Hygienic vegetarian & non-vegetarian food cooked fresh in our automated kitchen. No extra charges.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Wifi className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">High-Speed Wi-Fi</h3>
          <p className="text-[11px] text-slate-500">
            Dual-band mesh access points on Floors 1, 2, and 3 with unlimited fiber bandwidth.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">24/7 Power Backup</h3>
          <p className="text-[11px] text-slate-500">
            Silent generator and inverter backup ensures uninterrupted lighting, study lamps, and Wi-Fi.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Droplets className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">RO Water & Hot Geysers</h3>
          <p className="text-[11px] text-slate-500">
            Mineralized chilled RO water dispensers on every corridor and instant hot geysers in attached toilets.
          </p>
        </div>
      </div>

      {/* 7-Day Food Schedule */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
              Weekly Mess Timetable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dining Hall: Ground Floor • Breakfast 7:30–9:30 AM | Lunch 12:30–2:30 PM | Snacks 5:00–6:30 PM | Dinner 8:00–10:00 PM
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto">
            Zero Extra Charges
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meals.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs">
              <div className="font-bold text-indigo-900 text-sm border-b border-slate-200 pb-1.5 flex justify-between items-center">
                <span>{m.dayOfWeek}</span>
                {m.specialTreat && (
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                    ★ {m.specialTreat}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-slate-700">
                <p><b className="text-amber-800">Breakfast:</b> {m.breakfast}</p>
                <p><b className="text-indigo-800">Lunch:</b> {m.lunch}</p>
                <p><b className="text-orange-800">Snacks:</b> {m.snacks}</p>
                <p><b className="text-purple-800">Dinner:</b> {m.dinner}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hostel Rules & Timings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Important Campus Timings
          </h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Main Gate Curfew:</span>
              <span className="font-bold text-slate-900">10:30 PM (Late pass requires prior approval)</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Laundry Room Hours:</span>
              <span className="font-bold text-slate-900">6:00 AM – 9:00 PM (Semi-automatic washers)</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Silent Study Hours:</span>
              <span className="font-bold text-slate-900">11:00 PM – 6:00 AM</span>
            </li>
            <li className="flex justify-between pb-1">
              <span>Visitor / Guest Hours:</span>
              <span className="font-bold text-slate-900">10:00 AM – 7:00 PM (Common reception lobby only)</span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Resident Code of Conduct & Guidelines
          </h3>
          <ul className="space-y-2 text-slate-600 list-disc pl-4">
            <li>Strict no-smoking, no-alcohol, and substance-free campus policy.</li>
            <li>Respect fellow roommates and keep music/multimedia to headphones during study hours.</li>
            <li>Turn off AC, fans, and study lamps when stepping out to promote sustainability.</li>
            <li>Report plumbing, electrical, or Wi-Fi defects immediately via the Resident Portal ticketing tool.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
