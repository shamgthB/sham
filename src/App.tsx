import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Auth View
import { LoginView } from './views/auth/LoginView';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { RoomManagement } from './views/admin/RoomManagement';
import { FloorLayoutView } from './views/admin/FloorLayoutView';
import { ResidentManagement } from './views/admin/ResidentManagement';
import { BillingManagement } from './views/admin/BillingManagement';
import { ComplaintsManagement } from './views/admin/ComplaintsManagement';
import { FoodMenuManagement } from './views/admin/FoodMenuManagement';
import { CleaningManagement } from './views/admin/CleaningManagement';
import { NoticesManagement } from './views/admin/NoticesManagement';
import { CommunicationHub } from './views/admin/CommunicationHub';
import { SecurityDepositsView } from './views/admin/SecurityDepositsView';
import { ReportsView } from './views/admin/ReportsView';
import { SettingsView } from './views/admin/SettingsView';
import { QRAttendanceManagement } from './views/admin/QRAttendanceManagement';
import { ResidentApprovalsView } from './views/admin/ResidentApprovalsView';

// Resident Views
import { ResidentDashboard } from './views/resident/ResidentDashboard';
import { ResidentFacilitiesView } from './views/resident/ResidentFacilitiesView';
import { ResidentMessagesView } from './views/resident/ResidentMessagesView';
import { ResidentQRCheckInView } from './views/resident/ResidentQRCheckInView';
import { TermsModal } from './components/TermsModal';
import { api } from './lib/api';

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [termsCheck, setTermsCheck] = useState<{
    checked: boolean;
    needsAcceptance: boolean;
    version: string;
  }>({
    checked: false,
    needsAcceptance: false,
    version: 'v2.0-2026',
  });

  useEffect(() => {
    if (user && user.role === 'resident') {
      api.getTermsStatus()
        .then((res) => {
          setTermsCheck({
            checked: true,
            needsAcceptance: !res.accepted,
            version: res.version,
          });
        })
        .catch(() => {
          setTermsCheck((prev) => ({ ...prev, checked: true }));
        });
    } else {
      setTermsCheck({ checked: true, needsAcceptance: false, version: 'v2.0-2026' });
    }
  }, [user]);

  // Collapsible sidebar state on desktop (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hostel_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile/tablet slide-out drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      // Mobile / Tablet: toggle drawer
      setIsMobileDrawerOpen(!isMobileDrawerOpen);
    } else {
      // Desktop: toggle collapsed state
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('hostel_sidebar_collapsed', String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  const handleTabSelect = (tab: string) => {
    if (user?.role === 'resident') {
      const residentRouteMap: Record<string, string> = {
        'my-room': '/resident',
        'my-bills': '/resident',
        'my-complaints': '/resident',
        'food-menu': '/resident/facilities',
        facilities: '/resident/facilities',
        'qr-checkin': '/resident/qr-checkin',
        notices: '/resident',
        messages: '/resident/messages',
        'my-profile': '/resident',
      };
      navigate(residentRouteMap[tab] || '/resident');
    } else {
      const adminRouteMap: Record<string, string> = {
        dashboard: '/admin',
        approvals: '/admin/approvals',
        rooms: '/admin/rooms',
        floors: '/admin/floors',
        residents: '/admin/residents',
        billing: '/admin/billing',
        deposits: '/admin/deposits',
        attendance: '/admin/attendance',
        complaints: '/admin/complaints',
        food: '/admin/food',
        cleaning: '/admin/cleaning',
        maintenance: '/admin/complaints',
        notices: '/admin/notices',
        messages: '/admin/messages',
        reports: '/admin/reports',
        settings: '/admin/settings',
      };
      navigate(adminRouteMap[tab] || '/admin');
    }
  };

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/admin') return 'dashboard';
    if (path.startsWith('/admin/')) return path.replace('/admin/', '');
    if (path === '/resident/facilities') return 'facilities';
    if (path === '/resident/messages') return 'messages';
    if (path === '/resident/qr-checkin') return 'qr-checkin';
    if (path.startsWith('/resident')) return 'my-room';
    return 'dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Hostel Management System...</p>
      </div>
    );
  }

  // Not logged in -> Render Login Page
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If user is already logged in and navigates to /login, redirect to their home
  if (location.pathname === '/login') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/resident'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar with Toggle Button */}
      <Navbar
        onToggleSidebar={toggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Container with Sidebar + Dynamic View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible / Slide-Out Sidebar */}
        <Sidebar
          currentTab={getCurrentTab()}
          onSelectTab={handleTabSelect}
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Main Content Area: Automatically expands when sidebar collapses */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto transition-all duration-300">
          <Routes>
            {/* Root path: Redirect based on role */}
            <Route
              path="/"
              element={
                user.role === 'resident' ? (
                  <Navigate to="/resident" replace />
                ) : (
                  <Navigate to="/admin" replace />
                )
              }
            />

            {/* Strict RBAC: If resident attempts to access /admin, redirect to /resident */}
            {user.role === 'resident' ? (
              <Route path="/admin/*" element={<Navigate to="/resident" replace />} />
            ) : (
              <>
                {/* Admin Management Routes */}
                <Route path="/admin" element={<AdminDashboard onNavigate={handleTabSelect} />} />
                <Route path="/admin/approvals" element={<ResidentApprovalsView />} />
                <Route
                  path="/admin/rooms"
                  element={
                    <RoomManagement
                      onNavigateToResidents={() => navigate('/admin/residents')}
                      onNavigateToBilling={() => navigate('/admin/billing')}
                    />
                  }
                />
                <Route path="/admin/floors" element={<FloorLayoutView />} />
                <Route path="/admin/residents" element={<ResidentManagement />} />
                <Route path="/admin/billing" element={<BillingManagement />} />
                <Route path="/admin/complaints" element={<ComplaintsManagement />} />
                <Route path="/admin/food" element={<FoodMenuManagement />} />
                <Route path="/admin/cleaning" element={<CleaningManagement />} />
                <Route path="/admin/notices" element={<NoticesManagement />} />
                <Route path="/admin/messages" element={<CommunicationHub />} />
                <Route path="/admin/deposits" element={<SecurityDepositsView />} />
                <Route path="/admin/attendance" element={<QRAttendanceManagement />} />
                <Route path="/admin/reports" element={<ReportsView />} />
                <Route path="/admin/settings" element={<SettingsView />} />
              </>
            )}

            {/* Resident Self-Service Portal Routes */}
            <Route path="/resident" element={<ResidentDashboard />} />
            <Route path="/resident/facilities" element={<ResidentFacilitiesView />} />
            <Route path="/resident/qr-checkin" element={<ResidentQRCheckInView />} />
            <Route path="/resident/messages" element={<ResidentMessagesView />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mandatory Terms & Conditions acceptance if required for resident */}
      {user?.role === 'resident' && termsCheck.needsAcceptance && (
        <TermsModal
          isOpen={true}
          isMandatory={true}
          termsVersion={termsCheck.version}
          onAccepted={() => {
            setTermsCheck((prev) => ({ ...prev, needsAcceptance: false }));
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
