import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Building,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Trash2,
  FileCheck,
  Check,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  OFFICIAL_TERMS_RULES,
  OFFICIAL_HOSTEL_HOLIDAYS,
  HOSTEL_HOLIDAY_NOTICE,
} from '../../lib/termsData';

interface ResidentSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (regDetails: any) => void;
}

export const ResidentSignUpModal: React.FC<ResidentSignUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Email OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  // Step 2: Address & Emergency
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Father');

  // Step 3: Occupation & Education
  const [whatTheyDo, setWhatTheyDo] = useState<'Student' | 'Working Professional' | 'Intern' | 'Self-Employed' | 'Other'>('Student');
  const [workOrCollege, setWorkOrCollege] = useState('');
  const [designation, setDesignation] = useState('');

  // Step 4: Password & Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  if (!isOpen) return null;

  // Indian Phone validation
  const validateIndianMobile = (num: string): boolean => {
    const cleaned = num.replace(/[\s-]/g, '');
    if (/^\+91[6-9]\d{9}$/.test(cleaned)) return true;
    if (/^[6-9]\d{9}$/.test(cleaned)) return true;
    if (/^0[6-9]\d{9}$/.test(cleaned)) return true;
    return false;
  };

  // Password rules
  const passwordRules = {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_~+=\\/-]/.test(password),
    matches: password === confirmPassword && confirmPassword.length > 0,
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
    if (score <= 4) return { label: 'Fair / Moderate', color: 'bg-amber-500', text: 'text-amber-400', width: '65%' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400', width: '100%' };
  };

  // Handle Photo Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormError('Invalid photo format. Only JPG, PNG, and WEBP images are supported.');
      return;
    }

    // Validate size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size exceeds 5MB limit. Please upload a smaller photo.');
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Send Email OTP
  const handleSendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setOtpError('Please enter a valid email address first.');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    try {
      const res = await api.sendRegistrationOtp(email.trim());
      setOtpSent(true);
      setOtpCooldown(res.cooldownSeconds || 45);
      setOtpSuccessMessage(res.message);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setOtpVerifyLoading(true);
    setOtpError(null);

    try {
      await api.verifyRegistrationOtp(email.trim(), otpCode.trim());
      setEmailVerified(true);
      setOtpSuccessMessage('Email verified successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!fullName.trim()) {
      setFormError('Please enter your full legal name.');
      return false;
    }
    if (!avatar) {
      setFormError('Profile photo is mandatory. Please upload your photo.');
      return false;
    }
    if (!dob) {
      setFormError('Please select your Date of Birth.');
      return false;
    }
    if (!validateIndianMobile(mobile)) {
      setFormError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please provide a valid email address.');
      return false;
    }
    if (!emailVerified) {
      setFormError('Email OTP verification is required. Please verify your email before continuing.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!address.trim()) {
      setFormError('Please enter your permanent residential address.');
      return false;
    }
    if (!city.trim() || !stateName.trim()) {
      setFormError('Please enter city and state.');
      return false;
    }
    if (!/^\d{6}$/.test(pinCode.trim())) {
      setFormError('Please enter a valid 6-digit Indian PIN code.');
      return false;
    }
    if (!emergencyContactName.trim()) {
      setFormError('Emergency contact name is required.');
      return false;
    }
    if (!validateIndianMobile(emergencyContactNumber)) {
      setFormError('Please enter a valid Indian mobile number for emergency contact.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    if (!workOrCollege.trim()) {
      setFormError('Please enter your College, Institution, or Company name.');
      return false;
    }
    if (!designation.trim()) {
      setFormError('Please enter your Course or Job Designation.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Step 4 Validation & Submission
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordRules.hasLength || !passwordRules.hasUpper || !passwordRules.hasLower || !passwordRules.hasNumber || !passwordRules.hasSpecial) {
      setFormError('Password does not meet the strong security criteria.');
      return;
    }
    if (!passwordRules.matches) {
      setFormError('Password and Confirm Password do not match.');
      return;
    }
    if (!acceptTerms) {
      setFormError('You must review and agree to the Hostel Terms & Conditions to complete registration.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      fullName: fullName.trim(),
      avatar,
      dob,
      gender,
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pinCode: pinCode.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactNumber: emergencyContactNumber.trim(),
      emergencyRelationship,
      workOrCollege: workOrCollege.trim(),
      designation: designation.trim(),
      whatTheyDo,
      password,
    };

    try {
      const res = await api.registerResident(payload);
      setSubmittedData({
        ...payload,
        registrationId: res.registration.id,
        status: res.status,
      });
      onSuccess(res.registration);
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                Resident Self-Registration
              </span>
              <span className="text-xs text-slate-400">
                Step {step} of {totalSteps}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Create New Resident Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress bar */}
        {!submittedData && (
          <div className="px-6 pt-3 bg-slate-950/40">
            <div className="flex items-center justify-between gap-2">
              {[
                { s: 1, label: 'Personal & Contact' },
                { s: 2, label: 'Address & Emergency' },
                { s: 3, label: 'Occupation' },
                { s: 4, label: 'Account Security' },
              ].map((item) => (
                <div key={item.s} className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                    <span className={step >= item.s ? 'text-emerald-400' : 'text-slate-500'}>
                      {item.s}. {item.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        step > item.s
                          ? 'bg-emerald-500 w-full'
                          : step === item.s
                          ? 'bg-emerald-400 w-1/2'
                          : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {formError && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* SUCCESS / WAITING FOR APPROVAL SCREEN */}
          {submittedData ? (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Status: Waiting for Owner Approval
                </span>
                <h3 className="text-xl font-black text-white">Registration Application Submitted!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Thank you, <strong className="text-white">{submittedData.fullName}</strong>. Your account has been registered with ID{' '}
                  <strong className="text-emerald-400">{submittedData.registrationId}</strong>.
                </p>
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-left text-xs space-y-2 text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Email & Indian Mobile Verified</span>
                  </div>
                  <p className="text-slate-400">
                    Your application is currently under review by the hostel owner (<strong className="text-slate-200">Rajesh Sharma</strong>). Once your room and bed allocation are finalized, your account will be activated and you will be able to log in to the Resident Dashboard.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
                >
                  Return to Login Screen
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRegistration} className="space-y-5">
              {/* ---------------- STEP 1: PERSONAL & CONTACT ---------------- */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Step 1: Personal & Contact Information
                    </h3>
                  </div>

                  {/* Profile Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Profile Photo <span className="text-rose-400">* (Required)</span>
                    </label>
                    <div className="flex items-center gap-4 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                      <div className="relative w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Camera className="w-7 h-7 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoSelect}
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                          {avatar && (
                            <button
                              type="button"
                              onClick={() => {
                                setAvatar('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs transition-colors"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Clear passport-style photo. JPG, PNG, or WEBP (Max 5MB).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Full Legal Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* DOB & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Date of Birth <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Gender <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Indian Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Indian Mobile Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        🇮🇳 +91
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="98450 11223 or 10-digit number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className={`w-full pl-16 pr-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 ${
                          mobile && !validateIndianMobile(mobile)
                            ? 'border-rose-500 focus:ring-rose-500'
                            : 'border-slate-700 focus:ring-emerald-500'
                        }`}
                      />
                    </div>
                    {mobile && !validateIndianMobile(mobile) && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.
                      </p>
                    )}
                  </div>

                  {/* Email & OTP Verification */}
                  <div className="space-y-2 p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300">
                        Email Address & Verification <span className="text-rose-400">*</span>
                      </label>
                      {emailVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Email Verified
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          required
                          disabled={emailVerified}
                          placeholder="e.g. aarav.patel@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailVerified) setEmailVerified(false);
                          }}
                          className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-75"
                        />
                      </div>
                      {!emailVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading || otpCooldown > 0 || !email}
                          className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5"
                        >
                          {otpLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : otpCooldown > 0 ? (
                            <span>Resend in {otpCooldown}s</span>
                          ) : (
                            <span>{otpSent ? 'Resend OTP' : 'Send OTP'}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* OTP verification input */}
                    {otpSent && !emailVerified && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-indigo-400" />
                          A 6-digit verification OTP was dispatched to your email inbox.
                        </p>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-40 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-center tracking-widest text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otpVerifyLoading || otpCode.length !== 6}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            {otpVerifyLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <span>Verify Code</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {otpError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {otpError}
                      </p>
                    )}
                    {otpSuccessMessage && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                        <Check className="w-3 h-3 shrink-0" />
                        {otpSuccessMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- STEP 2: ADDRESS & EMERGENCY ---------------- */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Step 2: Address & Emergency Details
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Permanent Residential Address <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House/Flat No., Street, Landmark, Area"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        City <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pune"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        State <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maharashtra"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        PIN Code <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 411014"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Group */}
                  <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Emergency Contact Verification
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Emergency Contact Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Parent / Guardian Name"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Relationship <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={emergencyRelationship}
                          onChange={(e) => setEmergencyRelationship(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Emergency Contact Indian Mobile <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit Indian Mobile"
                          value={emergencyContactNumber}
                          onChange={(e) => setEmergencyContactNumber(e.target.value)}
                          className="w-full pl-16 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- STEP 3: OCCUPATION & EDUCATION ---------------- */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Step 3: Occupation & Organization
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      What do you do? <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(['Student', 'Working Professional', 'Intern', 'Self-Employed', 'Other'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWhatTheyDo(type)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${
                            whatTheyDo === type
                              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      College / Institution / Company <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pune Institute of Computer Technology (PICT) or Infosys Ltd."
                      value={workOrCollege}
                      onChange={(e) => setWorkOrCollege(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Course / Designation <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B.Tech Computer Science (3rd Year) or Associate Software Engineer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* ---------------- STEP 4: ACCOUNT SECURITY ---------------- */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Step 4: Strong Password & Security
                    </h3>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Create Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Strength:</span>
                          <span className={`font-bold ${getPasswordStrength().text}`}>
                            {getPasswordStrength().label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getPasswordStrength().color} transition-all duration-300`}
                            style={{ width: getPasswordStrength().width }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Validation Criteria Checklist */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5 text-[11px]">
                    <span className="font-bold text-slate-400 block mb-1">Strong Password Requirements:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.hasLength ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.hasUpper ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>1 uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.hasLower ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>1 lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.hasNumber ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>1 number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.hasSpecial ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>1 special symbol (!@#$%^&*...)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passwordRules.matches ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {passwordRules.matches ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 inline-block" />}
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Verification Agreement */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Official Hostel Terms &amp; Conditions (Review Required)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">23 Rules • Official Policy</span>
                    </div>

                    <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 text-xs text-slate-300 max-h-56 overflow-y-auto space-y-4">
                      <div className="space-y-2">
                        <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                          Hostel Rules &amp; Regulations:
                        </p>
                        <div className="space-y-2">
                          {OFFICIAL_TERMS_RULES.map((rule, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-slate-300">
                              <span className="font-bold text-emerald-400 shrink-0 text-xs">{idx + 1}.</span>
                              <span className="leading-relaxed text-xs">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                          Hostel Holidays:
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {OFFICIAL_HOSTEL_HOLIDAYS.map((h, i) => (
                            <div key={i} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-medium">
                              • {h}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-amber-400/90 pt-1 leading-relaxed">
                          {HOSTEL_HOLIDAY_NOTICE}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer group">
                        <input
                          type="checkbox"
                          id="signup-terms-checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700 focus:ring-emerald-500 transition-colors"
                        />
                        <span className="leading-relaxed font-medium group-hover:text-white">
                          I have read and agree to the Hostel Terms &amp; Conditions.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation Controls */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setStep((s) => s - 1);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < totalSteps ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 && !validateStep1()) return;
                      if (step === 2 && !validateStep2()) return;
                      if (step === 3 && !validateStep3()) return;
                      setStep((s) => s + 1);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <span>Continue to Step {step + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !acceptTerms}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Submit Registration for Approval</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
