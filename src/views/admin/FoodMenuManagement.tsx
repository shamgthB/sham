import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { MealMenu } from '../../types';
import {
  UtensilsCrossed,
  Clock,
  Edit2,
  Check,
  X,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Info,
} from 'lucide-react';

export const FoodMenuManagement: React.FC = () => {
  const [meals, setMeals] = useState<MealMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState<MealMenu | null>(null);

  const loadMeals = async () => {
    setLoading(true);
    try {
      const data = await api.getMeals();
      setMeals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal) return;

    try {
      await api.updateMeal(editingMeal.id, editingMeal);
      setEditingMeal(null);
      await loadMeals();
      alert('Meal menu updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update menu');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-indigo-600" />
          Hostel Mess & Daily Food Menu
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          7-Day meal timetable featuring Breakfast, Lunch, Evening Snacks, and Dinner.
        </p>
      </div>

      {/* Info Callout: Meals Included */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300/80 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">All 4 Daily Meals are Included in Room Rent</h4>
            <p className="text-xs text-emerald-700">
              No additional mess fees. Single (₹9,000/mo) and Double (₹6,500/mo) accommodations include all meals.
            </p>
          </div>
        </div>

        <div className="text-xs text-emerald-800 font-semibold bg-white/70 px-3 py-1.5 rounded-xl border border-emerald-200">
          Timings: 7:30AM • 12:30PM • 5:00PM • 8:00PM
        </div>
      </div>

      {/* 7-Day Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {meals.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                {m.dayOfWeek}
              </span>
              <button
                onClick={() => setEditingMeal({ ...m })}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Day Menu"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Breakfast */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 uppercase tracking-wider text-[10px]">
                  <Sun className="w-3.5 h-3.5" /> Breakfast (7:30 AM – 9:30 AM)
                </div>
                <p className="text-slate-800 font-medium pl-5">{m.breakfast}</p>
              </div>

              {/* Lunch */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 uppercase tracking-wider text-[10px]">
                  <Coffee className="w-3.5 h-3.5" /> Lunch (12:30 PM – 2:30 PM)
                </div>
                <p className="text-slate-800 font-medium pl-5">{m.lunch}</p>
              </div>

              {/* Snacks */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-orange-700 uppercase tracking-wider text-[10px]">
                  <Sunset className="w-3.5 h-3.5" /> Evening Snacks (5:00 PM – 6:30 PM)
                </div>
                <p className="text-slate-800 font-medium pl-5">{m.snacks}</p>
              </div>

              {/* Dinner */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-700 uppercase tracking-wider text-[10px]">
                  <Moon className="w-3.5 h-3.5" /> Dinner (8:00 PM – 10:00 PM)
                </div>
                <p className="text-slate-800 font-medium pl-5">{m.dinner}</p>
              </div>
            </div>

            {m.specialTreat && (
              <div className="p-3 bg-indigo-50/70 border-t border-indigo-100 text-[11px] text-indigo-900 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Special: {m.specialTreat}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: Edit Menu */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit {editingMeal.dayOfWeek} Food Menu
              </h3>
              <button onClick={() => setEditingMeal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Breakfast Menu</label>
                <input
                  type="text"
                  required
                  value={editingMeal.breakfast}
                  onChange={(e) => setEditingMeal({ ...editingMeal, breakfast: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lunch Menu</label>
                <input
                  type="text"
                  required
                  value={editingMeal.lunch}
                  onChange={(e) => setEditingMeal({ ...editingMeal, lunch: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evening Snacks</label>
                <input
                  type="text"
                  required
                  value={editingMeal.snacks}
                  onChange={(e) => setEditingMeal({ ...editingMeal, snacks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dinner Menu</label>
                <input
                  type="text"
                  required
                  value={editingMeal.dinner}
                  onChange={(e) => setEditingMeal({ ...editingMeal, dinner: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Special Item / Treat</label>
                <input
                  type="text"
                  placeholder="e.g. Gulab Jamun or Ice Cream"
                  value={editingMeal.specialTreat || ''}
                  onChange={(e) => setEditingMeal({ ...editingMeal, specialTreat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
