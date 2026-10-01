import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  LogOut,
  ChevronDown,
  Shield,
  User as UserIcon,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const { user, resident, settings, logout, quickSwitchUser } = useAuth();
  const navigate = useNavigate();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = user?.role === 'admin';

  const demoAccounts = [
    { username: 'admin', label: 'Rajesh Sharma (Hostel Owner / Admin)', role: 'admin', room: 'Management Office' },
    { username: 'aarav', label: 'Aarav Patel', role: 'resident', room: 'Room 101 (Single)' },
    { username: 'rohan', label: 'Rohan Verma', role: 'resident', room: 'Room 103 (Double Bed 1)' },
    { username: 'vikram', label: 'Vikram Sen', role: 'resident', room: 'Room 103 (Double Bed 2)' },
    { username: 'neha', label: 'Neha Kulkarni', role: 'resident', room: 'Room 201 (Single)' },
  ];

  const quickAlerts = [
    { id: 1, title: 'Security Deposit Separation Rule Active', time: 'Active', desc: 'Single: ₹4,500 • Double: ₹3,500 caution money', type: 'info' },
    { id: 2, title: 'Monthly Rent Cycle Active', time: 'Sep 2026', desc: 'Single ₹9,000 / mo • Double ₹6,500 / mo per person', type: 'rent' },
    { id: 3, title: 'Hostel Maintenance Routine', time: 'Today', desc: 'Overhead tank cleaning and RO filter servicing completed', type: 'service' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 lg:px-8 bg-white border-b border-slate-200 shadow-xs">
      {/* Left: Sidebar Toggle + Hostel Branding */}
      <div className="flex items-center gap-3">
        {/* Clearly Visible Sidebar Toggle Button */}
        <button
          type="button"
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="p-2 sm:px-2.5 sm:py-2 text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 group shadow-2xs"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle navigation sidebar"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          )}
          <span className="hidden sm:inline text-xs font-bold text-slate-700 group-hover:text-indigo-600">
            {isSidebarCollapsed ? 'Expand' : 'Menu'}
          </span>
        </button>

        {/* Hostel Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-300/40 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate max-w-xs sm:max-w-md">
              {settings?.hostelName || 'Greenfield Executive Residency'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-semibold text-slate-500">
                3 Floors • 21 Rooms
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Quick Role Switcher, Alerts, User Info, and Logout Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher */}
        <div className="relative">
          <button
            type="button"
            id="role-switcher-dropdown-btn"
            onClick={() => {
              setShowSwitchMenu(!showSwitchMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors shadow-2xs"
            title="Switch between Owner and Resident modes"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Role:</span>
            <span className="font-extrabold truncate max-w-[110px] sm:max-w-none">
              {isAdmin ? 'Owner / Admin' : 'Resident'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showSwitchMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSwitchMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Switch Active Role for Testing
                </div>

                <div className="divide-y divide-slate-100 p-1">
                  {demoAccounts.map((acc) => {
                    const isCurrent = user?.username === acc.username;
                    return (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => {
                          quickSwitchUser(acc.username);
                          setShowSwitchMenu(false);
                          if (acc.role === 'admin') navigate('/admin');
                          else navigate('/resident');
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                          isCurrent
                            ? 'bg-indigo-50 font-bold text-indigo-950 border border-indigo-200/60'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              acc.role === 'admin'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {acc.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="leading-tight truncate font-bold text-slate-900">{acc.label}</p>
                            <p className="text-[10px] text-slate-500 font-normal truncate">{acc.room}</p>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold shrink-0">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications / Alerts Button */}
        <div className="relative">
          <button
            type="button"
            id="notifications-dropdown-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSwitchMenu(false);
            }}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors"
            title="Hostel Notifications & System Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Hostel Notices & Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    3 Active
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {quickAlerts.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-left space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">{item.title}</p>
                        <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Block */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="relative">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                isAdmin ? 'bg-indigo-600' : 'bg-emerald-500'
              }`}
            ></span>
          </div>

          <div className="text-left leading-none">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="truncate max-w-[120px]">{user?.name || 'Hostel User'}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isAdmin ? 'Admin' : 'Resident'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[130px]">
              {isAdmin ? 'Hostel Management' : `Room ${resident?.roomNumber || 'Assigned'} (${resident?.bedNumber || 'Bed'})`}
            </p>
          </div>
        </div>

        {/* Prominent & Clearly Visible Logout Button */}
        <button
          type="button"
          id="header-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all shadow-2xs"
          title="Sign out of the system"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
