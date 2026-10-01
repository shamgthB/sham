import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  LayoutDashboard,
  DoorClosed,
  Layers,
  Users,
  Receipt,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
  Megaphone,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  BedDouble,
  FileText,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  QrCode,
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, resident } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [pendingApprovals, setPendingApprovals] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      try {
        const stats = await api.getDashboardStats();
        if (typeof stats.pendingRegistrationsCount === 'number') {
          setPendingApprovals(stats.pendingRegistrationsCount);
        }
      } catch {
        // silent
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Compute active tab from pathname if currentTab is not passed
  const getTabFromPath = (path: string): string => {
    if (path === '/admin') return 'dashboard';
    if (path.startsWith('/admin/approvals')) return 'approvals';
    if (path.startsWith('/admin/attendance')) return 'attendance';
    if (path.startsWith('/admin/')) return path.replace('/admin/', '');
    if (path === '/resident/facilities') return 'facilities';
    if (path === '/resident/qr-checkin') return 'qr-checkin';
    if (path === '/resident/messages') return 'messages';
    if (path.startsWith('/resident')) return 'my-room';
    return 'dashboard';
  };

  const activeTab = currentTab || getTabFromPath(location.pathname);

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null },
    {
      id: 'approvals',
      label: 'Resident Approval Requests',
      icon: UserCheck,
      badge: pendingApprovals > 0 ? `${pendingApprovals} Pending` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'rooms', label: 'Room & Bed Management', icon: DoorClosed, badge: '21 Rooms' },
    { id: 'floors', label: 'Floor-Wise Layout', icon: Layers, badge: '3 Floors' },
    { id: 'residents', label: 'Resident CRM & Check-in', icon: Users, badge: null },
    { id: 'attendance', label: 'QR Attendance & Passes', icon: QrCode, badge: 'Live' },
    { id: 'billing', label: 'Rent, Bills & Payments', icon: Receipt, badge: null },
    { id: 'deposits', label: 'Security Deposits', icon: ShieldCheck, badge: null },
    { id: 'complaints', label: 'Complaints & Requests', icon: AlertCircle, badge: null },
    { id: 'food', label: 'Food & Meal Service', icon: UtensilsCrossed, badge: '4 Meals' },
    { id: 'cleaning', label: 'Weekly Cleaning Schedule', icon: Sparkles, badge: null },
    { id: 'maintenance', label: 'Maintenance Tracking', icon: Wrench, badge: null },
    { id: 'notices', label: 'Notice Board', icon: Megaphone, badge: null },
    { id: 'messages', label: 'Direct Messages', icon: MessageSquare, badge: null },
    { id: 'reports', label: 'Management Reports', icon: BarChart3, badge: '13 Reports' },
    { id: 'settings', label: 'Pricing & Owner Settings', icon: Settings, badge: null },
  ];

  const residentNavItems = [
    { id: 'my-room', label: 'My Room & Bed', icon: BedDouble, badge: resident?.roomNumber ? `Rm ${resident.roomNumber}` : null },
    { id: 'qr-checkin', label: 'QR Check-In & Scanner', icon: QrCode, badge: 'Scan' },
    { id: 'my-bills', label: 'My Rent & Invoices', icon: Receipt, badge: null },
    { id: 'my-complaints', label: 'Complaints & Support', icon: AlertCircle, badge: null },
    { id: 'food-menu', label: 'Daily Food Menu', icon: UtensilsCrossed, badge: 'Included' },
    { id: 'facilities', label: 'Hostel Facilities', icon: Sparkles, badge: 'Free Wi-Fi' },
    { id: 'notices', label: 'Notice Board', icon: Megaphone, badge: null },
    { id: 'messages', label: 'Chat with Management', icon: MessageSquare, badge: null },
    { id: 'my-profile', label: 'My Profile', icon: FileText, badge: null },
  ];

  const navItems = isAdmin ? adminNavItems : residentNavItems;

  const handleItemClick = (id: string) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(id);
    } else {
      if (isAdmin) {
        const pathMap: Record<string, string> = {
          dashboard: '/admin',
          approvals: '/admin/approvals',
          rooms: '/admin/rooms',
          floors: '/admin/floors',
          residents: '/admin/residents',
          attendance: '/admin/attendance',
          billing: '/admin/billing',
          deposits: '/admin/deposits',
          complaints: '/admin/complaints',
          food: '/admin/food',
          cleaning: '/admin/cleaning',
          maintenance: '/admin/complaints',
          notices: '/admin/notices',
          messages: '/admin/messages',
          reports: '/admin/reports',
          settings: '/admin/settings',
        };
        navigate(pathMap[id] || '/admin');
      } else {
        const pathMap: Record<string, string> = {
          'my-room': '/resident',
          'qr-checkin': '/resident/qr-checkin',
          'my-bills': '/resident',
          'my-complaints': '/resident',
          'food-menu': '/resident/facilities',
          facilities: '/resident/facilities',
          notices: '/resident',
          messages: '/resident/messages',
          'my-profile': '/resident',
        };
        navigate(pathMap[id] || '/resident');
      }
    }
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside
        id="app-navigation-sidebar"
        className={`
          fixed md:sticky top-16 bottom-0 left-0 z-40 h-[calc(100vh-4rem)]
          bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800
          transition-all duration-300 ease-in-out shrink-0
          ${/* Mobile Drawer logic: slide in/out */ ''}
          ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${/* Desktop Collapsed/Expanded logic */ ''}
          ${!isOpen ? (isCollapsed ? 'md:w-20' : 'md:w-64') : ''}
        `}
      >
        {/* Header / Drawer Close on Mobile */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed && !isOpen ? 'md:justify-center md:w-full' : ''}`}>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isAdmin ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isAdmin ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>

            {(!isCollapsed || isOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate">
                  {isAdmin ? 'Owner / Admin' : 'Resident Portal'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {isAdmin ? 'Full Management' : (resident?.fullName || user?.name || 'Resident')}
                </p>
              </div>
            )}
          </div>

          {/* Close (X) button for Mobile/Tablet drawer */}
          <button
            type="button"
            id="mobile-sidebar-close-btn"
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showCollapsedView = isCollapsed && !isOpen;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                title={showCollapsedView ? item.label : undefined}
                className={`
                  w-full flex items-center rounded-xl transition-all group relative
                  ${showCollapsedView ? 'justify-center p-3' : 'justify-between px-3 py-2.5'}
                  ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }
                `}
              >
                <div className={`flex items-center gap-3 ${showCollapsedView ? 'justify-center' : ''}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                    }`}
                  />
                  {!showCollapsedView && (
                    <span className="text-xs truncate">{item.label}</span>
                  )}
                </div>

                {!showCollapsedView && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isActive
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Floating tooltip on hover when collapsed on desktop */}
                {showCollapsedView && (
                  <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 z-50 whitespace-nowrap pointer-events-none items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1 bg-indigo-900 text-indigo-200 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / Toggle trigger on desktop */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/30">
          {(!isCollapsed || isOpen) ? (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="text-[11px] truncate">Hostel Pro v2.4</span>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden md:flex p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:flex justify-center">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
