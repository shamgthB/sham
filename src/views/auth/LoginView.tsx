import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Building2,
  Shield,
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  KeyRound,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  BedDouble,
  Info,
  UserPlus,
} from 'lucide-react';
import { ResidentSignUpModal } from './ResidentSignUpModal';
import { RegistrationStatusModal } from './RegistrationStatusModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginView: React.FC = () => {
  const { login, settings } = useAuth();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState<'admin' | 'resident'>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState<any>(null);

  const [showActivateAccount, setShowActivateAccount] = useState(false);
  const [activateForm, setActivateForm] = useState({
    identifier: '',
    roomNumber: '',
    newPassword: '',
  });
  const [activateStatus, setActivateStatus] = useState<{ loading: boolean; message?: string; error?: string }>({
    loading: false,
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your credentials');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(identifier.trim(), password, activeRole);
      if (res?.pendingApproval) {
        setStatusModalData({
          status: 'Waiting for Owner Approval',
          user: res.user,
          registration: res.registration,
          message: res.message,
        });
        setShowStatusModal(true);
        return;
      }
      if (res?.rejected) {
        setStatusModalData({
          status: 'Rejected',
          user: res.user,
          registration: res.registration,
          message: res.message,
          rejectionReason: res.rejectionReason,
          reviewedBy: res.registration?.reviewedBy,
        });
        setShowStatusModal(true);
        return;
      }
      if (activeRole === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/resident', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSuccess = (regDetails: any) => {
    setShowSignUpModal(false);
    setStatusModalData({
      status: 'Waiting for Owner Approval',
      user: { name: regDetails.fullName, email: regDetails.email, phone: regDetails.phone },
      registration: regDetails,
      message: 'Your registration has been submitted successfully and is awaiting review by the hostel owner.',
    });
    setShowStatusModal(true);
  };

  const handleQuickDemoLogin = async (demoId: string, demoRole: 'admin' | 'resident') => {
    setActiveRole(demoRole);
    setIdentifier(demoId);
    const pwd = demoRole === 'admin' ? 'admin123' : 'resident123';
    setPassword(pwd);
    setLoading(true);
    setError(null);

    try {
      await login(demoId, pwd, demoRole);
      if (demoRole === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/resident', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateStatus({ loading: true });
    try {
      const res = await api.activateAccount(activateForm);
      setActivateStatus({ loading: false, message: res.message });
      setIdentifier(res.username || activateForm.identifier);
      setPassword(activateForm.newPassword);
      setTimeout(() => {
        setShowActivateAccount(false);
        setActivateStatus({ loading: false });
      }, 2000);
    } catch (err: any) {
      setActivateStatus({ loading: false, error: err.message || 'Activation failed' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-xl z-10 space-y-6">
        {/* Hostel Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/25 mb-1">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {settings?.hostelName || 'Greenfield Executive Residency'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Authorized Hostel Operations & Resident Self-Service Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Role Selector Header */}
          <div className="space-y-2">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Choose Access Role
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800">
              <button
                type="button"
                id="owner-admin-login-tab"
                onClick={() => {
                  setActiveRole('admin');
                  setError(null);
                  if (identifier.includes('@') || identifier.startsWith('+')) setIdentifier('admin');
                }}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeRole === 'admin'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Owner / Admin Login</span>
              </button>

              <button
                type="button"
                id="resident-customer-login-tab"
                onClick={() => {
                  setActiveRole('resident');
                  setError(null);
                  if (identifier === 'admin') setIdentifier('aarav');
                }}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeRole === 'resident'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Resident / Customer Login</span>
              </button>
            </div>
          </div>

          {/* Form Context Header */}
          <div className="border-b border-slate-700/60 pb-4">
            {activeRole === 'admin' ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Hostel Owner & Management Sign In
                  </h2>
                  <p className="text-xs text-slate-400">
                    Access operations, billing, room occupancy, and resident CRM.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Resident Tenant Sign In
                  </h2>
                  <p className="text-xs text-slate-400">
                    View your room, rent bills, security deposit, meals, and lodge requests.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {activeRole === 'admin'
                  ? 'Owner Username or Email'
                  : 'Mobile Number, Email, or Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {activeRole === 'admin' ? <Shield className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  required
                  placeholder={
                    activeRole === 'admin'
                      ? 'admin or management@greenfieldhostel.com'
                      : 'e.g. +91 98450 11223 or aarav.patel@example.com'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                {activeRole === 'resident' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                activeRole === 'admin'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    {activeRole === 'admin'
                      ? 'Sign In to Owner Dashboard'
                      : 'Sign In to Resident Dashboard'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Clearly Visible Resident Sign Up Option */}
          {activeRole === 'resident' ? (
            <div className="pt-3 pb-1 border-t border-slate-700/60 space-y-2.5">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-950/40">
                <div className="text-center sm:text-left space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    New Resident Admission
                  </span>
                  <p className="text-sm font-bold text-white">Don't have an account yet?</p>
                  <p className="text-[11px] text-slate-400">
                    Register with KYC, emergency contact, and photo verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignUpModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Resident Sign Up</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">Already have room assigned?</span>
                <button
                  type="button"
                  onClick={() => setShowActivateAccount(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold underline decoration-emerald-500/40 text-[11px]"
                >
                  Activate Existing Room
                </button>
              </div>
            </div>
          ) : (
            /* Admin view: strictly NO option to create an admin account */
            <div className="pt-2 border-t border-slate-700/60 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400/70" />
                <span>Hostel Owner / Administrator account is provisioned exclusively.</span>
              </p>
            </div>
          )}

          {/* Fast Demo Access Quick Buttons */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Quick 1-Click Demo Login</span>
              <span className="text-[10px] text-indigo-400 lowercase font-normal">click to auto-fill & login</span>
            </div>

            {activeRole === 'admin' ? (
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin', 'admin')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-indigo-500/50 hover:bg-slate-900 flex items-center justify-between text-xs text-slate-300 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white group-hover:text-indigo-300">
                      Rajesh Sharma (Hostel Owner / Admin)
                    </p>
                    <p className="text-[10px] text-slate-400">Username: admin • Password: admin123</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 font-bold border border-indigo-700/50">
                  Owner
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('aarav', 'resident')}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 text-left text-xs transition-all"
                >
                  <p className="font-bold text-white truncate">Aarav Patel</p>
                  <p className="text-[10px] text-slate-400">Rm 101 (Single) • Dep: ₹4,500</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('rohan', 'resident')}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 text-left text-xs transition-all"
                >
                  <p className="font-bold text-white truncate">Rohan Verma</p>
                  <p className="text-[10px] text-slate-400">Rm 103 (Double Bed 1) • Dep: ₹3,500</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('vikram', 'resident')}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 text-left text-xs transition-all"
                >
                  <p className="font-bold text-white truncate">Vikram Sen</p>
                  <p className="text-[10px] text-slate-400">Rm 103 (Double Bed 2) • Dep: ₹3,500</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('neha', 'resident')}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 text-left text-xs transition-all"
                >
                  <p className="font-bold text-white truncate">Neha Kulkarni</p>
                  <p className="text-[10px] text-slate-400">Rm 201 (Single) • Dep: ₹4,500</p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Policy Badge */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>
            Standard Security Deposit: Single Room <strong className="text-slate-400">₹4,500</strong> • Double Room{' '}
            <strong className="text-slate-400">₹3,500/person</strong>
          </p>
          <p className="text-[11px] text-slate-600">
            Greenfield Executive Residency & Hostel • Enterprise Operations
          </p>
        </div>
      </div>

      {/* MODAL: Forgot Password (Email OTP Verified) */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* MODAL: Resident Sign Up (Multi-Step Indian KYC Form) */}
      <ResidentSignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSuccess={handleSignUpSuccess}
      />

      {/* MODAL: Registration Status (Waiting for Owner Approval / Rejected Notice) */}
      <RegistrationStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        initialData={statusModalData}
        onReapply={() => {
          setShowStatusModal(false);
          setShowSignUpModal(true);
        }}
      />

      {/* MODAL: Activate Resident Account */}
      {showActivateAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Activate Resident Account
              </h3>
              <button
                onClick={() => {
                  setShowActivateAccount(false);
                  setActivateStatus({ loading: false });
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Tenants onboarded by hostel management can activate their login credentials by verifying their registered phone/ID and allocated room.
            </p>

            {activateStatus.message ? (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Account Activated!
                </p>
                <p>{activateStatus.message}</p>
              </div>
            ) : (
              <form onSubmit={handleActivateAccountSubmit} className="space-y-3">
                {activateStatus.error && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                    {activateStatus.error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mobile Number or Resident ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98450 11223 or RES-101"
                    value={activateForm.identifier}
                    onChange={(e) => setActivateForm({ ...activateForm, identifier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Assigned Room Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101 or 103"
                    value={activateForm.roomNumber}
                    onChange={(e) => setActivateForm({ ...activateForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Create New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Choose your secret password"
                    value={activateForm.newPassword}
                    onChange={(e) => setActivateForm({ ...activateForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowActivateAccount(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={activateStatus.loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    {activateStatus.loading ? 'Activating...' : 'Activate & Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
