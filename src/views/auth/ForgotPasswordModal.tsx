import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Flow states
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const passwordRules = {
    hasLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_~+=\\/-]/.test(newPassword),
    matches: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const getPasswordStrength = () => {
    const score = [
      passwordRules.hasLength,
      passwordRules.hasUpper,
      passwordRules.hasLower,
      passwordRules.hasNumber,
      passwordRules.hasSpecial,
    ].filter(Boolean).length;

    if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400', width: '30%' };
    if (score <= 4) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400', width: '65%' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400', width: '100%' };
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.sendForgotPasswordOtp(email.trim());
      setOtpSent(true);
      setCooldown(res.cooldownSeconds || 45);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'No registered resident account found with this email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code received on your email.');
      return;
    }

    if (!passwordRules.hasLength || !passwordRules.hasUpper || !passwordRules.hasLower || !passwordRules.hasNumber || !passwordRules.hasSpecial) {
      setError('New password must satisfy all strong password requirements.');
      return;
    }

    if (!passwordRules.matches) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.resetPasswordWithOtp({
        email: email.trim(),
        otp: otpCode.trim(),
        newPassword,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess(email.trim());
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Reset Resident Password</h2>
              <p className="text-xs text-slate-400">Email OTP Verified Account Recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your registered resident email address. We will dispatch a 6-digit verification code to reset your account password.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aarav.patel@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate">Email: {email}</span>
                {cooldown > 0 ? (
                  <span className="text-slate-500 text-[11px]">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-emerald-400 hover:underline text-[11px] font-bold"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-center tracking-widest text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Strength:</span>
                      <span className={`font-bold ${getPasswordStrength().text}`}>
                        {getPasswordStrength().label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrength().color}`}
                        style={{ width: getPasswordStrength().width }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password checklist */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] grid grid-cols-2 gap-1 text-slate-400">
                <span className={passwordRules.hasLength ? 'text-emerald-400' : ''}>• 8+ characters</span>
                <span className={passwordRules.hasUpper ? 'text-emerald-400' : ''}>• Uppercase letter</span>
                <span className={passwordRules.hasLower ? 'text-emerald-400' : ''}>• Lowercase letter</span>
                <span className={passwordRules.hasNumber ? 'text-emerald-400' : ''}>• Number (0-9)</span>
                <span className={passwordRules.hasSpecial ? 'text-emerald-400' : ''}>• Special character</span>
                <span className={passwordRules.matches ? 'text-emerald-400' : ''}>• Passwords match</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Reset & Save New Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
