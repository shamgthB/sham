import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb, saveDb, OFFICIAL_TERMS_RULES, OFFICIAL_HOSTEL_HOLIDAYS } from './db';
import type {
  User,
  Resident,
  Room,
  Bill,
  Payment,
  Complaint,
  MealMenu,
  Notice,
  ChatMessage,
  CleaningRecord,
  MaintenanceRecord,
  CheckInOutRecord,
  SecurityDepositRecord,
  DashboardStats,
  QRSession,
  CheckInRecord,
  ResidentRegistration,
  EmailOTPRecord,
  TermsAcceptanceRecord,
  TermsConfig,
  VisitorRequest,
  VisitorStatus,
  PresenceSession,
  PresenceStatus,
  ResidentPresenceState,
  RentPaymentConfirmation,
  PaymentCorrectionRecord,
  InventoryItem,
  InventoryLog,
  DamageRecord,
  DamageStatus,
  RoomChangeRecord,
  ActivityLogItem,
  CheckoutSettlementRecord,
  SettlementDeductionItem,
  EmergencyAlertRecord,
  AutomaticVacancyStats,
} from '../src/types';

export const apiRouter = Router();

// Middleware to extract authenticated user from Authorization header
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const db = getDb();

  // Tokens: "usr-admin-token" or "usr-<id>-token"
  const user = db.users.find((u) => `token-${u.id}` === token || `token-${u.username}` === token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    residentId: user.residentId,
  };
  next();
}

function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// ---------------- AUTH HELPERS & VALIDATION ----------------
const SALT = 'hostel_salt_2026';
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(SALT + password).digest('hex');
}

function verifyPassword(inputPassword: string, storedHash: string): boolean {
  if (inputPassword === storedHash) return true; // fallback for pre-existing plain passwords
  return hashPassword(inputPassword) === storedHash;
}

function isValidIndianMobile(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) return true;
  if (/^[6-9]\d{9}$/.test(cleaned)) return true;
  if (/^0[6-9]\d{9}$/.test(cleaned)) return true;
  return false;
}

function normalizeIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

function validateStrongPassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_~+=\\/-]/.test(password)) {
    return { valid: false, error: 'Password must include at least 1 special character (!@#$%^&*...).' };
  }
  return { valid: true };
}

// ---------------- AUTH ROUTES ----------------
apiRouter.post('/auth/login', (req, res) => {
  const { username, identifier, password, role } = req.body;
  const loginId = (identifier || username || '').trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username/Mobile/Email and password are required' });
  }

  const db = getDb();
  const cleanId = loginId.toLowerCase();
  const rawDigits = loginId.replace(/\D/g, '');

  // Find user by username, email, or linked resident mobile/id
  let user = db.users.find(
    (u) =>
      (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) &&
      verifyPassword(password, u.passwordHash)
  );

  // If not found by direct username/email, search via resident's mobile number
  if (!user && rawDigits.length >= 7) {
    const resident = db.residents.find((r) => {
      const resDigits = r.mobile.replace(/\D/g, '');
      return resDigits.endsWith(rawDigits) || rawDigits.endsWith(resDigits);
    });

    if (resident) {
      user = db.users.find((u) => u.residentId === resident.id && verifyPassword(password, u.passwordHash));
      // Fallback: if user exists for this resident with default password
      if (!user && password === 'resident123') {
        user = db.users.find((u) => u.residentId === resident.id);
      }
    }
  }

  // Also check if login is by Resident ID (e.g. RES-101)
  if (!user) {
    const resident = db.residents.find((r) => r.id.toLowerCase() === cleanId);
    if (resident) {
      user = db.users.find((u) => u.residentId === resident.id && verifyPassword(password, u.passwordHash));
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your username/mobile and password.' });
  }

  // Enforce role separation if specified by the login view
  if (role) {
    if (role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access restricted: You are registered as a Resident. Please use the Resident Login tab.',
      });
    }
    if (role === 'resident' && user.role !== 'resident') {
      return res.status(403).json({
        error: 'Access restricted: This portal is for Residents. Owner / Admins must use the Owner / Admin Login tab.',
      });
    }
  }

  // 13 & 14. PENDING / REJECTED STATUS HANDLING FOR RESIDENTS:
  if (user.role === 'resident') {
    const reg = (db.registrations || []).find((r) => r.email.toLowerCase() === user.email.toLowerCase());
    const regStatus = user.registrationStatus || (reg ? reg.status : 'Approved');

    if (regStatus === 'Waiting for Owner Approval') {
      return res.status(200).json({
        pendingApproval: true,
        status: 'Waiting for Owner Approval',
        message: 'Your registration has been submitted and is waiting for hostel owner approval.',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          registrationStatus: 'Waiting for Owner Approval',
        },
        registration: reg
          ? {
              id: reg.id,
              fullName: reg.fullName,
              avatar: reg.avatar,
              email: reg.email,
              mobile: reg.mobile,
              status: reg.status,
              createdAt: reg.createdAt,
              city: reg.city,
              workOrCollege: reg.workOrCollege,
              whatTheyDo: reg.whatTheyDo,
            }
          : null,
      });
    }

    if (regStatus === 'Rejected') {
      return res.status(200).json({
        rejected: true,
        status: 'Rejected',
        message: 'Your registration application was rejected by the hostel owner.',
        rejectionReason: user.rejectionReason || reg?.rejectionReason || 'Application details could not be verified.',
        reviewedAt: reg?.reviewedAt,
        reviewedBy: reg?.reviewedBy || 'Rajesh Sharma (Owner)',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          registrationStatus: 'Rejected',
          rejectionReason: user.rejectionReason || reg?.rejectionReason,
        },
        registration: reg,
      });
    }
  }

  const token = `token-${user.id}`;
  const resident = user.residentId ? db.residents.find((r) => r.id === user.residentId) : null;

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      residentId: user.residentId,
      registrationStatus: user.registrationStatus || 'Approved',
    },
    resident,
  });
});

// ---------------- EMAIL OTP VERIFICATION FOR REGISTRATION ----------------
apiRouter.post('/auth/send-registration-otp', (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const db = getDb();

  // 16. DUPLICATE ACCOUNTS: Prevent duplicate email
  const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  const existingResident = db.residents.find((r) => r.email.toLowerCase() === cleanEmail);
  const existingReg = (db.registrations || []).find(
    (r) => r.email.toLowerCase() === cleanEmail && r.status !== 'Rejected'
  );

  if (existingUser || existingResident || existingReg) {
    return res.status(400).json({ error: 'This email address is already registered.' });
  }

  if (!db.emailOTPs) db.emailOTPs = [];
  const existingOtp = db.emailOTPs.find((o) => o.email.toLowerCase() === cleanEmail && o.purpose === 'registration');
  const now = Date.now();

  // Cooldown check (45s)
  if (existingOtp && now - existingOtp.lastSentAt < 45000) {
    const remaining = Math.ceil((45000 - (now - existingOtp.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining}s before requesting a new OTP.` });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

  if (existingOtp) {
    existingOtp.otp = otp;
    existingOtp.createdAt = now;
    existingOtp.expiresAt = expiresAt;
    existingOtp.attempts = 0;
    existingOtp.lastSentAt = now;
    existingOtp.verified = false;
  } else {
    db.emailOTPs.push({
      email: cleanEmail,
      otp,
      purpose: 'registration',
      createdAt: now,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verified: false,
    });
  }

  saveDb(db);

  // Requirement: Do not display the OTP anywhere in the application UI
  console.log(`[Hostel Email Verification] Registration 6-digit OTP for ${cleanEmail}: ${otp}`);

  return res.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
    cooldownSeconds: 45,
    expiresInMinutes: 10,
  });
});

apiRouter.post('/auth/verify-registration-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const db = getDb();

  const record = (db.emailOTPs || []).find(
    (o) => o.email.toLowerCase() === cleanEmail && o.purpose === 'registration'
  );
  if (!record) {
    return res.status(400).json({ error: 'No active OTP request found for this email. Please request an OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'OTP has expired (valid for 10 minutes). Please request a new code.' });
  }

  if (record.attempts >= 5) {
    return res.status(400).json({ error: 'Maximum verification attempts exceeded (5/5). Please request a new OTP.' });
  }

  record.attempts += 1;

  if (record.otp !== cleanOtp) {
    const attemptsLeft = Math.max(0, 5 - record.attempts);
    saveDb(db);
    return res.status(400).json({
      error: `Invalid OTP code. Please check the code sent to your email. (${attemptsLeft} attempts remaining)`,
    });
  }

  record.verified = true;
  saveDb(db);

  return res.json({
    success: true,
    verified: true,
    message: 'Email Verified',
  });
});

// ---------------- RESIDENT REGISTRATION ----------------
apiRouter.post('/auth/register-resident', (req, res) => {
  const {
    fullName,
    avatar,
    dob,
    gender,
    mobile,
    email,
    address,
    city,
    state,
    pinCode,
    emergencyContactName,
    emergencyContactNumber,
    emergencyRelationship,
    workOrCollege,
    designation,
    whatTheyDo,
    password,
  } = req.body;

  // Validation
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Full Name is required.' });
  }
  if (!avatar || !String(avatar).trim()) {
    return res.status(400).json({ error: 'Profile photo is required. Please upload your photo.' });
  }
  if (!dob) {
    return res.status(400).json({ error: 'Date of Birth is required.' });
  }
  if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
    return res.status(400).json({ error: 'Please select your gender.' });
  }
  if (!isValidIndianMobile(mobile)) {
    return res.status(400).json({
      error: 'Please enter a valid 10-digit Indian mobile number (+91XXXXXXXXXX or starting with 6, 7, 8, or 9).',
    });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!address || !city || !state || !pinCode) {
    return res.status(400).json({ error: 'Permanent address, city, state, and PIN code are required.' });
  }
  if (!/^\d{6}$/.test(String(pinCode).trim())) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
  }
  if (!emergencyContactName || !emergencyContactNumber || !emergencyRelationship) {
    return res.status(400).json({ error: 'Emergency contact name, number, and relationship are required.' });
  }
  if (!isValidIndianMobile(emergencyContactNumber)) {
    return res.status(400).json({
      error: 'Please enter a valid Indian mobile number for emergency contact.',
    });
  }
  if (!workOrCollege || !designation || !whatTheyDo) {
    return res.status(400).json({ error: 'College/Company, designation, and occupation details are required.' });
  }

  // Strong password check
  const pwdVal = validateStrongPassword(password);
  if (!pwdVal.valid) {
    return res.status(400).json({ error: pwdVal.error });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = normalizeIndianMobile(mobile);
  const rawMobileDigits = mobile.replace(/\D/g, '').slice(-10);

  const db = getDb();

  // Verify email OTP was completed
  const otpRecord = (db.emailOTPs || []).find(
    (o) => o.email.toLowerCase() === cleanEmail && o.purpose === 'registration' && o.verified
  );
  if (!otpRecord) {
    return res.status(400).json({
      error: 'Email verification is required. Please verify your email with the 6-digit OTP before submitting.',
    });
  }

  // Duplicate checks
  const existingUserByEmail = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  const existingResByEmail = db.residents.find((r) => r.email.toLowerCase() === cleanEmail);
  const existingRegByEmail = (db.registrations || []).find(
    (r) => r.email.toLowerCase() === cleanEmail && r.status !== 'Rejected'
  );
  if (existingUserByEmail || existingResByEmail || existingRegByEmail) {
    return res.status(400).json({ error: 'This email address is already registered.' });
  }

  const existingResByMobile = db.residents.find((r) => r.mobile.replace(/\D/g, '').endsWith(rawMobileDigits));
  const existingRegByMobile = (db.registrations || []).find(
    (r) => r.mobile.replace(/\D/g, '').endsWith(rawMobileDigits) && r.status !== 'Rejected'
  );
  if (existingResByMobile || existingRegByMobile) {
    return res.status(400).json({ error: 'This mobile number is already registered.' });
  }

  const regId = `REG-${Date.now().toString().slice(-6)}`;
  const passwordHash = hashPassword(password);

  const newReg: ResidentRegistration & { passwordHash: string } = {
    id: regId,
    fullName: fullName.trim(),
    avatar: avatar.trim(),
    dob,
    gender,
    mobile: cleanMobile,
    email: cleanEmail,
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    address: address.trim(),
    city: city.trim(),
    state: state.trim(),
    pinCode: pinCode.trim(),
    emergencyContactName: emergencyContactName.trim(),
    emergencyContactNumber: normalizeIndianMobile(emergencyContactNumber),
    emergencyRelationship: emergencyRelationship.trim(),
    workOrCollege: workOrCollege.trim(),
    designation: designation.trim(),
    whatTheyDo,
    passwordHash,
    status: 'Waiting for Owner Approval',
    createdAt: new Date().toISOString(),
  };

  if (!db.registrations) db.registrations = [];
  db.registrations.unshift(newReg);

  // Create pending resident user account
  const baseUsername = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `res${regId.toLowerCase()}`;
  let username = baseUsername;
  let counter = 1;
  while (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    username = `${baseUsername}${counter++}`;
  }

  const currentTermsVersion = db.termsConfig?.version || 'v2.0-2026';
  const now = new Date();
  const acceptedDate = now.toISOString().split('T')[0];
  const acceptedTime = now.toLocaleTimeString('en-IN', { hour12: true });

  const newUser: User & { passwordHash: string } = {
    id: `usr-${regId.toLowerCase()}`,
    username,
    passwordHash,
    role: 'resident',
    name: fullName.trim(),
    email: cleanEmail,
    avatar: avatar.trim(),
    registrationStatus: 'Waiting for Owner Approval',
    termsAcceptedVersion: currentTermsVersion,
    termsAcceptedAt: now.toISOString(),
  };
  db.users.push(newUser);

  if (!db.termsAcceptances) db.termsAcceptances = [];
  db.termsAcceptances.push({
    id: `TRM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: newUser.id,
    username: newUser.username,
    userName: fullName.trim(),
    userRole: 'resident',
    version: currentTermsVersion,
    termsVersion: currentTermsVersion,
    acceptedAt: now.toISOString(),
    acceptedDate,
    acceptedTime,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    deviceBrowser: (req.headers['user-agent'] as string) || 'Browser Registration Client',
  });

  // Send admin notification
  db.notices.unshift({
    id: `NOT-REG-${Date.now()}`,
    title: 'New Resident Registration Request',
    message: `${fullName.trim()} (${cleanMobile}, ${cleanEmail}) has completed registration and is waiting for Owner Approval.`,
    date: new Date().toISOString().split('T')[0],
    priority: 'Urgent',
    targetAudience: 'admin',
    createdBy: 'Resident Registration System',
  });

  saveDb(db);

  return res.status(201).json({
    success: true,
    status: 'Waiting for Owner Approval',
    message: 'Your registration has been submitted and is waiting for hostel owner approval.',
    registration: {
      id: newReg.id,
      fullName: newReg.fullName,
      email: newReg.email,
      mobile: newReg.mobile,
      status: newReg.status,
      createdAt: newReg.createdAt,
    },
  });
});

// Re-submit rejected registration
apiRouter.post('/auth/resubmit-registration', (req, res) => {
  const { id, email, ...data } = req.body;
  const db = getDb();
  const cleanEmail = (email || '').toLowerCase().trim();
  const reg = (db.registrations || []).find((r) => r.id === id || r.email.toLowerCase() === cleanEmail);
  if (!reg) {
    return res.status(404).json({ error: 'Registration application not found.' });
  }

  if (data.fullName) reg.fullName = data.fullName.trim();
  if (data.avatar) reg.avatar = data.avatar.trim();
  if (data.dob) reg.dob = data.dob;
  if (data.gender) reg.gender = data.gender;
  if (data.mobile && isValidIndianMobile(data.mobile)) reg.mobile = normalizeIndianMobile(data.mobile);
  if (data.address) reg.address = data.address.trim();
  if (data.city) reg.city = data.city.trim();
  if (data.state) reg.state = data.state.trim();
  if (data.pinCode) reg.pinCode = data.pinCode.trim();
  if (data.emergencyContactName) reg.emergencyContactName = data.emergencyContactName.trim();
  if (data.emergencyContactNumber && isValidIndianMobile(data.emergencyContactNumber)) {
    reg.emergencyContactNumber = normalizeIndianMobile(data.emergencyContactNumber);
  }
  if (data.emergencyRelationship) reg.emergencyRelationship = data.emergencyRelationship.trim();
  if (data.workOrCollege) reg.workOrCollege = data.workOrCollege.trim();
  if (data.designation) reg.designation = data.designation.trim();
  if (data.whatTheyDo) reg.whatTheyDo = data.whatTheyDo;
  if (data.password) {
    const pwdVal = validateStrongPassword(data.password);
    if (pwdVal.valid) {
      reg.passwordHash = hashPassword(data.password);
    }
  }

  reg.status = 'Waiting for Owner Approval';
  delete reg.rejectionReason;
  reg.createdAt = new Date().toISOString();

  // Update user
  const user = db.users.find((u) => u.email.toLowerCase() === reg.email.toLowerCase());
  if (user) {
    user.registrationStatus = 'Waiting for Owner Approval';
    delete user.rejectionReason;
    if (data.password && validateStrongPassword(data.password).valid) {
      user.passwordHash = hashPassword(data.password);
    }
  }

  saveDb(db);

  return res.json({
    success: true,
    status: 'Waiting for Owner Approval',
    message: 'Your updated registration has been re-submitted and is waiting for hostel owner approval.',
    registration: reg,
  });
});

// ---------------- FORGOT PASSWORD WITH EMAIL OTP ----------------
apiRouter.post('/auth/forgot-password/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const db = getDb();

  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail && u.role === 'resident');
  const resident = db.residents.find((r) => r.email.toLowerCase() === cleanEmail);

  if (!user && !resident) {
    return res.status(404).json({ error: 'No registered resident account found with this email address.' });
  }

  if (!db.emailOTPs) db.emailOTPs = [];
  const existingOtp = db.emailOTPs.find((o) => o.email.toLowerCase() === cleanEmail && o.purpose === 'forgot_password');
  const now = Date.now();

  if (existingOtp && now - existingOtp.lastSentAt < 45000) {
    const remaining = Math.ceil((45000 - (now - existingOtp.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining}s before requesting a new OTP.` });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000;

  if (existingOtp) {
    existingOtp.otp = otp;
    existingOtp.createdAt = now;
    existingOtp.expiresAt = expiresAt;
    existingOtp.attempts = 0;
    existingOtp.lastSentAt = now;
    existingOtp.verified = false;
  } else {
    db.emailOTPs.push({
      email: cleanEmail,
      otp,
      purpose: 'forgot_password',
      createdAt: now,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verified: false,
    });
  }

  saveDb(db);
  console.log(`[Hostel Password Reset] Dispatched 6-digit OTP for ${cleanEmail}: ${otp}`);

  return res.json({
    success: true,
    message: `A 6-digit password reset code has been sent to ${cleanEmail}. Please check your inbox.`,
    cooldownSeconds: 45,
  });
});

apiRouter.post('/auth/forgot-password/reset', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, 6-digit OTP, and new password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const db = getDb();

  const record = (db.emailOTPs || []).find(
    (o) => o.email.toLowerCase() === cleanEmail && o.purpose === 'forgot_password'
  );
  if (!record) {
    return res.status(400).json({ error: 'No password reset request found for this email. Please request an OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  if (record.attempts >= 5) {
    return res.status(400).json({ error: 'Maximum attempts exceeded (5/5). Please request a new OTP.' });
  }

  record.attempts += 1;
  if (record.otp !== cleanOtp) {
    const remaining = Math.max(0, 5 - record.attempts);
    saveDb(db);
    return res.status(400).json({ error: `Invalid 6-digit OTP code. (${remaining} attempts left)` });
  }

  const pwdVal = validateStrongPassword(newPassword);
  if (!pwdVal.valid) {
    return res.status(400).json({ error: pwdVal.error });
  }

  const hashed = hashPassword(newPassword);
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.passwordHash = hashed;
  }
  const reg = (db.registrations || []).find((r) => r.email.toLowerCase() === cleanEmail);
  if (reg) {
    reg.passwordHash = hashed;
  }

  record.verified = true;
  saveDb(db);

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
  });
});

// Backward-compatible fallback
apiRouter.post('/auth/forgot-password', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Please enter your registered mobile number or email' });
  }

  const db = getDb();
  const cleanId = String(identifier).trim().toLowerCase();
  const rawDigits = cleanId.replace(/\D/g, '');

  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (rawDigits.length >= 7 && (u.email.includes(rawDigits) || u.username.includes(rawDigits)))
  );

  const resident = rawDigits.length >= 7
    ? db.residents.find((r) => r.mobile.replace(/\D/g, '').endsWith(rawDigits))
    : null;

  if (!user && !resident) {
    return res.status(404).json({
      error: 'No registered user or resident found with this mobile/email.',
    });
  }

  return res.json({
    success: true,
    message: 'Password reset verification code dispatched to registered email/mobile.',
  });
});

// ---------------- OWNER RESIDENT APPROVAL ROUTES ----------------

// GET all registrations
apiRouter.get('/admin/registrations', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const regs = db.registrations || [];
  const pendingCount = regs.filter((r) => r.status === 'Waiting for Owner Approval').length;
  const approvedCount = regs.filter((r) => r.status === 'Approved').length;
  const rejectedCount = regs.filter((r) => r.status === 'Rejected').length;

  const safeList = regs.map(({ passwordHash, ...rest }) => rest);

  return res.json({
    registrations: safeList,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: regs.length,
    },
  });
});

// GET single registration detail
apiRouter.get('/admin/registrations/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const reg = (db.registrations || []).find((r) => r.id === req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration request not found.' });
  }
  const { passwordHash, ...safeReg } = reg;
  return res.json(safeReg);
});

// APPROVE registration
apiRouter.post('/admin/registrations/:id/approve', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const reg = (db.registrations || []).find((r) => r.id === req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration request not found.' });
  }

  const { roomNumber, bedNumber, monthlyRent, securityDeposit } = req.body;

  let targetRoom = roomNumber ? db.rooms.find((r) => r.roomNumber === String(roomNumber)) : null;
  if (!targetRoom) {
    targetRoom = db.rooms.find((r) => r.beds.some((b) => !b.isOccupied));
  }
  if (!targetRoom) {
    return res.status(400).json({ error: 'All rooms are currently fully occupied. Please free up a bed before approving.' });
  }

  let targetBed = bedNumber
    ? targetRoom.beds.find((b) => b.bedNumber.toLowerCase() === String(bedNumber).toLowerCase() && !b.isOccupied)
    : targetRoom.beds.find((b) => !b.isOccupied);

  if (!targetBed) {
    targetBed = targetRoom.beds.find((b) => !b.isOccupied);
  }
  if (!targetBed) {
    return res.status(400).json({ error: `Selected room ${targetRoom.roomNumber} has no available bed.` });
  }

  const assignedRent = Number(monthlyRent) || targetRoom.rentPerPerson;
  const defaultDep = targetRoom.type === 'single'
    ? (db.settings.defaultSecurityDepositSingle ?? 4500)
    : (db.settings.defaultSecurityDepositDouble ?? 3500);
  const assignedDeposit = securityDeposit !== undefined ? Number(securityDeposit) : defaultDep;
  const newResidentId = `RES-${targetRoom.roomNumber}-${reg.id.replace('REG-', '').slice(-4)}`;

  const newResident: Resident = {
    id: newResidentId,
    fullName: reg.fullName,
    avatar: reg.avatar,
    dob: reg.dob,
    gender: reg.gender,
    mobile: reg.mobile,
    email: reg.email,
    address: reg.address,
    city: reg.city,
    state: reg.state,
    pinCode: reg.pinCode,
    emergencyContactName: reg.emergencyContactName,
    emergencyContactNumber: reg.emergencyContactNumber,
    emergencyRelationship: reg.emergencyRelationship,
    idType: 'Aadhaar Card',
    idNumber: 'VERIFIED-OTP-' + reg.id,
    roomNumber: targetRoom.roomNumber,
    floor: targetRoom.floor,
    bedNumber: targetBed.bedNumber,
    roomType: targetRoom.type,
    joiningDate: new Date().toISOString().split('T')[0],
    monthlyRent: assignedRent,
    securityDeposit: assignedDeposit,
    depositStatus: 'Paid',
    status: 'Active',
    workOrCollege: reg.workOrCollege,
    designation: reg.designation,
    notes: `Approved resident registration (${reg.whatTheyDo}). Emergency Contact: ${reg.emergencyContactName} (${reg.emergencyRelationship}, ${reg.emergencyContactNumber}).`,
    createdAt: reg.createdAt,
  };

  targetBed.isOccupied = true;
  targetBed.residentId = newResident.id;
  targetBed.residentName = newResident.fullName;
  const occCount = targetRoom.beds.filter((b) => b.isOccupied).length;
  targetRoom.status = occCount === targetRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';

  db.residents.push(newResident);

  // Security deposit
  db.deposits.push({
    id: `DEP-${newResident.id}`,
    residentId: newResident.id,
    residentName: newResident.fullName,
    roomNumber: newResident.roomNumber,
    bedNumber: newResident.bedNumber,
    roomType: newResident.roomType,
    amount: assignedDeposit,
    datePaid: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    refundableAmount: assignedDeposit,
    deductionAmount: 0,
    finalSettlementStatus: 'Held in Custody',
    status: 'Held',
    notes: 'Standard security deposit paid during approved registration onboarding',
  });

  // First month invoice
  const curMonth = 'September 2026';
  db.bills.push({
    id: `INV-${Date.now().toString().slice(-4)}-${newResident.roomNumber}`,
    residentId: newResident.id,
    residentName: newResident.fullName,
    roomNumber: newResident.roomNumber,
    floor: newResident.floor,
    roomType: newResident.roomType,
    billingMonth: curMonth,
    rentAmount: assignedRent,
    otherCharges: 0,
    discount: 0,
    previousBalance: 0,
    totalAmount: assignedRent,
    amountPaid: 0,
    remainingBalance: assignedRent,
    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'Pending',
    createdAt: new Date().toISOString(),
  });

  // Update registration record
  reg.status = 'Approved';
  reg.reviewedAt = new Date().toISOString();
  reg.reviewedBy = req.user?.name || 'Rajesh Sharma (Owner)';
  reg.assignedRoomNumber = targetRoom.roomNumber;
  reg.assignedBedNumber = targetBed.bedNumber;
  reg.assignedMonthlyRent = assignedRent;
  reg.approvedResidentId = newResident.id;

  // Update User
  let user = db.users.find((u) => u.email.toLowerCase() === reg.email.toLowerCase());
  if (user) {
    user.registrationStatus = 'Approved';
    user.residentId = newResident.id;
    user.name = newResident.fullName;
    user.avatar = newResident.avatar;
  } else {
    const baseUsername = reg.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `res${targetRoom.roomNumber}`;
    user = {
      id: `usr-${reg.id.toLowerCase()}`,
      username: baseUsername,
      passwordHash: reg.passwordHash,
      role: 'resident',
      name: newResident.fullName,
      email: newResident.email,
      avatar: newResident.avatar,
      residentId: newResident.id,
      registrationStatus: 'Approved',
    };
    db.users.push(user);
  }

  // Welcome message for resident
  db.messages.push({
    id: `msg-${Date.now()}`,
    senderId: req.user!.id,
    senderName: req.user!.name,
    senderRole: 'admin',
    receiverId: user.id,
    message: `Welcome to ${db.settings.hostelName}! Your resident registration has been approved. You have been assigned Room ${targetRoom.roomNumber} (${targetBed.bedNumber}). You now have full access to your resident dashboard, rent bills, meal menu, and facility passes.`,
    createdAt: new Date().toISOString(),
    read: false,
  });

  saveDb(db);

  return res.json({
    success: true,
    message: `Resident registration for ${reg.fullName} approved successfully! Room ${targetRoom.roomNumber} (${targetBed.bedNumber}) assigned.`,
    resident: newResident,
    registration: reg,
  });
});

// REJECT registration
apiRouter.post('/admin/registrations/:id/reject', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const { rejectionReason } = req.body;
  if (!rejectionReason || !String(rejectionReason).trim()) {
    return res.status(400).json({ error: 'Please provide a clear rejection reason.' });
  }

  const db = getDb();
  const reg = (db.registrations || []).find((r) => r.id === req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration request not found.' });
  }

  const reason = String(rejectionReason).trim();
  reg.status = 'Rejected';
  reg.rejectionReason = reason;
  reg.reviewedAt = new Date().toISOString();
  reg.reviewedBy = req.user?.name || 'Rajesh Sharma (Owner)';

  const user = db.users.find((u) => u.email.toLowerCase() === reg.email.toLowerCase());
  if (user) {
    user.registrationStatus = 'Rejected';
    user.rejectionReason = reason;
  }

  saveDb(db);

  return res.json({
    success: true,
    message: 'Registration application has been marked as Rejected.',
    registration: reg,
  });
});

apiRouter.post('/auth/activate-account', (req, res) => {
  const { identifier, roomNumber, newPassword } = req.body;
  if (!identifier || !roomNumber || !newPassword) {
    return res.status(400).json({
      error: 'Mobile number / Resident ID, Room number, and new password are required.',
    });
  }

  const db = getDb();
  const cleanId = String(identifier).trim().toLowerCase();
  const rawDigits = cleanId.replace(/\D/g, '');
  const cleanRoom = String(roomNumber).trim();

  // Find resident
  const resident = db.residents.find((r) => {
    const matchRoom = r.roomNumber.toLowerCase() === cleanRoom.toLowerCase();
    const matchId = r.id.toLowerCase() === cleanId;
    const matchMobile = rawDigits.length >= 7 && r.mobile.replace(/\D/g, '').endsWith(rawDigits);
    const matchEmail = r.email.toLowerCase() === cleanId;
    return matchRoom && (matchId || matchMobile || matchEmail);
  });

  if (!resident) {
    return res.status(404).json({
      error: 'No active resident record matched the provided mobile/ID and Room ' + cleanRoom + '.',
    });
  }

  // Update or create user account
  let user = db.users.find((u) => u.residentId === resident.id);
  if (user) {
    user.passwordHash = hashPassword(newPassword);
    user.registrationStatus = 'Approved';
  } else {
    const baseUsername = resident.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || `res${resident.roomNumber}`;
    user = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      username: baseUsername,
      passwordHash: hashPassword(newPassword),
      role: 'resident',
      name: resident.fullName,
      email: resident.email,
      avatar: resident.avatar,
      residentId: resident.id,
      registrationStatus: 'Approved',
    };
    db.users.push(user);
  }

  saveDb(db);

  return res.json({
    success: true,
    message: `Account activated successfully for ${resident.fullName}! You can now sign in with your credentials.`,
    username: user.username,
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resident = req.user?.residentId ? db.residents.find((r) => r.id === req.user?.residentId) : null;
  return res.json({ user: req.user, resident });
});

// ---------------- SETTINGS & PRICING ----------------
apiRouter.get('/settings', (req, res) => {
  const db = getDb();
  return res.json(db.settings);
});

apiRouter.put('/settings', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const updates = req.body;

  // Check if rents changed - if so, add to rentHistory without touching past invoices
  const oldSingle = db.settings.singleRent;
  const oldDouble = db.settings.doubleRent;
  const newSingle = updates.singleRent !== undefined ? Number(updates.singleRent) : oldSingle;
  const newDouble = updates.doubleRent !== undefined ? Number(updates.doubleRent) : oldDouble;

  if (newSingle !== oldSingle || newDouble !== oldDouble) {
    const historyEntry = {
      id: `rh-${Date.now()}`,
      effectiveDate: updates.rentEffectiveDate || new Date().toISOString().split('T')[0],
      singleRent: newSingle,
      doubleRent: newDouble,
      notes: updates.rentChangeNote || `Rent updated from Single ₹${oldSingle} / Double ₹${oldDouble} to Single ₹${newSingle} / Double ₹${newDouble}`,
      createdAt: new Date().toISOString(),
    };
    db.settings.rentHistory.push(historyEntry);
  }

  const newDepositSingle = updates.defaultSecurityDepositSingle !== undefined
    ? Number(updates.defaultSecurityDepositSingle)
    : (db.settings.defaultSecurityDepositSingle ?? 4500);
  const newDepositDouble = updates.defaultSecurityDepositDouble !== undefined
    ? Number(updates.defaultSecurityDepositDouble)
    : (db.settings.defaultSecurityDepositDouble ?? 3500);

  db.settings = {
    ...db.settings,
    ...updates,
    singleRent: newSingle,
    doubleRent: newDouble,
    defaultSecurityDepositSingle: newDepositSingle,
    defaultSecurityDepositDouble: newDepositDouble,
  };

  saveDb(db);
  return res.json(db.settings);
});

// ---------------- DASHBOARD STATS ----------------
apiRouter.get('/dashboard/stats', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();

  // If resident, they should not get full owner stats
  if (req.user?.role === 'resident') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  const floorsSet = new Set(db.rooms.map((r) => r.floor));
  const totalFloors = floorsSet.size;
  const totalRooms = db.rooms.length;

  let totalBeds = 0;
  let occupiedBeds = 0;
  let singleRoomsOccupied = 0;
  let doubleRoomsOccupied = 0;
  let fullyOccupiedRooms = 0;
  let partiallyOccupiedRooms = 0;
  let completelyVacantRooms = 0;

  db.rooms.forEach((room) => {
    totalBeds += room.capacity;
    const occupiedInRoom = room.beds.filter((b) => b.isOccupied).length;
    occupiedBeds += occupiedInRoom;

    if (occupiedInRoom === room.capacity && room.capacity > 0) {
      fullyOccupiedRooms += 1;
    } else if (occupiedInRoom > 0 && occupiedInRoom < room.capacity) {
      partiallyOccupiedRooms += 1;
    } else {
      completelyVacantRooms += 1;
    }

    if (room.type === 'single' && occupiedInRoom > 0) {
      singleRoomsOccupied += 1;
    }
    if (room.type === 'double' && occupiedInRoom > 0) {
      doubleRoomsOccupied += 1;
    }
  });

  const availableBeds = totalBeds - occupiedBeds;
  const vacantBeds = availableBeds;
  const vacantRooms = completelyVacantRooms;
  const totalResidents = db.residents.filter((r) => r.status === 'Active' || r.status === 'Notice period').length;

  // Real-time presence counts
  const presenceList = db.residentPresence || [];
  const activeResidentsInCount = presenceList.filter((p) => p.status === 'IN').length;
  const activeResidentsOutCount = presenceList.filter((p) => p.status === 'OUT').length;

  // Rent calculations for current active month (e.g. September 2026)
  const currentMonthBills = db.bills.filter((b) => b.billingMonth.includes('September 2026') || b.billingMonth.includes('Sep 2026') || b.billingMonth.includes('2026-09'));
  const currentMonthExpectedRent = currentMonthBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const rentCollected = currentMonthBills.reduce((acc, b) => acc + b.amountPaid, 0);
  const rentPending = currentMonthBills.reduce((acc, b) => acc + (b.remainingBalance > 0 ? b.remainingBalance : 0), 0);
  const overduePayments = currentMonthBills.filter((b) => b.status === 'Overdue').length;

  const openComplaints = db.complaints.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const resolvedComplaints = db.complaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;

  const upcomingCleanings = db.cleaning.filter((c) => c.status === 'Scheduled' || c.status === 'Overdue').length;

  const recentResidents = [...db.residents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentPayments = [...db.payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  const recentComplaints = [...db.complaints]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats: DashboardStats = {
    totalFloors,
    totalRooms,
    totalBeds,
    occupiedBeds,
    availableBeds,
    totalResidents,
    singleRoomsOccupied,
    doubleRoomsOccupied,
    vacantRooms,
    vacantBeds,
    totalCapacity: totalBeds,
    fullyOccupiedRooms,
    partiallyOccupiedRooms,
    completelyVacantRooms,
    activeResidentsInCount,
    activeResidentsOutCount,
    currentMonthExpectedRent,
    rentCollected,
    rentPending,
    overduePayments,
    openComplaints,
    resolvedComplaints,
    upcomingCleanings,
    recentResidents,
    recentPayments,
    recentComplaints,
    notices: db.notices.slice(0, 5),
    pendingRegistrationsCount: (db.registrations || []).filter((r) => r.status === 'Waiting for Owner Approval').length,
    pendingVisitorRequestsCount: (db.visitors || []).filter((v) => v.status === 'Waiting for Approval').length,
    pendingRentConfirmationsCount: (db.rentConfirmations || []).filter((rc) => rc.status === 'Payment Confirmation Pending').length,
  };

  return res.json(stats);
});

// ---------------- ROOM MANAGEMENT ----------------
apiRouter.get('/rooms', (req, res) => {
  const db = getDb();
  return res.json(db.rooms);
});

apiRouter.post('/rooms', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { roomNumber, floor, type, capacity, facilities, rentPerPerson, notes } = req.body;

  if (!roomNumber || !floor || !type) {
    return res.status(400).json({ error: 'Room number, floor, and type are required' });
  }

  if (db.rooms.some((r) => r.roomNumber === roomNumber)) {
    return res.status(400).json({ error: `Room ${roomNumber} already exists` });
  }

  const cap = Number(capacity) || (type === 'single' ? 1 : 2);
  const rent = Number(rentPerPerson) || (type === 'single' ? db.settings.singleRent : db.settings.doubleRent);

  const beds = Array.from({ length: cap }, (_, idx) => ({
    id: `bed-${roomNumber}-${idx + 1}`,
    bedNumber: `Bed ${idx + 1}`,
    isOccupied: false,
  }));

  const newRoom: Room = {
    id: `room-${roomNumber}`,
    roomNumber: String(roomNumber),
    floor: Number(floor),
    type,
    capacity: cap,
    status: 'Available',
    facilities: facilities || (type === 'single' ? ['1 Bed', '1 Fan', '1 Light', '1 English Toilet', 'Attached Bathroom', 'Switchboard'] : ['1 Bed', '1 Double Sleeping Bed', '1 Fan', '1 Light', '2 Switchboards', '1 Indian Toilet', 'Attached Bathroom']),
    beds,
    rentPerPerson: rent,
    totalRoomRent: rent * cap,
    notes: notes || '',
  };

  db.rooms.push(newRoom);
  saveDb(db);
  return res.status(201).json(newRoom);
});

apiRouter.put('/rooms/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const roomIndex = db.rooms.findIndex((r) => r.id === req.params.id || r.roomNumber === req.params.id);
  if (roomIndex === -1) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const existingRoom = db.rooms[roomIndex];
  const { type, capacity, status, facilities, rentPerPerson, notes } = req.body;

  let newCapacity = capacity !== undefined ? Number(capacity) : existingRoom.capacity;
  let newType = type || existingRoom.type;
  let newRent = rentPerPerson !== undefined ? Number(rentPerPerson) : existingRoom.rentPerPerson;

  // Preserve existing bed assignments if capacity is kept or increased
  let newBeds = [...existingRoom.beds];
  if (newCapacity > existingRoom.beds.length) {
    for (let i = existingRoom.beds.length + 1; i <= newCapacity; i++) {
      newBeds.push({
        id: `bed-${existingRoom.roomNumber}-${i}`,
        bedNumber: `Bed ${i}`,
        isOccupied: false,
      });
    }
  } else if (newCapacity < existingRoom.beds.length) {
    // Only allow shrinking if extra beds aren't occupied
    const occupiedBedsOver = existingRoom.beds.slice(newCapacity).some((b) => b.isOccupied);
    if (occupiedBedsOver) {
      return res.status(400).json({ error: 'Cannot reduce capacity: higher beds are currently occupied by residents' });
    }
    newBeds = newBeds.slice(0, newCapacity);
  }

  // Update room status according to occupants unless set to Maintenance
  let resolvedStatus = status || existingRoom.status;
  if (resolvedStatus !== 'Maintenance' && resolvedStatus !== 'Temporarily Unavailable') {
    const occupiedCount = newBeds.filter((b) => b.isOccupied).length;
    if (occupiedCount === newCapacity) {
      resolvedStatus = 'Fully Occupied';
    } else if (occupiedCount > 0) {
      resolvedStatus = 'Partially Occupied';
    } else {
      resolvedStatus = 'Available';
    }
  }

  const updatedRoom: Room = {
    ...existingRoom,
    type: newType,
    capacity: newCapacity,
    status: resolvedStatus,
    facilities: facilities || existingRoom.facilities,
    beds: newBeds,
    rentPerPerson: newRent,
    totalRoomRent: newRent * newCapacity,
    notes: notes !== undefined ? notes : existingRoom.notes,
  };

  db.rooms[roomIndex] = updatedRoom;
  saveDb(db);
  return res.json(updatedRoom);
});

apiRouter.delete('/rooms/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const room = db.rooms.find((r) => r.id === req.params.id || r.roomNumber === req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const isOccupied = room.beds.some((b) => b.isOccupied);
  if (isOccupied) {
    return res.status(400).json({ error: 'Cannot delete room: there are residents currently assigned to this room' });
  }

  db.rooms = db.rooms.filter((r) => r.id !== room.id);
  saveDb(db);
  return res.json({ success: true, message: `Room ${room.roomNumber} deleted` });
});

// ---------------- RESIDENT MANAGEMENT ----------------
apiRouter.get('/residents', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  // Privacy requirement: Resident can only view themselves!
  if (req.user?.role === 'resident') {
    const resident = db.residents.find((r) => r.id === req.user?.residentId);
    return res.json(resident ? [resident] : []);
  }

  // Admin can view all, filter by status, room, floor, search query
  let result = [...db.residents];
  const { status, floor, roomNumber, search } = req.query;

  if (status) {
    result = result.filter((r) => r.status.toLowerCase() === String(status).toLowerCase());
  }
  if (floor) {
    result = result.filter((r) => r.floor === Number(floor));
  }
  if (roomNumber) {
    result = result.filter((r) => r.roomNumber === String(roomNumber));
  }
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        r.roomNumber.includes(q) ||
        r.workOrCollege.toLowerCase().includes(q)
    );
  }

  return res.json(result);
});

apiRouter.get('/residents/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  // Privacy: If resident, must match their residentId
  if (req.user?.role === 'resident' && req.user.residentId !== resident.id) {
    return res.status(403).json({ error: 'Access denied: You cannot view other residents' });
  }

  return res.json(resident);
});

// CHECK-IN / ONBOARD RESIDENT
apiRouter.post('/residents', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const data = req.body;

  if (!data.fullName || !data.roomNumber || !data.mobile) {
    return res.status(400).json({ error: 'Full name, room number, and mobile number are required' });
  }

  const room = db.rooms.find((r) => r.roomNumber === String(data.roomNumber));
  if (!room) {
    return res.status(400).json({ error: `Room ${data.roomNumber} does not exist` });
  }

  // Find requested bed or first available bed
  let targetBed = data.bedNumber
    ? room.beds.find((b) => b.bedNumber.toLowerCase() === String(data.bedNumber).toLowerCase())
    : room.beds.find((b) => !b.isOccupied);

  if (!targetBed || targetBed.isOccupied) {
    return res.status(400).json({ error: `Selected bed in room ${data.roomNumber} is not available` });
  }

  const residentId = data.id || `RES-${data.roomNumber}-${Date.now().toString().slice(-4)}`;
  const rent = Number(data.monthlyRent) || room.rentPerPerson;
  const defaultRoomDeposit = (room.type || '').toLowerCase() === 'single'
    ? (db.settings.defaultSecurityDepositSingle ?? 4500)
    : (db.settings.defaultSecurityDepositDouble ?? 3500);
  const deposit = data.securityDeposit !== undefined && data.securityDeposit !== null && data.securityDeposit !== ''
    ? Number(data.securityDeposit)
    : defaultRoomDeposit;

  const newResident: Resident = {
    id: residentId,
    fullName: data.fullName,
    avatar: data.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    dob: data.dob || '2000-01-01',
    gender: data.gender || 'Male',
    mobile: data.mobile,
    email: data.email || `${residentId.toLowerCase()}@example.com`,
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    pinCode: data.pinCode || '',
    emergencyContactName: data.emergencyContactName || '',
    emergencyContactNumber: data.emergencyContactNumber || '',
    emergencyRelationship: data.emergencyRelationship || '',
    idType: data.idType || 'Aadhaar Card',
    idNumber: data.idNumber || '',
    idDocumentUrl: data.idDocumentUrl,
    roomNumber: room.roomNumber,
    floor: room.floor,
    bedNumber: targetBed.bedNumber,
    roomType: room.type,
    joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
    expectedLeavingDate: data.expectedLeavingDate,
    monthlyRent: rent,
    securityDeposit: deposit,
    depositStatus: data.depositPaid ? 'Paid' : 'Pending',
    status: 'Active',
    workOrCollege: data.workOrCollege || '',
    designation: data.designation || '',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
  };

  // Update room bed
  targetBed.isOccupied = true;
  targetBed.residentId = newResident.id;
  targetBed.residentName = newResident.fullName;

  const occupiedCount = room.beds.filter((b) => b.isOccupied).length;
  room.status = occupiedCount === room.capacity ? 'Fully Occupied' : 'Partially Occupied';

  // Create User login account for the resident
  const username = data.username || residentId.toLowerCase();
  const password = data.password || 'resident123';
  db.users.push({
    id: `usr-${residentId}`,
    username,
    passwordHash: password,
    role: 'resident',
    name: newResident.fullName,
    email: newResident.email,
    residentId: newResident.id,
    avatar: newResident.avatar,
  });

  // Create Check-in record
  db.checkInOuts.push({
    id: `CIO-${Date.now()}`,
    residentId: newResident.id,
    residentName: newResident.fullName,
    roomNumber: room.roomNumber,
    bedNumber: targetBed.bedNumber,
    type: 'check-in',
    date: newResident.joiningDate,
    securityDeposit: deposit,
    remarks: data.checkInRemarks || 'Check-in onboarding completed and keys handed over.',
  });

  // Create Security Deposit record with detailed accounting
  db.deposits.push({
    id: `DEP-${newResident.id}`,
    residentId: newResident.id,
    residentName: newResident.fullName,
    roomNumber: room.roomNumber,
    bedNumber: targetBed.bedNumber,
    roomType: room.type,
    amount: deposit,
    datePaid: newResident.joiningDate,
    depositDate: newResident.joiningDate,
    paymentMethod: data.depositPaymentMethod || 'UPI',
    paymentStatus: data.depositPaid !== false ? 'Paid' : 'Pending',
    refundableAmount: data.depositPaid !== false ? deposit : 0,
    refundAmount: 0,
    deductionAmount: 0,
    deductionReason: '',
    refundDate: '',
    finalSettlementStatus: data.depositPaid !== false ? 'Held in Custody' : 'Pending Settlement',
    status: data.depositPaid !== false ? 'Held' : 'Pending',
    notes: `Caution security deposit collected on check-in`,
  });

  // Generate initial bill for current month if requested
  if (data.generateFirstBill !== false) {
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const billId = `INV-${Date.now().toString().slice(-6)}`;
    db.bills.push({
      id: billId,
      residentId: newResident.id,
      residentName: newResident.fullName,
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.type,
      billingMonth: currentMonth,
      rentAmount: rent,
      otherCharges: 0,
      discount: 0,
      previousBalance: 0,
      totalAmount: rent,
      amountPaid: 0,
      remainingBalance: rent,
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });
  }

  db.residents.push(newResident);
  saveDb(db);

  return res.status(201).json({
    resident: newResident,
    loginCredentials: {
      username,
      password,
    },
  });
});

apiRouter.put('/residents/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resIndex = db.residents.findIndex((r) => r.id === req.params.id);
  if (resIndex === -1) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  const existing = db.residents[resIndex];

  // Privacy check: Resident can update personal contact details, not room/rent
  if (req.user?.role === 'resident') {
    if (req.user.residentId !== existing.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Resident edits limited fields
    const { mobile, email, address, city, state, pinCode, emergencyContactName, emergencyContactNumber, emergencyRelationship } = req.body;
    db.residents[resIndex] = {
      ...existing,
      mobile: mobile || existing.mobile,
      email: email || existing.email,
      address: address || existing.address,
      city: city || existing.city,
      state: state || existing.state,
      pinCode: pinCode || existing.pinCode,
      emergencyContactName: emergencyContactName || existing.emergencyContactName,
      emergencyContactNumber: emergencyContactNumber || existing.emergencyContactNumber,
      emergencyRelationship: emergencyRelationship || existing.emergencyRelationship,
    };
    saveDb(db);
    return res.json(db.residents[resIndex]);
  }

  // Admin can update everything
  const updates = req.body;
  const updated = {
    ...existing,
    ...updates,
    monthlyRent: updates.monthlyRent !== undefined ? Number(updates.monthlyRent) : existing.monthlyRent,
    securityDeposit: updates.securityDeposit !== undefined ? Number(updates.securityDeposit) : existing.securityDeposit,
  };

  db.residents[resIndex] = updated;

  // Also sync resident name with beds and user object
  const room = db.rooms.find((r) => r.roomNumber === updated.roomNumber);
  if (room) {
    const bed = room.beds.find((b) => b.bedNumber === updated.bedNumber);
    if (bed) {
      bed.residentName = updated.fullName;
    }
  }

  const user = db.users.find((u) => u.residentId === updated.id);
  if (user) {
    user.name = updated.fullName;
    user.email = updated.email;
  }

  saveDb(db);
  return res.json(updated);
});

// CHECK-OUT WORKFLOW
apiRouter.post('/residents/:id/checkout', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  const { checkoutDate, deductionAmount, deductionReason, remarks } = req.body;
  const dedAmt = Number(deductionAmount) || 0;
  const refundAmt = Math.max(0, resident.securityDeposit - dedAmt);

  // Free bed in room
  const room = db.rooms.find((r) => r.roomNumber === resident.roomNumber);
  if (room) {
    const bed = room.beds.find((b) => b.bedNumber === resident.bedNumber);
    if (bed) {
      bed.isOccupied = false;
      delete bed.residentId;
      delete bed.residentName;
    }
    const occupiedCount = room.beds.filter((b) => b.isOccupied).length;
    room.status = occupiedCount === 0 ? 'Available' : 'Partially Occupied';
  }

  // Update resident status
  resident.status = 'Vacated';
  resident.depositStatus = dedAmt > 0 ? 'Partially Refunded' : 'Refunded';

  // Update security deposit record
  const depositRecord = db.deposits.find((d) => d.residentId === resident.id);
  if (depositRecord) {
    depositRecord.status = dedAmt > 0 ? 'Partially Refunded' : 'Refunded';
    depositRecord.refundAmount = refundAmt;
    depositRecord.refundableAmount = 0;
    depositRecord.refundDate = checkoutDate || new Date().toISOString().split('T')[0];
    depositRecord.deductionAmount = dedAmt;
    depositRecord.deductionReason = deductionReason || '';
    depositRecord.finalSettlementStatus = dedAmt > 0 ? 'Settled with Deductions' : 'Fully Refunded';
  }

  // Record Check-out
  const checkOutRecord: CheckInOutRecord = {
    id: `CIO-${Date.now()}`,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    bedNumber: resident.bedNumber,
    type: 'check-out',
    date: checkoutDate || new Date().toISOString().split('T')[0],
    securityDeposit: resident.securityDeposit,
    deductions: dedAmt,
    refundAmount: refundAmt,
    remarks: remarks || `Checkout completed. Room ${resident.roomNumber} ${resident.bedNumber} released.`,
  };
  db.checkInOuts.push(checkOutRecord);

  saveDb(db);
  return res.json({ success: true, message: `Resident ${resident.fullName} checked out successfully. Bed released.`, record: checkOutRecord });
});

// CHANGE ROOM / MOVE RESIDENT
apiRouter.post('/residents/:id/change-room', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  const { newRoomNumber, newBedNumber, updateRent } = req.body;
  const targetRoom = db.rooms.find((r) => r.roomNumber === String(newRoomNumber));
  if (!targetRoom) {
    return res.status(400).json({ error: `Target room ${newRoomNumber} does not exist` });
  }

  const targetBed = targetRoom.beds.find((b) => b.bedNumber.toLowerCase() === String(newBedNumber).toLowerCase());
  if (!targetBed || targetBed.isOccupied) {
    return res.status(400).json({ error: `Bed ${newBedNumber} in room ${newRoomNumber} is already occupied or does not exist` });
  }

  // Release old bed
  const oldRoom = db.rooms.find((r) => r.roomNumber === resident.roomNumber);
  if (oldRoom) {
    const oldBed = oldRoom.beds.find((b) => b.bedNumber === resident.bedNumber);
    if (oldBed) {
      oldBed.isOccupied = false;
      delete oldBed.residentId;
      delete oldBed.residentName;
    }
    const occOld = oldRoom.beds.filter((b) => b.isOccupied).length;
    oldRoom.status = occOld === 0 ? 'Available' : 'Partially Occupied';
  }

  // Assign new bed
  targetBed.isOccupied = true;
  targetBed.residentId = resident.id;
  targetBed.residentName = resident.fullName;
  const occNew = targetRoom.beds.filter((b) => b.isOccupied).length;
  targetRoom.status = occNew === targetRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';

  resident.roomNumber = targetRoom.roomNumber;
  resident.floor = targetRoom.floor;
  resident.bedNumber = targetBed.bedNumber;
  resident.roomType = targetRoom.type;

  if (updateRent) {
    resident.monthlyRent = targetRoom.rentPerPerson;
  }

  saveDb(db);
  return res.json({ success: true, resident });
});

// ---------------- BILLING & INVOICES ----------------
apiRouter.get('/bills', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    const bills = db.bills.filter((b) => b.residentId === req.user?.residentId);
    return res.json(bills);
  }

  let result = [...db.bills];
  const { residentId, month, status, roomNumber, floor } = req.query;

  if (residentId) result = result.filter((b) => b.residentId === residentId);
  if (month) result = result.filter((b) => b.billingMonth.toLowerCase().includes(String(month).toLowerCase()));
  if (status) result = result.filter((b) => b.status.toLowerCase() === String(status).toLowerCase());
  if (roomNumber) result = result.filter((b) => b.roomNumber === String(roomNumber));
  if (floor) result = result.filter((b) => b.floor === Number(floor));

  return res.json(result);
});

// BULK MONTHLY BILL GENERATION
apiRouter.post('/bills/generate-monthly', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { billingMonth, dueDate } = req.body;

  if (!billingMonth) {
    return res.status(400).json({ error: 'Billing month is required (e.g. October 2026)' });
  }

  const activeResidents = db.residents.filter((r) => r.status === 'Active' || r.status === 'Notice period');
  const createdBills: Bill[] = [];

  activeResidents.forEach((resItem) => {
    // Check if already billed for this month
    const existing = db.bills.find(
      (b) => b.residentId === resItem.id && b.billingMonth.toLowerCase() === billingMonth.toLowerCase()
    );

    if (!existing) {
      const billId = `INV-${Date.now().toString().slice(-4)}-${resItem.roomNumber}`;
      const newBill: Bill = {
        id: billId,
        residentId: resItem.id,
        residentName: resItem.fullName,
        roomNumber: resItem.roomNumber,
        floor: resItem.floor,
        roomType: resItem.roomType,
        billingMonth,
        rentAmount: resItem.monthlyRent,
        otherCharges: 0,
        discount: 0,
        previousBalance: 0,
        totalAmount: resItem.monthlyRent,
        amountPaid: 0,
        remainingBalance: resItem.monthlyRent,
        dueDate: dueDate || new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };
      db.bills.push(newBill);
      createdBills.push(newBill);
    }
  });

  saveDb(db);
  return res.json({ success: true, count: createdBills.length, bills: createdBills });
});

apiRouter.post('/bills', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const data = req.body;

  const resident = db.residents.find((r) => r.id === data.residentId);
  if (!resident) {
    return res.status(400).json({ error: 'Resident not found' });
  }

  const rentAmount = Number(data.rentAmount) || resident.monthlyRent;
  const otherCharges = Number(data.otherCharges) || 0;
  const discount = Number(data.discount) || 0;
  const previousBalance = Number(data.previousBalance) || 0;
  const totalAmount = rentAmount + otherCharges + previousBalance - discount;

  const billId = data.id || `INV-${Date.now().toString().slice(-6)}`;
  const newBill: Bill = {
    id: billId,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    floor: resident.floor,
    roomType: resident.roomType,
    billingMonth: data.billingMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    rentAmount,
    otherCharges,
    otherChargesNote: data.otherChargesNote || '',
    discount,
    previousBalance,
    totalAmount,
    amountPaid: 0,
    remainingBalance: totalAmount,
    dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  db.bills.push(newBill);
  saveDb(db);
  return res.status(201).json(newBill);
});

apiRouter.get('/bills/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const bill = db.bills.find((b) => b.id === req.params.id);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  if (req.user?.role === 'resident' && bill.residentId !== req.user?.residentId) {
    return res.status(403).json({ error: 'Access denied: You cannot view this bill' });
  }
  return res.json(bill);
});

// ---------------- PAYMENTS ----------------
apiRouter.get('/payments', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    return res.json(db.payments.filter((p) => p.residentId === req.user?.residentId));
  }

  let result = [...db.payments];
  const { residentId, month, method, roomNumber, floor } = req.query;
  if (residentId) result = result.filter((p) => p.residentId === residentId);
  if (month) result = result.filter((p) => p.paymentDate.startsWith(String(month)));
  if (method) result = result.filter((p) => p.paymentMethod.toLowerCase() === String(method).toLowerCase());
  if (roomNumber) result = result.filter((p) => p.roomNumber === String(roomNumber));
  if (floor) result = result.filter((p) => p.floor === Number(floor));

  return res.json(result);
});

apiRouter.post('/payments', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { billId, amount, paymentMethod, transactionReference, notes, paymentDate } = req.body;

  const bill = db.bills.find((b) => b.id === billId);
  if (!bill) {
    return res.status(400).json({ error: 'Bill not found' });
  }

  const payAmt = Number(amount);
  if (isNaN(payAmt) || payAmt <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const payment: Payment = {
    id: `PAY-${Date.now().toString().slice(-6)}`,
    billId: bill.id,
    residentId: bill.residentId,
    residentName: bill.residentName,
    roomNumber: bill.roomNumber,
    floor: bill.floor,
    amount: payAmt,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'Cash',
    transactionReference: transactionReference || (paymentMethod === 'Cash' ? `CASH-${Date.now().toString().slice(-4)}` : `TXN-${Date.now().toString().slice(-6)}`),
    receivedBy: req.user?.name || 'Owner / Admin',
    notes: notes || '',
  };

  db.payments.push(payment);

  // Update Bill amounts & status
  bill.amountPaid += payAmt;
  bill.remainingBalance = Math.max(0, bill.totalAmount - bill.amountPaid);
  if (bill.remainingBalance === 0) {
    bill.status = 'Paid';
  } else {
    bill.status = 'Partially Paid';
  }

  saveDb(db);
  return res.status(201).json({ payment, bill });
});

// ---------------- SECURITY DEPOSITS ----------------
apiRouter.get('/deposits', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    return res.json(db.deposits.filter((d) => d.residentId === req.user?.residentId));
  }
  return res.json(db.deposits);
});

// ---------------- COMPLAINTS & ISSUE TICKETS ----------------
apiRouter.get('/complaints', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    return res.json(db.complaints.filter((c) => c.residentId === req.user?.residentId));
  }
  return res.json(db.complaints);
});

apiRouter.post('/complaints', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { title, category, description, priority, photoAttachment } = req.body;

  if (!title || !category || !description) {
    return res.status(400).json({ error: 'Title, category, and description are required' });
  }

  // If resident submitted, automatically attach their room and floor
  let residentId = req.user?.residentId;
  let residentName = req.user?.name || 'Resident';
  let roomNumber = '101';
  let floor = 1;

  if (req.user?.role === 'resident') {
    const resident = db.residents.find((r) => r.id === req.user?.residentId);
    if (resident) {
      residentId = resident.id;
      residentName = resident.fullName;
      roomNumber = resident.roomNumber;
      floor = resident.floor;
    }
  } else if (req.body.residentId) {
    const resDoc = db.residents.find((r) => r.id === req.body.residentId);
    if (resDoc) {
      residentId = resDoc.id;
      residentName = resDoc.fullName;
      roomNumber = resDoc.roomNumber;
      floor = resDoc.floor;
    }
  }

  const newComplaint: Complaint = {
    id: `CMP-${Date.now().toString().slice(-4)}`,
    residentId: residentId || 'RES-UNKNOWN',
    residentName,
    roomNumber,
    floor,
    title,
    category,
    description,
    priority: priority || 'Medium',
    status: 'Submitted',
    photoAttachment,
    createdAt: new Date().toISOString(),
    history: [
      {
        timestamp: new Date().toISOString(),
        status: 'Submitted',
        note: 'Complaint submitted by resident',
        by: residentName,
      },
    ],
  };

  db.complaints.push(newComplaint);
  saveDb(db);
  return res.status(201).json(newComplaint);
});

apiRouter.put('/complaints/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const complaint = db.complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  // Residents can only add comments or cancel their own complaint
  if (req.user?.role === 'resident') {
    if (complaint.residentId !== req.user.residentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.body.status === 'Closed') {
      complaint.status = 'Closed';
      complaint.history.push({
        timestamp: new Date().toISOString(),
        status: 'Closed',
        note: req.body.note || 'Complaint closed by resident',
        by: req.user.name,
      });
    }
    saveDb(db);
    return res.json(complaint);
  }

  // Admin updates
  const { status, adminResponse, internalNotes, assignedTo, note } = req.body;
  if (status && status !== complaint.status) {
    complaint.status = status;
    if (status === 'Resolved') {
      complaint.resolvedAt = new Date().toISOString();
    }
    complaint.history.push({
      timestamp: new Date().toISOString(),
      status,
      note: note || `Status updated to ${status}`,
      by: req.user?.name || 'Admin',
    });
  }

  if (adminResponse !== undefined) complaint.adminResponse = adminResponse;
  if (internalNotes !== undefined) complaint.internalNotes = internalNotes;
  if (assignedTo !== undefined) complaint.assignedTo = assignedTo;

  // Automatically create maintenance record if linked
  if (req.body.createMaintenanceRecord) {
    db.maintenance.push({
      id: `MNT-${Date.now().toString().slice(-4)}`,
      roomNumber: complaint.roomNumber,
      floor: complaint.floor,
      problem: complaint.title,
      reportedBy: complaint.residentName,
      date: new Date().toISOString().split('T')[0],
      priority: complaint.priority,
      assignedPerson: assignedTo || 'Hostel Maintenance Staff',
      estimatedCost: Number(req.body.estimatedCost) || 0,
      actualCost: 0,
      status: 'In Progress',
      notes: internalNotes || complaint.description,
      complaintId: complaint.id,
    });
  }

  saveDb(db);
  return res.json(complaint);
});

// ---------------- FOOD / MEALS ----------------
apiRouter.get('/meals', (req, res) => {
  const db = getDb();
  return res.json(db.meals);
});

apiRouter.post('/meals', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const newMeal: MealMenu = {
    id: `meal-${Date.now().toString().slice(-4)}`,
    ...req.body,
  };
  db.meals.push(newMeal);
  saveDb(db);
  return res.status(201).json(newMeal);
});

apiRouter.put('/meals/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const mealIndex = db.meals.findIndex((m) => m.id === req.params.id || m.date === req.params.id);
  if (mealIndex === -1) {
    return res.status(404).json({ error: 'Meal not found' });
  }

  db.meals[mealIndex] = {
    ...db.meals[mealIndex],
    ...req.body,
  };
  saveDb(db);
  return res.json(db.meals[mealIndex]);
});

// ---------------- NOTICES ----------------
apiRouter.get('/notices', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    const resident = db.residents.find((r) => r.id === req.user?.residentId);
    const floorTag = resident ? `floor-${resident.floor}` : '';
    const roomTag = resident ? `room-${resident.roomNumber}` : '';
    const resId = resident ? resident.id : '';

    const filtered = db.notices.filter(
      (n) =>
        n.targetAudience === 'all' ||
        n.targetAudience === floorTag ||
        n.targetAudience === roomTag ||
        n.targetAudience === resId
    );
    return res.json(filtered);
  }

  return res.json(db.notices);
});

apiRouter.post('/notices', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const newNotice: Notice = {
    id: `NOT-${Date.now().toString().slice(-4)}`,
    title: req.body.title,
    message: req.body.message,
    date: req.body.date || new Date().toISOString().split('T')[0],
    expiryDate: req.body.expiryDate,
    priority: req.body.priority || 'Normal',
    targetAudience: req.body.targetAudience || 'all',
    createdBy: req.user?.name || 'Owner',
  };

  db.notices.unshift(newNotice);
  saveDb(db);
  return res.status(201).json(newNotice);
});

apiRouter.delete('/notices/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.notices = db.notices.filter((n) => n.id !== req.params.id);
  saveDb(db);
  return res.json({ success: true });
});

// ---------------- CHAT MESSAGES ----------------
apiRouter.get('/messages', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user?.role === 'resident') {
    // Return all messages involving this resident
    const messages = db.messages.filter(
      (m) => m.senderId === req.user?.id || m.receiverId === req.user?.id || (m.receiverId === 'admin' && m.senderId === req.user?.id)
    );
    return res.json(messages);
  }

  // Admin gets all messages
  return res.json(db.messages);
});

apiRouter.post('/messages', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { message, receiverId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    senderId: req.user!.id,
    senderName: req.user!.name,
    senderRole: req.user!.role,
    receiverId: receiverId || (req.user!.role === 'resident' ? 'admin' : 'usr-admin'),
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };

  db.messages.push(newMsg);
  saveDb(db);
  return res.status(201).json(newMsg);
});

// ---------------- CLEANING MANAGEMENT ----------------
apiRouter.get('/cleaning', (req, res) => {
  const db = getDb();
  return res.json(db.cleaning);
});

apiRouter.post('/cleaning', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const record: CleaningRecord = {
    id: `CLN-${Date.now().toString().slice(-4)}`,
    floor: Number(req.body.floor),
    roomNumber: req.body.roomNumber,
    targetArea: req.body.targetArea || 'Attached Toilet & Bathroom',
    cleaningDate: req.body.cleaningDate || new Date().toISOString().split('T')[0],
    nextScheduledDate: req.body.nextScheduledDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    assignedStaff: req.body.assignedStaff || 'Housekeeping Staff',
    status: req.body.status || 'Scheduled',
    notes: req.body.notes || '',
  };
  db.cleaning.push(record);
  saveDb(db);
  return res.status(201).json(record);
});

apiRouter.put('/cleaning/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const index = db.cleaning.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Cleaning record not found' });
  }

  db.cleaning[index] = {
    ...db.cleaning[index],
    ...req.body,
  };
  saveDb(db);
  return res.json(db.cleaning[index]);
});

// ---------------- MAINTENANCE ----------------
apiRouter.get('/maintenance', (req, res) => {
  const db = getDb();
  return res.json(db.maintenance);
});

apiRouter.post('/maintenance', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const record: MaintenanceRecord = {
    id: `MNT-${Date.now().toString().slice(-4)}`,
    roomNumber: req.body.roomNumber,
    floor: Number(req.body.floor),
    problem: req.body.problem,
    reportedBy: req.body.reportedBy || req.user?.name || 'Staff',
    date: req.body.date || new Date().toISOString().split('T')[0],
    priority: req.body.priority || 'Medium',
    assignedPerson: req.body.assignedPerson || 'Maintenance Team',
    estimatedCost: Number(req.body.estimatedCost) || 0,
    actualCost: Number(req.body.actualCost) || 0,
    status: req.body.status || 'Pending',
    notes: req.body.notes || '',
  };
  db.maintenance.push(record);
  saveDb(db);
  return res.status(201).json(record);
});

apiRouter.put('/maintenance/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const index = db.maintenance.findIndex((m) => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Maintenance record not found' });
  }

  db.maintenance[index] = {
    ...db.maintenance[index],
    ...req.body,
    estimatedCost: req.body.estimatedCost !== undefined ? Number(req.body.estimatedCost) : db.maintenance[index].estimatedCost,
    actualCost: req.body.actualCost !== undefined ? Number(req.body.actualCost) : db.maintenance[index].actualCost,
  };
  saveDb(db);
  return res.json(db.maintenance[index]);
});

// ---------------- REPORTS ----------------
apiRouter.get('/reports', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const totalRooms = db.rooms.length;
  let totalBeds = 0;
  let occupiedBeds = 0;

  db.rooms.forEach((r) => {
    totalBeds += r.capacity;
    occupiedBeds += r.beds.filter((b) => b.isOccupied).length;
  });

  const availableBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const totalBilled = db.bills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalCollected = db.bills.reduce((acc, b) => acc + b.amountPaid, 0);
  const totalPending = db.bills.reduce((acc, b) => acc + b.remainingBalance, 0);
  const totalOverdue = db.bills.filter((b) => b.status === 'Overdue').reduce((acc, b) => acc + b.remainingBalance, 0);

  const cashCollected = db.payments.filter((p) => p.paymentMethod === 'Cash').reduce((acc, p) => acc + p.amount, 0);
  const onlineCollected = db.payments.filter((p) => p.paymentMethod !== 'Cash').reduce((acc, p) => acc + p.amount, 0);

  const totalComplaints = db.complaints.length;
  const resolvedComplaints = db.complaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;
  const openComplaints = totalComplaints - resolvedComplaints;

  const totalMaintenanceCost = db.maintenance.reduce((acc, m) => acc + m.actualCost, 0);
  const depositsHeld = db.deposits.filter((d) => d.status === 'Held').reduce((acc, d) => acc + d.amount, 0);
  const depositsRefunded = db.deposits.reduce((acc, d) => acc + (d.refundAmount || 0), 0);

  return res.json({
    occupancy: {
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
    },
    finance: {
      totalBilled,
      totalCollected,
      totalPending,
      totalOverdue,
      cashCollected,
      onlineCollected,
    },
    complaints: {
      totalComplaints,
      resolvedComplaints,
      openComplaints,
    },
    maintenance: {
      totalTasks: db.maintenance.length,
      totalCost: totalMaintenanceCost,
    },
    deposits: {
      depositsHeld,
      depositsRefunded,
    },
    checkInOuts: db.checkInOuts,
  });
});

// ---------------- QR CODE ATTENDANCE & FACILITY CHECK-IN ROUTES ----------------

// GET all QR sessions
apiRouter.get('/qr-sessions', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const sessions = db.qrSessions || [];
  const { type, activeOnly } = req.query;

  let filtered = [...sessions];
  if (type) {
    filtered = filtered.filter((s) => s.type === type);
  }
  if (activeOnly === 'true') {
    filtered = filtered.filter((s) => s.isActive);
  }

  // Calculate live scan counts for today
  const today = new Date().toISOString().split('T')[0];
  const checkIns = db.checkInRecords || [];

  const enriched = filtered.map((s) => {
    const todayScans = checkIns.filter((c) => c.qrSessionId === s.id && c.date === today).length;
    return {
      ...s,
      todayScans,
      totalScans: checkIns.filter((c) => c.qrSessionId === s.id).length,
    };
  });

  return res.json(enriched);
});

// GET single QR session
apiRouter.get('/qr-sessions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const session = (db.qrSessions || []).find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  const checkIns = (db.checkInRecords || []).filter((c) => c.qrSessionId === session.id);
  return res.json({
    ...session,
    totalScans: checkIns.length,
    recentScans: checkIns.slice(-10).reverse(),
  });
});

// CREATE new QR session (Admin only)
apiRouter.post('/qr-sessions', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const {
    title,
    type,
    facilityType,
    facilityName,
    location,
    date,
    sessionTime,
    validUntil,
    notes,
  } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type (attendance or facility) are required' });
  }

  const db = getDb();
  if (!db.qrSessions) db.qrSessions = [];

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const prefix = type === 'attendance' ? 'ATT' : 'FAC';
  const code = `${prefix}-${randomDigits}`;
  const token = `SEC-${prefix}-${Date.now()}-${randomDigits}`;

  const newSession: QRSession = {
    id: `QR-${prefix}-${Date.now()}`,
    title,
    type,
    facilityType: type === 'facility' ? facilityType || 'Other Facility' : undefined,
    facilityName: type === 'facility' ? facilityName || facilityType || 'Facility' : undefined,
    token,
    code,
    location: location || 'Main Gate / Reception',
    date: date || new Date().toISOString().split('T')[0],
    sessionTime: sessionTime || 'Standard Hours',
    validUntil: validUntil || undefined,
    isActive: true,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    totalScans: 0,
  };

  db.qrSessions.unshift(newSession);
  saveDb(db);

  return res.status(201).json(newSession);
});

// UPDATE QR session (Admin only)
apiRouter.put('/qr-sessions/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.qrSessions) db.qrSessions = [];

  const index = db.qrSessions.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  const existing = db.qrSessions[index];
  const {
    title,
    location,
    sessionTime,
    validUntil,
    isActive,
    notes,
    regenerateToken,
  } = req.body;

  let token = existing.token;
  let code = existing.code;
  if (regenerateToken) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const prefix = existing.type === 'attendance' ? 'ATT' : 'FAC';
    code = `${prefix}-${randomDigits}`;
    token = `SEC-${prefix}-${Date.now()}-${randomDigits}`;
  }

  const updated: QRSession = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    location: location !== undefined ? location : existing.location,
    sessionTime: sessionTime !== undefined ? sessionTime : existing.sessionTime,
    validUntil: validUntil !== undefined ? validUntil : existing.validUntil,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    notes: notes !== undefined ? notes : existing.notes,
    token,
    code,
  };

  db.qrSessions[index] = updated;
  saveDb(db);

  return res.json(updated);
});

// DELETE QR session (Admin only)
apiRouter.delete('/qr-sessions/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.qrSessions) db.qrSessions = [];

  const session = db.qrSessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'QR Session not found' });
  }

  db.qrSessions = db.qrSessions.filter((s) => s.id !== req.params.id);
  saveDb(db);

  return res.json({ message: 'QR Session removed successfully' });
});

// SCAN & PROCESS CHECK-IN (Resident or Admin)
apiRouter.post('/check-ins/scan', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { qrPayload, token, code, method = 'camera_scanner', notes } = req.body;
  const db = getDb();
  if (!db.checkInRecords) db.checkInRecords = [];
  if (!db.qrSessions) db.qrSessions = [];

  // Determine which resident is checking in
  let targetResidentId = req.user?.residentId;
  if (req.user?.role === 'admin' && req.body.residentId) {
    targetResidentId = req.body.residentId;
  }

  if (!targetResidentId) {
    // If admin is scanning without selecting a resident, pick first resident or request one
    if (req.user?.role === 'admin') {
      const firstRes = db.residents[0];
      targetResidentId = firstRes?.id;
    }
  }

  const resident = db.residents.find((r) => r.id === targetResidentId);
  if (!resident) {
    return res.status(400).json({
      error: 'Resident profile not found. Please ensure you are logged in as a registered resident.',
    });
  }

  // Parse token / code from scanned payload
  let searchToken = (token || '').trim();
  let searchCode = (code || '').trim().toUpperCase();

  if (qrPayload) {
    try {
      // Could be JSON string
      const parsed = JSON.parse(qrPayload);
      if (parsed.token) searchToken = parsed.token;
      if (parsed.code) searchCode = (parsed.code || '').toUpperCase();
    } catch {
      // Plain text or token string
      if (qrPayload.startsWith('SEC-')) {
        searchToken = qrPayload.trim();
      } else if (qrPayload.includes('code=')) {
        const match = qrPayload.match(/code=([A-Z0-9-]+)/i);
        if (match) searchCode = match[1].toUpperCase();
      } else {
        searchToken = qrPayload.trim();
        searchCode = qrPayload.trim().toUpperCase();
      }
    }
  }

  if (!searchToken && !searchCode) {
    return res.status(400).json({ error: 'No valid QR code or token provided.' });
  }

  // Find matching QR session
  const session = db.qrSessions.find((s) => {
    if (searchToken && s.token === searchToken) return true;
    if (searchCode && s.code.toUpperCase() === searchCode) return true;
    return false;
  });

  if (!session) {
    return res.status(404).json({
      error: 'Invalid or unrecognized QR Code. Please scan the current code displayed at the facility or gate.',
    });
  }

  if (!session.isActive) {
    return res.status(400).json({
      error: `This QR code session "${session.title}" is currently closed or inactive.`,
    });
  }

  // Check validUntil expiry if present
  if (session.validUntil && new Date(session.validUntil).getTime() < Date.now()) {
    return res.status(400).json({
      error: `This QR code expired on ${new Date(session.validUntil).toLocaleTimeString()}. Please ask management for the refreshed code.`,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Check for duplicate check-in today for this session
  const existingToday = db.checkInRecords.find(
    (c) =>
      c.residentId === resident.id &&
      c.qrSessionId === session.id &&
      c.date === todayStr
  );

  if (existingToday) {
    return res.status(200).json({
      alreadyCheckedIn: true,
      message: `You are already checked in for "${session.title}" today!`,
      record: existingToday,
      session,
    });
  }

  // Record new check-in
  const newRecord: CheckInRecord = {
    id: `CHK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    qrSessionId: session.id,
    sessionTitle: session.title,
    type: session.type,
    facilityName: session.facilityName,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    floor: resident.floor,
    bedNumber: resident.bedNumber,
    timestamp: new Date().toISOString(),
    date: todayStr,
    status: session.type === 'attendance' ? 'Present' : 'Verified',
    method: method || 'camera_scanner',
    notes: notes || `Scanned at ${session.location}`,
  };

  db.checkInRecords.unshift(newRecord);
  session.totalScans = (session.totalScans || 0) + 1;
  saveDb(db);

  return res.status(201).json({
    success: true,
    message: `${session.type === 'attendance' ? 'Daily Attendance Marked: Present!' : 'Facility Access Verified!'}`,
    record: newRecord,
    session,
  });
});

// GET check-in records & live log
apiRouter.get('/check-ins', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  let records = db.checkInRecords || [];
  const { date, type, residentId, sessionId, limit = '100' } = req.query;

  // If resident user, limit to their own records unless admin
  if (req.user?.role === 'resident' && req.user.residentId) {
    records = records.filter((r) => r.residentId === req.user!.residentId);
  } else if (residentId) {
    records = records.filter((r) => r.residentId === residentId);
  }

  if (date) {
    records = records.filter((r) => r.date === date);
  }
  if (type) {
    records = records.filter((r) => r.type === type);
  }
  if (sessionId) {
    records = records.filter((r) => r.qrSessionId === sessionId);
  }

  const max = parseInt(limit as string, 10) || 100;
  const sliced = records.slice(0, max);

  // Compute summary stats
  const today = new Date().toISOString().split('T')[0];
  const allRecords = db.checkInRecords || [];
  const todayRecords = allRecords.filter((r) => r.date === today);
  const attendanceToday = todayRecords.filter((r) => r.type === 'attendance');
  const uniqueResidentsToday = new Set(attendanceToday.map((r) => r.residentId)).size;
  const facilityToday = todayRecords.filter((r) => r.type === 'facility');

  const facilityCounts: Record<string, number> = {};
  facilityToday.forEach((f) => {
    const key = f.facilityName || 'Other';
    facilityCounts[key] = (facilityCounts[key] || 0) + 1;
  });

  return res.json({
    records: sliced,
    stats: {
      totalToday: todayRecords.length,
      attendanceTodayCount: attendanceToday.length,
      uniqueResidentsPresentToday: uniqueResidentsToday,
      totalResidents: db.residents.length,
      attendanceRate: db.residents.length
        ? Math.round((uniqueResidentsToday / db.residents.length) * 100)
        : 0,
      facilityScansToday: facilityToday.length,
      facilityBreakdown: facilityCounts,
    },
  });
});

// MANUAL CHECK-IN OVERRIDE (Admin only)
apiRouter.post('/check-ins/manual', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const { residentId, qrSessionId, status = 'Present', notes } = req.body;
  const db = getDb();
  if (!db.checkInRecords) db.checkInRecords = [];

  const resident = db.residents.find((r) => r.id === residentId);
  if (!resident) {
    return res.status(400).json({ error: 'Resident not found' });
  }

  const session = (db.qrSessions || []).find((s) => s.id === qrSessionId) || {
    id: 'QR-MANUAL',
    title: 'Manual Admin Attendance Log',
    type: 'attendance' as const,
    location: 'Hostel Office',
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const newRecord: CheckInRecord = {
    id: `CHK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    qrSessionId: session.id,
    sessionTitle: session.title,
    type: session.type,
    facilityName: (session as any).facilityName,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    floor: resident.floor,
    bedNumber: resident.bedNumber,
    timestamp: new Date().toISOString(),
    date: todayStr,
    status: (status as any) || 'Present',
    method: 'admin_override',
    notes: notes || 'Manually logged by Hostel Administrator',
  };

  db.checkInRecords.unshift(newRecord);
  saveDb(db);

  return res.status(201).json(newRecord);
});

// DELETE check-in record (Admin only)
apiRouter.delete('/check-ins/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.checkInRecords) db.checkInRecords = [];

  const record = db.checkInRecords.find((r) => r.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Check-in record not found' });
  }

  db.checkInRecords = db.checkInRecords.filter((r) => r.id !== req.params.id);
  saveDb(db);

  return res.json({ message: 'Check-in record removed' });
});

// ============================================================================
// ACTIVITY LOG AUDIT TRAIL HELPER
// ============================================================================
function logActivity(
  db: ReturnType<typeof getDb>,
  actor: { id: string; name: string; role: string },
  action: string,
  module: ActivityLogItem['module'],
  affectedRecord: { type: string; id: string; name?: string },
  details: string,
  previousValue?: any,
  newValue?: any
): ActivityLogItem {
  if (!db.activityLogs) db.activityLogs = [];
  const logItem: ActivityLogItem = {
    id: `ACT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    performedBy: actor,
    action,
    module,
    affectedRecord,
    details,
    previousValue,
    newValue,
  };
  db.activityLogs.unshift(logItem);
  if (db.activityLogs.length > 500) {
    db.activityLogs = db.activityLogs.slice(0, 500);
  }
  return logItem;
}

// ============================================================================
// 1. TERMS & CONDITIONS
// ============================================================================
apiRouter.get('/terms/current', (req, res) => {
  const db = getDb();
  return res.json(db.termsConfig);
});

apiRouter.get('/terms/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.termsAcceptances) db.termsAcceptances = [];

  const termsConfig = db.termsConfig!;
  const currentVersion = termsConfig.version;
  const userId = req.user?.id || '';
  const userAcceptance = db.termsAcceptances.find(
    (t) => t.userId === userId && (t.version === currentVersion || t.termsVersion === currentVersion)
  );

  return res.json({
    version: currentVersion,
    title: termsConfig.title,
    termsContent: termsConfig.rules.map((r, i) => `${i + 1}. ${r}`).join('\n\n'),
    termsConfig,
    accepted: !!userAcceptance,
    acceptedAt: userAcceptance?.acceptedAt,
    acceptedDate: userAcceptance?.acceptedDate,
    acceptedTime: userAcceptance?.acceptedTime,
    acceptanceRecord: userAcceptance,
  });
});

apiRouter.post('/terms/accept', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.termsAcceptances) db.termsAcceptances = [];

  const termsConfig = db.termsConfig!;
  const targetVersion = req.body.version || termsConfig.version;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const existing = db.termsAcceptances.find(
    (t) => t.userId === user.id && (t.version === targetVersion || t.termsVersion === targetVersion)
  );

  const now = new Date();
  const acceptedDate = now.toISOString().split('T')[0];
  const acceptedTime = now.toLocaleTimeString('en-IN', { hour12: true });

  if (existing) {
    return res.json({
      success: true,
      message: 'Terms already accepted.',
      acceptanceRecord: existing,
    });
  }

  const acceptance: TermsAcceptanceRecord = {
    id: `TRM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: user.id,
    username: user.username,
    residentId: user.residentId,
    userName: user.name,
    userRole: user.role,
    version: targetVersion,
    termsVersion: targetVersion,
    acceptedAt: now.toISOString(),
    acceptedDate,
    acceptedTime,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    deviceBrowser: req.body.deviceBrowser || (req.headers['user-agent'] as string) || 'Browser Client',
  };

  db.termsAcceptances.push(acceptance);

  // Update user record
  const dbUser = db.users.find((u) => u.id === user.id);
  if (dbUser) {
    dbUser.termsAcceptedVersion = targetVersion;
    dbUser.termsAcceptedAt = now.toISOString();
  }

  logActivity(
    db,
    { id: user.id, name: user.name, role: user.role },
    'TERMS_ACCEPTED',
    'Terms & Conditions',
    { type: 'TermsAcceptance', id: acceptance.id, name: user.name },
    `User ${user.name} (${user.role}) accepted Terms & Conditions version ${targetVersion}`
  );

  saveDb(db);

  return res.status(201).json({
    success: true,
    message: 'Terms and conditions accepted successfully.',
    acceptanceRecord: acceptance,
  });
});

apiRouter.get('/terms/records', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.termsAcceptances) db.termsAcceptances = [];

  const records = [...db.termsAcceptances].sort(
    (a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
  );

  return res.json({
    currentVersion: db.termsConfig?.version || 'v2.0-2026',
    totalAcceptances: records.length,
    records,
  });
});

apiRouter.post('/terms/publish', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const { version, rules, holidays, holidayNotice } = req.body;

  if (!version || typeof version !== 'string' || !version.trim()) {
    return res.status(400).json({ error: 'A valid version string is required (e.g., v2.1-2026).' });
  }

  if (rules && (!Array.isArray(rules) || rules.length !== 23)) {
    return res.status(400).json({ error: 'All 23 official rules must be preserved. Cannot add or remove rules.' });
  }

  const now = new Date().toISOString();
  db.termsConfig = {
    version: version.trim(),
    title: 'Official Hostel Terms & Conditions',
    rules: Array.isArray(rules) && rules.length === 23 ? rules : db.termsConfig?.rules || OFFICIAL_TERMS_RULES,
    holidays: Array.isArray(holidays) ? holidays : db.termsConfig?.holidays || OFFICIAL_HOSTEL_HOLIDAYS,
    holidayNotice: holidayNotice || 'During these holidays, the mess will remain closed and no food will be provided by the hostel.',
    updatedAt: now,
    updatedBy: `${req.user?.name || 'Owner'} (Owner)`,
  };

  logActivity(
    db,
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'TERMS_PUBLISHED',
    'Terms & Conditions',
    { type: 'TermsConfig', id: version.trim(), name: `Version ${version.trim()}` },
    `Owner ${req.user!.name} published Terms & Conditions version ${version.trim()}`
  );

  saveDb(db);

  return res.json({
    success: true,
    message: `Terms & Conditions version ${version.trim()} published successfully. All residents will be prompted to review and accept.`,
    termsConfig: db.termsConfig,
  });
});

// ============================================================================
// 2. VISITOR MANAGEMENT
// ============================================================================
apiRouter.get('/visitors', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const { status, search, date } = req.query;
  let list = [...db.visitors];

  // Residents only see their own visitor requests
  if (req.user?.role === 'resident') {
    list = list.filter((v) => v.residentId === req.user?.residentId);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter((v) => v.status.toLowerCase() === status.toLowerCase());
  }

  if (date && typeof date === 'string') {
    list = list.filter((v) => v.visitDate === date);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (v) =>
        v.visitorFullName.toLowerCase().includes(q) ||
        v.visitorMobile.includes(q) ||
        v.residentName.toLowerCase().includes(q) ||
        v.roomNumber.toLowerCase().includes(q) ||
        v.purposeOfVisit.toLowerCase().includes(q)
    );
  }

  // Sort newest visit date or created date first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(list);
});

apiRouter.post('/visitors', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const resident = req.user?.residentId
    ? db.residents.find((r) => r.id === req.user?.residentId)
    : null;

  if (!resident && req.user?.role === 'resident') {
    return res.status(400).json({ error: 'Resident profile not found' });
  }

  const {
    visitorFullName,
    visitorMobile,
    visitorRelationship,
    visitorGender,
    visitorAddress,
    visitorIdType,
    visitorIdNumber,
    visitDate,
    expectedArrivalTime,
    expectedDepartureTime,
    purposeOfVisit,
    visitorPhotoUrl,
    additionalNotes,
  } = req.body;

  if (!visitorFullName || !visitorMobile || !visitorRelationship || !visitDate || !purposeOfVisit) {
    return res.status(400).json({ error: 'Please fill all required visitor details' });
  }

  const assignedResident = resident || {
    id: req.body.residentId || 'RES-DEMO',
    fullName: req.body.residentName || req.user?.name || 'Resident',
    roomNumber: req.body.roomNumber || '101',
    floor: req.body.floor || 1,
    bedNumber: req.body.bedNumber || 'A',
  };

  const newVisitor: VisitorRequest = {
    id: `VIS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    residentId: assignedResident.id,
    residentName: assignedResident.fullName,
    roomNumber: assignedResident.roomNumber,
    floor: assignedResident.floor,
    bedNumber: assignedResident.bedNumber,
    visitorFullName: visitorFullName.trim(),
    visitorMobile: visitorMobile.trim(),
    visitorRelationship: visitorRelationship.trim(),
    visitorGender: visitorGender || 'Other',
    visitorAddress: (visitorAddress || '').trim(),
    visitorIdType: visitorIdType || 'Aadhaar Card',
    visitorIdNumber: (visitorIdNumber || '').trim(),
    visitDate,
    expectedArrivalTime: expectedArrivalTime || '10:00 AM',
    expectedDepartureTime: expectedDepartureTime || '06:00 PM',
    purposeOfVisit: purposeOfVisit.trim(),
    visitorPhotoUrl: visitorPhotoUrl || undefined,
    additionalNotes: additionalNotes ? additionalNotes.trim() : undefined,
    status: 'Waiting for Approval',
    createdAt: new Date().toISOString(),
  };

  db.visitors.unshift(newVisitor);

  logActivity(
    db,
    { id: req.user?.id || 'sys', name: req.user?.name || 'Resident', role: req.user?.role || 'resident' },
    'VISITOR_REQUEST_CREATED',
    'Visitor Management',
    { type: 'VisitorRequest', id: newVisitor.id, name: newVisitor.visitorFullName },
    `Visitor request created for ${newVisitor.visitorFullName} by resident ${assignedResident.fullName} (Room ${assignedResident.roomNumber})`
  );

  saveDb(db);

  return res.status(201).json(newVisitor);
});

// Approve visitor request (Admin only)
apiRouter.patch('/visitors/:id/approve', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const visitor = db.visitors.find((v) => v.id === req.params.id);
  if (!visitor) {
    return res.status(404).json({ error: 'Visitor request not found' });
  }

  const prevStatus = visitor.status;
  visitor.status = 'Approved';
  visitor.reviewedBy = req.user?.name || 'Hostel Owner';
  visitor.reviewedAt = new Date().toISOString();
  delete visitor.rejectionReason;

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'VISITOR_REQUEST_APPROVED',
    'Visitor Management',
    { type: 'VisitorRequest', id: visitor.id, name: visitor.visitorFullName },
    `Approved visitor request for ${visitor.visitorFullName} visiting ${visitor.residentName}`,
    prevStatus,
    'Approved'
  );

  saveDb(db);
  return res.json(visitor);
});

// Reject visitor request (Admin only)
apiRouter.patch('/visitors/:id/reject', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const visitor = db.visitors.find((v) => v.id === req.params.id);
  if (!visitor) {
    return res.status(404).json({ error: 'Visitor request not found' });
  }

  const { rejectionReason } = req.body;
  const prevStatus = visitor.status;
  visitor.status = 'Rejected';
  visitor.rejectionReason = rejectionReason || 'Denied by Hostel Management';
  visitor.reviewedBy = req.user?.name || 'Hostel Owner';
  visitor.reviewedAt = new Date().toISOString();

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'VISITOR_REQUEST_REJECTED',
    'Visitor Management',
    { type: 'VisitorRequest', id: visitor.id, name: visitor.visitorFullName },
    `Rejected visitor ${visitor.visitorFullName}. Reason: ${visitor.rejectionReason}`,
    prevStatus,
    'Rejected'
  );

  saveDb(db);
  return res.json(visitor);
});

// Mark visitor Checked In
apiRouter.patch('/visitors/:id/check-in', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const visitor = db.visitors.find((v) => v.id === req.params.id);
  if (!visitor) {
    return res.status(404).json({ error: 'Visitor request not found' });
  }

  if (visitor.status !== 'Approved') {
    return res.status(400).json({ error: 'Only approved visitors can be checked in.' });
  }

  visitor.status = 'Checked In';
  visitor.actualCheckInTime = new Date().toISOString();
  visitor.checkedInBy = req.user?.name || 'Reception Staff';

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'VISITOR_CHECKED_IN',
    'Visitor Management',
    { type: 'VisitorRequest', id: visitor.id, name: visitor.visitorFullName },
    `Visitor ${visitor.visitorFullName} checked in at hostel reception by ${visitor.checkedInBy}`
  );

  saveDb(db);
  return res.json(visitor);
});

// Mark visitor Checked Out
apiRouter.patch('/visitors/:id/check-out', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.visitors) db.visitors = [];

  const visitor = db.visitors.find((v) => v.id === req.params.id);
  if (!visitor) {
    return res.status(404).json({ error: 'Visitor request not found' });
  }

  if (visitor.status !== 'Checked In') {
    return res.status(400).json({ error: 'Visitor is not currently checked in.' });
  }

  const outTime = new Date();
  visitor.status = 'Checked Out';
  visitor.actualCheckOutTime = outTime.toISOString();
  visitor.checkedOutBy = req.user?.name || 'Reception Staff';

  if (visitor.actualCheckInTime) {
    const diffMs = outTime.getTime() - new Date(visitor.actualCheckInTime).getTime();
    visitor.durationStayMinutes = Math.max(1, Math.round(diffMs / 60000));
  }

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'VISITOR_CHECKED_OUT',
    'Visitor Management',
    { type: 'VisitorRequest', id: visitor.id, name: visitor.visitorFullName },
    `Visitor ${visitor.visitorFullName} checked out. Stay duration: ${visitor.durationStayMinutes || 0} minutes.`
  );

  saveDb(db);
  return res.json(visitor);
});

// ============================================================================
// 3. RESIDENT IN / OUT PRESENCE SYSTEM & SESSIONS
// ============================================================================
apiRouter.get('/presence/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.residentPresence) db.residentPresence = [];

  const queryResidentId = req.query.residentId as string | undefined;
  const targetResidentId = req.user?.role === 'resident'
    ? req.user.residentId
    : (queryResidentId || req.user?.residentId);

  if (!targetResidentId) {
    return res.status(400).json({ error: 'Resident ID required' });
  }

  const resident = db.residents.find((r) => r.id === targetResidentId);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  let presence = db.residentPresence.find((p) => p.residentId === targetResidentId);
  if (!presence) {
    presence = {
      residentId: resident.id,
      residentName: resident.fullName,
      roomNumber: resident.roomNumber,
      floor: resident.floor,
      bedNumber: resident.bedNumber,
      status: 'IN',
      since: resident.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.residentPresence.push(presence);
    saveDb(db);
  }

  const diffMs = Date.now() - new Date(presence.since).getTime();
  const currentDurationMinutes = Math.max(0, Math.floor(diffMs / 60000));

  return res.json({
    ...presence,
    currentDurationMinutes,
  });
});

apiRouter.post('/presence/action', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.residentPresence) db.residentPresence = [];
  if (!db.presenceSessions) db.presenceSessions = [];

  const { action, notes, targetResidentId } = req.body;
  const nextStatus: PresenceStatus = action === 'OUT' ? 'OUT' : 'IN';

  const residentId = req.user?.role === 'resident'
    ? req.user.residentId
    : (targetResidentId || req.user?.residentId);

  if (!residentId) {
    return res.status(400).json({ error: 'Resident ID is required' });
  }

  const resident = db.residents.find((r) => r.id === residentId);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  let presence = db.residentPresence.find((p) => p.residentId === residentId);
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.split('T')[0];

  const prevStatus = presence ? presence.status : 'IN';

  // If previous session is active, close it
  if (presence?.currentSessionId) {
    const prevSession = db.presenceSessions.find((s) => s.id === presence.currentSessionId);
    if (prevSession) {
      if (prevStatus === 'IN' && nextStatus === 'OUT') {
        prevSession.exitTime = nowIso;
        if (prevSession.entryTime) {
          prevSession.durationInsideMinutes = Math.max(
            1,
            Math.round((now.getTime() - new Date(prevSession.entryTime).getTime()) / 60000)
          );
        }
      } else if (prevStatus === 'OUT' && nextStatus === 'IN') {
        prevSession.entryTime = nowIso;
        if (prevSession.exitTime) {
          prevSession.durationOutsideMinutes = Math.max(
            1,
            Math.round((now.getTime() - new Date(prevSession.exitTime).getTime()) / 60000)
          );
        }
      }
    }
  }

  // Requirement 9: EVERY IN and OUT action creates a NEW attendance/presence session!
  const newSession: PresenceSession = {
    id: `SES-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    floor: resident.floor,
    bedNumber: resident.bedNumber,
    date: todayStr,
    entryTime: nextStatus === 'IN' ? nowIso : undefined,
    exitTime: nextStatus === 'OUT' ? nowIso : undefined,
    notes: notes || (nextStatus === 'IN' ? 'Checked IN to hostel' : 'Left hostel premises'),
    actionBy: req.user?.name || resident.fullName,
    status: nextStatus,
    createdAt: nowIso,
  };

  db.presenceSessions.unshift(newSession);

  // Update presence state
  if (!presence) {
    presence = {
      residentId: resident.id,
      residentName: resident.fullName,
      roomNumber: resident.roomNumber,
      floor: resident.floor,
      bedNumber: resident.bedNumber,
      status: nextStatus,
      since: nowIso,
      lastActionTime: nowIso,
      currentSessionId: newSession.id,
      updatedAt: nowIso,
    };
    db.residentPresence.push(presence);
  } else {
    presence.status = nextStatus;
    presence.since = nowIso;
    presence.lastActionTime = nowIso;
    presence.currentSessionId = newSession.id;
    presence.updatedAt = nowIso;
  }

  logActivity(
    db,
    { id: req.user?.id || resident.id, name: req.user?.name || resident.fullName, role: req.user?.role || 'resident' },
    nextStatus === 'IN' ? 'RESIDENT_MARKED_IN' : 'RESIDENT_MARKED_OUT',
    'Attendance & Presence',
    { type: 'PresenceSession', id: newSession.id, name: resident.fullName },
    `Resident ${resident.fullName} (Room ${resident.roomNumber}) marked ${nextStatus} at ${now.toLocaleTimeString()}`,
    prevStatus,
    nextStatus
  );

  saveDb(db);

  return res.json({
    success: true,
    message: `Marked as ${nextStatus} successfully!`,
    presence: {
      ...presence,
      currentDurationMinutes: 0,
    },
    session: newSession,
  });
});

apiRouter.get('/presence/all', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.residentPresence) db.residentPresence = [];

  const activeResidents = db.residents.filter((r) => r.status === 'Active' || r.status === 'Notice period');
  const now = Date.now();

  const results = activeResidents.map((r) => {
    let p = db.residentPresence.find((item) => item.residentId === r.id);
    if (!p) {
      p = {
        residentId: r.id,
        residentName: r.fullName,
        roomNumber: r.roomNumber,
        floor: r.floor,
        bedNumber: r.bedNumber,
        status: 'IN',
        since: r.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.residentPresence.push(p);
    }
    const diffMs = now - new Date(p.since).getTime();
    const currentDurationMinutes = Math.max(0, Math.floor(diffMs / 60000));

    return {
      residentId: r.id,
      residentName: r.fullName,
      phone: r.mobile,
      roomNumber: r.roomNumber,
      floor: r.floor,
      bedNumber: r.bedNumber,
      status: p.status,
      since: p.since,
      lastActionTime: p.lastActionTime || p.since,
      currentDurationMinutes,
      currentSessionId: p.currentSessionId,
    };
  });

  return res.json(results);
});

apiRouter.get('/presence/history', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.presenceSessions) db.presenceSessions = [];

  const { residentId, date } = req.query;
  let sessions = [...db.presenceSessions];

  if (req.user?.role === 'resident') {
    sessions = sessions.filter((s) => s.residentId === req.user?.residentId);
  } else if (residentId && typeof residentId === 'string') {
    sessions = sessions.filter((s) => s.residentId === residentId);
  }

  if (date && typeof date === 'string') {
    sessions = sessions.filter((s) => s.date === date);
  }

  sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(sessions);
});

// ============================================================================
// 4. MONTHLY RENT PAYMENT CONFIRMATION & APPROVAL WORKFLOW
// ============================================================================
apiRouter.get('/rent-confirmations', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.rentConfirmations) db.rentConfirmations = [];

  let list = [...db.rentConfirmations];
  if (req.user?.role === 'resident') {
    list = list.filter((rc) => rc.residentId === req.user?.residentId);
  }

  const { status } = req.query;
  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter((rc) => rc.status === status);
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(list);
});

apiRouter.post('/rent-confirmations', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.rentConfirmations) db.rentConfirmations = [];

  const { billId, amount, paymentMethod, transactionReference, paymentProofUrl, notes } = req.body;

  const resident = req.user?.residentId
    ? db.residents.find((r) => r.id === req.user?.residentId)
    : null;

  if (!resident && req.user?.role === 'resident') {
    return res.status(400).json({ error: 'Resident profile not found' });
  }

  const bill = db.bills.find((b) => b.id === billId);
  if (!bill) {
    return res.status(404).json({ error: 'Bill/invoice not found.' });
  }

  const assignedResident = resident || {
    id: bill.residentId,
    fullName: bill.residentName,
    roomNumber: bill.roomNumber,
    floor: bill.floor,
    bedNumber: 'A',
  };

  const parsedAmount = Number(amount) || bill.remainingBalance || bill.totalAmount;

  // Requirement 13: "Do NOT mark a bill as PAID merely because resident clicked checkbox.
  // It becomes PAID only after Owner approval."
  const confirmation: RentPaymentConfirmation = {
    id: `CONF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    billId: bill.id,
    residentId: assignedResident.id,
    residentName: assignedResident.fullName,
    roomNumber: assignedResident.roomNumber,
    billingMonth: bill.billingMonth,
    amount: parsedAmount,
    paymentMethod: paymentMethod || 'UPI',
    transactionReference: transactionReference || undefined,
    paymentProofUrl: paymentProofUrl || undefined,
    notes: notes || undefined,
    status: 'Payment Confirmation Pending',
    isLocked: false,
    createdAt: new Date().toISOString(),
  };

  db.rentConfirmations.unshift(confirmation);

  // Tag the bill with status 'Payment Confirmation Pending'
  (bill as any).confirmationPending = true;

  logActivity(
    db,
    { id: req.user?.id || 'res', name: req.user?.name || assignedResident.fullName, role: 'resident' },
    'RENT_CONFIRMATION_SUBMITTED',
    'Rent & Payments',
    { type: 'RentPaymentConfirmation', id: confirmation.id, name: bill.billingMonth },
    `Resident ${assignedResident.fullName} submitted payment confirmation for ${bill.billingMonth} of ₹${parsedAmount}. Awaiting owner approval.`
  );

  saveDb(db);

  return res.status(201).json(confirmation);
});

// OWNER APPROVE / REJECT PAYMENT CONFIRMATION
apiRouter.patch('/rent-confirmations/:id/verify', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.rentConfirmations) db.rentConfirmations = [];
  if (!db.payments) db.payments = [];

  const conf = db.rentConfirmations.find((c) => c.id === req.params.id);
  if (!conf) {
    return res.status(404).json({ error: 'Payment confirmation not found' });
  }

  if (conf.isLocked && conf.status === 'Paid') {
    return res.status(400).json({
      error: 'This payment record is IMMUTABLE and locked. Any corrections must use the Payment Correction workflow.',
    });
  }

  const { action, rejectionReason } = req.body;
  const nowIso = new Date().toISOString();

  if (action === 'approve') {
    // 1. Mark confirmation as Paid & LOCKED
    conf.status = 'Paid';
    conf.isLocked = true;
    conf.reviewedBy = req.user?.name || 'Hostel Owner';
    conf.reviewedAt = nowIso;
    delete conf.rejectionReason;

    // 2. Create actual immutable Payment record
    const paymentRecord: Payment = {
      id: `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      billId: conf.billId,
      residentId: conf.residentId,
      residentName: conf.residentName,
      roomNumber: conf.roomNumber,
      floor: conf.floor || 1,
      amount: conf.amount || conf.monthlyRent || 0,
      paymentDate: nowIso.split('T')[0],
      paymentMethod: conf.paymentMethod,
      transactionReference: conf.transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      transactionId: conf.transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      receivedBy: req.user?.name || 'Hostel Owner',
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      notes: `Verified by Owner from Confirmation ${conf.id}`,
      createdAt: nowIso,
    };
    db.payments.unshift(paymentRecord);
    conf.approvedPaymentId = paymentRecord.id;

    // 3. Mark the Bill as Paid
    const bill = db.bills.find((b) => b.id === conf.billId);
    if (bill) {
      bill.amountPaid = (bill.amountPaid || 0) + conf.amount;
      bill.remainingBalance = Math.max(0, bill.totalAmount - bill.amountPaid);
      if (bill.remainingBalance === 0) {
        bill.status = 'Paid';
      }
      delete (bill as any).confirmationPending;
    }

    logActivity(
      db,
      { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
      'RENT_PAYMENT_VERIFIED_LOCKED',
      'Rent & Payments',
      { type: 'Payment', id: paymentRecord.id, name: conf.billingMonth },
      `Hostel Owner verified and locked payment of ₹${conf.amount} for ${conf.residentName} (${conf.billingMonth}). Receipt #${paymentRecord.receiptNumber}`
    );

    saveDb(db);
    return res.json({ success: true, message: 'Payment verified, bill updated, and record locked.', confirmation: conf, payment: paymentRecord });
  } else if (action === 'reject') {
    conf.status = 'Rejected';
    conf.rejectionReason = rejectionReason || 'Payment could not be verified by owner';
    conf.reviewedBy = req.user?.name || 'Hostel Owner';
    conf.reviewedAt = nowIso;

    const bill = db.bills.find((b) => b.id === conf.billId);
    if (bill) {
      delete (bill as any).confirmationPending;
    }

    logActivity(
      db,
      { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
      'RENT_PAYMENT_CONFIRMATION_REJECTED',
      'Rent & Payments',
      { type: 'RentPaymentConfirmation', id: conf.id, name: conf.billingMonth },
      `Hostel Owner rejected payment confirmation for ${conf.residentName}. Reason: ${conf.rejectionReason}`
    );

    saveDb(db);
    return res.json({ success: true, message: 'Payment confirmation rejected.', confirmation: conf });
  } else {
    return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'." });
  }
});

// SEPARATE PAYMENT CORRECTION / ADJUSTMENT WORKFLOW (Requirement 15)
apiRouter.post('/payments/correction', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.paymentCorrections) db.paymentCorrections = [];

  const { paymentId, newAmount, reason, adjustmentType } = req.body;

  if (!paymentId || newAmount === undefined || !reason) {
    return res.status(400).json({ error: 'Payment ID, new amount, and reason are required' });
  }

  const originalPayment = db.payments.find((p) => p.id === paymentId);
  if (!originalPayment) {
    return res.status(404).json({ error: 'Original payment record not found' });
  }

  const correctionRecord: PaymentCorrectionRecord = {
    id: `CORR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    originalPaymentId: originalPayment.id,
    billId: originalPayment.billId,
    residentId: originalPayment.residentId,
    residentName: originalPayment.residentName,
    originalAmount: originalPayment.amount,
    correctedAmount: Number(newAmount),
    reason: String(reason).trim(),
    adjustedBy: req.user?.name || 'Hostel Owner',
    adjustedAt: new Date().toISOString(),
    adjustmentType: adjustmentType || 'Administrative Correction',
  };

  db.paymentCorrections.unshift(correctionRecord);

  // Update bill balance difference
  const diff = Number(newAmount) - originalPayment.amount;
  const bill = db.bills.find((b) => b.id === originalPayment.billId);
  if (bill) {
    bill.amountPaid += diff;
    bill.remainingBalance = Math.max(0, bill.totalAmount - bill.amountPaid);
    bill.status = bill.remainingBalance === 0 ? 'Paid' : 'Pending';
  }

  // Notice: originalPayment remains preserved in history as required by immutability law!
  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'PAYMENT_CORRECTION_APPLIED',
    'Rent & Payments',
    { type: 'PaymentCorrection', id: correctionRecord.id, name: originalPayment.receiptNumber },
    `Payment adjustment applied for ${originalPayment.residentName}. Original: ₹${originalPayment.amount} -> Adjusted: ₹${newAmount}. Reason: ${reason}`
  );

  saveDb(db);

  return res.status(201).json({
    success: true,
    message: 'Correction registered in audit log. Original payment remains preserved.',
    correction: correctionRecord,
  });
});

// ============================================================================
// 5. INVENTORY MANAGEMENT
// ============================================================================
apiRouter.get('/inventory', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.inventory) db.inventory = [];

  const { search, category, roomNumber } = req.query;
  let items = [...db.inventory];

  if (category && typeof category === 'string' && category !== 'all') {
    items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }

  if (roomNumber && typeof roomNumber === 'string') {
    items = items.filter((i) => i.roomNumber === roomNumber);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    items = items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.roomNumber && i.roomNumber.toLowerCase().includes(q))
    );
  }

  return res.json(items);
});

apiRouter.post('/inventory', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.inventory) db.inventory = [];

  const {
    itemName,
    category,
    totalQuantity,
    availableQuantity,
    assignedQuantity,
    damagedQuantity,
    lostQuantity,
    unitCost,
    condition,
    roomNumber,
    floor,
    notes,
  } = req.body;

  if (!itemName || !category || totalQuantity === undefined) {
    return res.status(400).json({ error: 'Item name, category, and total quantity are required.' });
  }

  const tot = Number(totalQuantity);
  const avail = availableQuantity !== undefined ? Number(availableQuantity) : tot;
  const asgn = assignedQuantity !== undefined ? Number(assignedQuantity) : 0;
  const dmg = damagedQuantity !== undefined ? Number(damagedQuantity) : 0;
  const lost = lostQuantity !== undefined ? Number(lostQuantity) : 0;

  const newItem: InventoryItem = {
    id: `INV-ITM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    itemCode: `ITM-${category.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    itemName: itemName.trim(),
    category,
    totalQuantity: tot,
    availableQuantity: avail,
    assignedQuantity: asgn,
    damagedQuantity: dmg,
    lostQuantity: lost,
    unitCost: Number(unitCost) || 0,
    condition: condition || 'Good',
    roomNumber: roomNumber || undefined,
    floor: floor !== undefined ? Number(floor) : undefined,
    notes: notes ? notes.trim() : undefined,
    lastInspectedAt: new Date().toISOString(),
  };

  db.inventory.push(newItem);

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'INVENTORY_ITEM_CREATED',
    'Inventory Management',
    { type: 'InventoryItem', id: newItem.id, name: newItem.itemName },
    `Added inventory item: ${newItem.itemName} (Qty: ${newItem.totalQuantity})`
  );

  saveDb(db);
  return res.status(201).json(newItem);
});

apiRouter.put('/inventory/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.inventory) db.inventory = [];

  const item = db.inventory.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  Object.assign(item, req.body, { id: item.id });

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'INVENTORY_ITEM_UPDATED',
    'Inventory Management',
    { type: 'InventoryItem', id: item.id, name: item.itemName },
    `Updated inventory item: ${item.itemName}`
  );

  saveDb(db);
  return res.json(item);
});

apiRouter.delete('/inventory/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.inventory) db.inventory = [];

  const item = db.inventory.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  db.inventory = db.inventory.filter((i) => i.id !== req.params.id);

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'INVENTORY_ITEM_DELETED',
    'Inventory Management',
    { type: 'InventoryItem', id: item.id, name: item.itemName },
    `Deleted inventory item: ${item.itemName}`
  );

  saveDb(db);
  return res.json({ message: 'Item deleted' });
});

apiRouter.post('/inventory/:id/action', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.inventory) db.inventory = [];
  if (!db.inventoryLogs) db.inventoryLogs = [];

  const item = db.inventory.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  const { action, quantity = 1, roomNumber, floor, residentId, notes } = req.body;
  const qty = Math.max(1, Number(quantity));

  let actionDesc = '';

  if (action === 'assign_room') {
    if (item.availableQuantity < qty) {
      return res.status(400).json({ error: `Not enough available quantity. Only ${item.availableQuantity} available.` });
    }
    item.availableQuantity -= qty;
    item.assignedQuantity += qty;
    actionDesc = `Assigned ${qty}x ${item.itemName} to Room ${roomNumber || item.roomNumber || 'General'}`;
  } else if (action === 'unassign_room') {
    if (item.assignedQuantity < qty) {
      return res.status(400).json({ error: `Cannot unassign more than assigned quantity (${item.assignedQuantity}).` });
    }
    item.assignedQuantity -= qty;
    item.availableQuantity += qty;
    actionDesc = `Unassigned ${qty}x ${item.itemName} back to storage`;
  } else if (action === 'mark_damaged') {
    if (item.availableQuantity >= qty) {
      item.availableQuantity -= qty;
    } else if (item.assignedQuantity >= qty) {
      item.assignedQuantity -= qty;
    }
    item.damagedQuantity += qty;
    actionDesc = `Marked ${qty}x ${item.itemName} as Damaged`;
  } else if (action === 'mark_lost') {
    if (item.availableQuantity >= qty) {
      item.availableQuantity -= qty;
    } else if (item.assignedQuantity >= qty) {
      item.assignedQuantity -= qty;
    }
    item.lostQuantity += qty;
    actionDesc = `Marked ${qty}x ${item.itemName} as Lost`;
  } else if (action === 'mark_restored') {
    if (item.damagedQuantity >= qty) {
      item.damagedQuantity -= qty;
      item.availableQuantity += qty;
      actionDesc = `Restored ${qty}x ${item.itemName} from repair back to available`;
    }
  }

  const log: InventoryLog = {
    id: `ILOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    inventoryItemId: item.id,
    itemName: item.itemName,
    action: action as any,
    quantity: qty,
    roomNumber: roomNumber || item.roomNumber,
    floor: floor || item.floor,
    residentId,
    performedBy: req.user?.name || 'Hostel Owner',
    timestamp: new Date().toISOString(),
    notes,
  };

  db.inventoryLogs.unshift(log);

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'INVENTORY_ACTION',
    'Inventory Management',
    { type: 'InventoryItem', id: item.id, name: item.itemName },
    actionDesc
  );

  saveDb(db);
  return res.json({ success: true, item, log });
});

apiRouter.get('/inventory/logs', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  return res.json(db.inventoryLogs || []);
});

// ============================================================================
// 6. DAMAGE AND LOSS TRACKING & RECOVERY
// ============================================================================
apiRouter.get('/damage', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.damageRecords) db.damageRecords = [];

  let list = [...db.damageRecords];
  if (req.user?.role === 'resident') {
    list = list.filter((d) => d.residentId === req.user?.residentId);
  }

  const { status, roomNumber } = req.query;
  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter((d) => d.status === status);
  }
  if (roomNumber && typeof roomNumber === 'string') {
    list = list.filter((d) => d.roomNumber === roomNumber);
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(list);
});

apiRouter.post('/damage', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.damageRecords) db.damageRecords = [];

  const {
    inventoryItemId,
    itemName,
    residentId,
    residentName,
    roomNumber,
    floor,
    damageType,
    description,
    photoUrl,
    estimatedCost,
  } = req.body;

  if (!itemName || !damageType || !description) {
    return res.status(400).json({ error: 'Item name, damage type, and description are required' });
  }

  const targetResident = residentId ? db.residents.find((r) => r.id === residentId) : null;

  const newDamage: DamageRecord = {
    id: `DMG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    inventoryItemId: inventoryItemId || undefined,
    itemName: itemName.trim(),
    residentId: targetResident?.id || residentId || (req.user?.role === 'resident' ? req.user.residentId : undefined),
    residentName: targetResident?.fullName || residentName || (req.user?.role === 'resident' ? req.user.name : undefined),
    roomNumber: targetResident?.roomNumber || roomNumber || '101',
    floor: targetResident?.floor || floor || 1,
    damageType,
    description: description.trim(),
    photoUrl: photoUrl || undefined,
    reportedBy: req.user?.name || 'Staff',
    reportedAt: new Date().toISOString(),
    estimatedCost: Number(estimatedCost) || 0,
    status: 'Reported',
    createdAt: new Date().toISOString(),
  };

  db.damageRecords.unshift(newDamage);

  logActivity(
    db,
    { id: req.user?.id || 'usr', name: req.user?.name || 'User', role: req.user?.role || 'admin' },
    'DAMAGE_REPORTED',
    'Inventory Management',
    { type: 'DamageRecord', id: newDamage.id, name: newDamage.itemName },
    `Reported damage to ${newDamage.itemName} in Room ${newDamage.roomNumber}: ${newDamage.description}`
  );

  saveDb(db);
  return res.status(201).json(newDamage);
});

apiRouter.put('/damage/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.damageRecords) db.damageRecords = [];

  const damage = db.damageRecords.find((d) => d.id === req.params.id);
  if (!damage) {
    return res.status(404).json({ error: 'Damage record not found' });
  }

  const { status, finalCost, notes } = req.body;
  const prevStatus = damage.status;
  if (status) damage.status = status;
  if (finalCost !== undefined) damage.finalCost = Number(finalCost);
  if (notes) damage.recoveryNotes = notes;

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'DAMAGE_STATUS_UPDATED',
    'Inventory Management',
    { type: 'DamageRecord', id: damage.id, name: damage.itemName },
    `Updated damage status for ${damage.itemName} to ${damage.status}`,
    prevStatus,
    damage.status
  );

  saveDb(db);
  return res.json(damage);
});

// Explicit Owner action to approve recovery charge from resident
apiRouter.post('/damage/:id/approve-recovery', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.damageRecords) db.damageRecords = [];

  const damage = db.damageRecords.find((d) => d.id === req.params.id);
  if (!damage) {
    return res.status(404).json({ error: 'Damage record not found' });
  }

  const { chargeAmount, notes } = req.body;
  const amount = Number(chargeAmount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid recovery charge amount required' });
  }

  damage.recoveryApproved = true;
  damage.chargeToResidentAmount = amount;
  damage.recoveryNotes = notes || damage.recoveryNotes;
  damage.status = 'Confirmed';

  // Add bill line / other charges to resident's current pending bill if one exists
  if (damage.residentId) {
    const pendingBill = db.bills.find(
      (b) => b.residentId === damage.residentId && (b.status === 'Pending' || b.status === 'Overdue')
    );
    if (pendingBill) {
      pendingBill.otherCharges = (pendingBill.otherCharges || 0) + amount;
      pendingBill.totalAmount += amount;
      pendingBill.remainingBalance += amount;
    }
  }

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'DAMAGE_RECOVERY_APPROVED',
    'Inventory Management',
    { type: 'DamageRecord', id: damage.id, name: damage.itemName },
    `Approved damage recovery of ₹${amount} from resident ${damage.residentName || 'N/A'}`
  );

  saveDb(db);
  return res.json({ success: true, message: 'Damage recovery charge approved.', damage });
});

// ============================================================================
// 7. EMERGENCY / SOS ALERT SYSTEM
// ============================================================================
apiRouter.post('/emergency/sos', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.emergencyAlerts) db.emergencyAlerts = [];
  if (!db.notices) db.notices = [];

  const resident = req.user?.residentId
    ? db.residents.find((r) => r.id === req.user?.residentId)
    : null;

  const { emergencyType, description } = req.body;

  const assignedResident = resident || {
    id: req.user?.id || 'RES-SOS',
    fullName: req.user?.name || 'Resident',
    roomNumber: '101',
    floor: 1,
    mobile: '+91 98765 43210',
  };

  const alert: EmergencyAlertRecord = {
    id: `EMG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    residentId: assignedResident.id,
    residentName: assignedResident.fullName,
    roomNumber: assignedResident.roomNumber,
    floor: assignedResident.floor,
    bedNumber: (assignedResident as any).bedNumber || 'Bed 1',
    mobile: assignedResident.mobile,
    emergencyType: emergencyType || 'Medical',
    description: description || 'Resident pressed emergency SOS button for urgent assistance.',
    timestamp: new Date().toISOString(),
    status: 'Active',
  };

  db.emergencyAlerts.unshift(alert);

  // Auto-broadcast urgent notice so owner and staff see alert right away
  const urgentNotice: Notice = {
    id: `NOT-SOS-${Date.now()}`,
    title: `🚨 EMERGENCY SOS: Room ${assignedResident.roomNumber} (${assignedResident.fullName})`,
    content: `EMERGENCY ALERT: ${assignedResident.fullName} in Room ${assignedResident.roomNumber} (Floor ${assignedResident.floor}) triggered an SOS alert: "${alert.description || alert.message}". Contact: ${assignedResident.mobile}. Immediate assistance required!`,
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    isEmergency: true,
    targetAudience: 'All Residents',
  };
  db.notices.unshift(urgentNotice);

  logActivity(
    db,
    { id: assignedResident.id, name: assignedResident.fullName, role: 'resident' },
    'EMERGENCY_SOS_TRIGGERED',
    'Safety & Security',
    { type: 'EmergencyAlert', id: alert.id, name: alert.emergencyType },
    `🚨 EMERGENCY SOS triggered by ${assignedResident.fullName} in Room ${assignedResident.roomNumber} (Type: ${alert.emergencyType})`
  );

  saveDb(db);

  return res.status(201).json({
    success: true,
    message: 'Emergency SOS alert dispatched to hostel warden, security, and owner immediately.',
    alert,
    emergencyContacts: {
      hostelSecurity: '+91 98765 00001',
      wardenDirect: '+91 98765 00002',
      medicalAmbulance: '108',
      policeEmergency: '112',
    },
  });
});

apiRouter.get('/emergency/alerts', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  return res.json(db.emergencyAlerts || []);
});

apiRouter.patch('/emergency/alerts/:id/resolve', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.emergencyAlerts) db.emergencyAlerts = [];

  const alert = db.emergencyAlerts.find((a) => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Emergency alert not found' });
  }

  alert.status = 'Resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = req.user?.name || 'Hostel Owner';

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'EMERGENCY_ALERT_RESOLVED',
    'Safety & Security',
    { type: 'EmergencyAlert', id: alert.id, name: alert.emergencyType },
    `Resolved emergency SOS from Room ${alert.roomNumber}`
  );

  saveDb(db);
  return res.json(alert);
});

// ============================================================================
// 8. ROOM CHANGE HISTORY & MOVE RESIDENT
// ============================================================================
apiRouter.get('/room-changes', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  return res.json(db.roomChanges || []);
});

apiRouter.post('/residents/:id/move-room', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.roomChanges) db.roomChanges = [];

  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  const { newRoomNumber, newBedNumber, reason } = req.body;
  if (!newRoomNumber || !newBedNumber) {
    return res.status(400).json({ error: 'New room number and bed number are required' });
  }

  const targetRoom = db.rooms.find((r) => r.roomNumber === String(newRoomNumber));
  if (!targetRoom) {
    return res.status(404).json({ error: `Destination Room ${newRoomNumber} does not exist.` });
  }

  const targetBed = targetRoom.beds.find((b) => b.bedNumber === String(newBedNumber));
  if (!targetBed) {
    return res.status(404).json({ error: `Bed ${newBedNumber} does not exist in Room ${newRoomNumber}.` });
  }

  if (targetBed.isOccupied && targetBed.residentId !== resident.id) {
    return res.status(400).json({ error: `Bed ${newBedNumber} in Room ${newRoomNumber} is already occupied.` });
  }

  const oldRoomNumber = resident.roomNumber;
  const oldFloor = resident.floor;
  const oldBedNumber = resident.bedNumber;
  const oldRoomType = resident.roomType;

  // Free old bed
  const oldRoom = db.rooms.find((r) => r.roomNumber === oldRoomNumber);
  if (oldRoom) {
    const oldBed = oldRoom.beds.find((b) => b.bedNumber === oldBedNumber);
    if (oldBed) {
      oldBed.isOccupied = false;
      delete oldBed.residentId;
      delete oldBed.residentName;
    }
    const occ = oldRoom.beds.filter((b) => b.isOccupied).length;
    oldRoom.status = occ === 0 ? 'Available' : occ === oldRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';
  }

  // Occupy new bed
  targetBed.isOccupied = true;
  targetBed.residentId = resident.id;
  targetBed.residentName = resident.fullName;
  const newOcc = targetRoom.beds.filter((b) => b.isOccupied).length;
  targetRoom.status = newOcc === targetRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';

  // Update resident
  resident.roomNumber = targetRoom.roomNumber;
  resident.floor = targetRoom.floor;
  resident.bedNumber = targetBed.bedNumber;
  resident.roomType = targetRoom.type;

  // Update presence room info
  const presence = (db.residentPresence || []).find((p) => p.residentId === resident.id);
  if (presence) {
    presence.roomNumber = resident.roomNumber;
    presence.floor = resident.floor;
    presence.bedNumber = resident.bedNumber;
  }

  // Record room change in history
  const changeRecord: RoomChangeRecord = {
    id: `RCH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    residentId: resident.id,
    residentName: resident.fullName,
    previousRoomNumber: oldRoomNumber,
    previousFloor: oldFloor,
    previousBedNumber: oldBedNumber,
    previousRoomType: oldRoomType,
    newRoomNumber: targetRoom.roomNumber,
    newFloor: targetRoom.floor,
    newBedNumber: targetBed.bedNumber,
    newRoomType: targetRoom.type,
    changeDate: new Date().toISOString(),
    reason: reason || 'Administrative re-allocation',
    approvedBy: req.user?.name || 'Hostel Owner',
  };

  db.roomChanges.unshift(changeRecord);

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'RESIDENT_MOVED_ROOM',
    'Room Management',
    { type: 'RoomChangeRecord', id: changeRecord.id, name: resident.fullName },
    `Moved resident ${resident.fullName} from Room ${oldRoomNumber} (Bed ${oldBedNumber}) to Room ${targetRoom.roomNumber} (Bed ${targetBed.bedNumber})`
  );

  saveDb(db);

  return res.json({
    success: true,
    message: `Resident ${resident.fullName} relocated to Room ${targetRoom.roomNumber} successfully.`,
    resident,
    changeRecord,
  });
});

// ============================================================================
// 9. ACTIVITY LOG / AUDIT TRAIL API
// ============================================================================
apiRouter.get('/activity-logs', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.activityLogs) db.activityLogs = [];

  const { search, module, limit } = req.query;
  let list = [...db.activityLogs];

  if (module && typeof module === 'string' && module !== 'all') {
    list = list.filter((a) => a.module === module);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q) ||
        a.performedBy.name.toLowerCase().includes(q) ||
        (a.affectedRecord.name && a.affectedRecord.name.toLowerCase().includes(q))
    );
  }

  const maxItems = Number(limit) || 100;
  return res.json(list.slice(0, maxItems));
});

// ============================================================================
// 10. AUTOMATIC VACANCY CALCULATION (Requirement 24)
// ============================================================================
apiRouter.get('/vacancy-stats', authMiddleware, (req: AuthenticatedRequest, res) => {
  const db = getDb();

  let totalCapacity = 0;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let fullyOccupiedRooms = 0;
  let partiallyOccupiedRooms = 0;
  let completelyVacantRooms = 0;

  let singleRoomsTotal = 0;
  let singleRoomsOccupied = 0;
  let doubleRoomsTotal = 0;
  let doubleRoomsOccupied = 0;

  db.rooms.forEach((room) => {
    totalCapacity += room.capacity;
    totalBeds += room.capacity;
    const occupiedInRoom = room.beds.filter((b) => b.isOccupied).length;
    occupiedBeds += occupiedInRoom;

    if (occupiedInRoom === room.capacity && room.capacity > 0) {
      fullyOccupiedRooms += 1;
    } else if (occupiedInRoom > 0 && occupiedInRoom < room.capacity) {
      partiallyOccupiedRooms += 1;
    } else {
      completelyVacantRooms += 1;
    }

    if (room.type === 'single') {
      singleRoomsTotal += 1;
      if (occupiedInRoom > 0) singleRoomsOccupied += 1;
    }
    if (room.type === 'double') {
      doubleRoomsTotal += 1;
      if (occupiedInRoom > 0) doubleRoomsOccupied += 1;
    }
  });

  const availableBeds = totalBeds - occupiedBeds;

  const stats: AutomaticVacancyStats = {
    totalRooms: db.rooms.length,
    totalCapacity,
    totalBeds,
    occupiedBeds,
    availableBeds,
    fullyOccupiedRooms,
    partiallyOccupiedRooms,
    completelyVacantRooms,
    singleRoomsTotal,
    singleRoomsOccupied,
    doubleRoomsTotal,
    doubleRoomsOccupied,
  };

  return res.json(stats);
});

// ============================================================================
// 11. RESIDENT CHECKOUT SETTLEMENT WORKFLOW
// ============================================================================
apiRouter.get('/residents/:id/settlement-preview', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  // Calculate unpaid bills
  const unpaidBills = db.bills.filter(
    (b) => b.residentId === resident.id && (b.status === 'Pending' || b.status === 'Overdue')
  );
  const outstandingRent = unpaidBills.reduce((acc, b) => acc + b.remainingBalance, 0);

  // Calculate approved damage recoveries
  const damageRecords = (db.damageRecords || []).filter(
    (d) => d.residentId === resident.id && d.recoveryApproved && d.chargeToResidentAmount
  );
  const approvedCharges = damageRecords.reduce((acc, d) => acc + (d.chargeToResidentAmount || 0), 0);

  // Security deposit held
  const deposit = db.deposits.find((d) => d.residentId === resident.id && d.status === 'Held');
  const securityDepositHeld = deposit ? deposit.amount : 0;

  // Existing deductions
  const deductions: { reason: string; amount: number }[] = [];

  const totalDeductions = deductions.reduce((acc, d) => acc + d.amount, 0);
  const refundableSecurityDeposit = Math.max(0, securityDepositHeld - totalDeductions);

  // Final settlement calculation:
  // (Outstanding Rent + Approved Charges) - Refundable Security Deposit
  const finalAmount = (outstandingRent + approvedCharges) - refundableSecurityDeposit;

  let settlementType: CheckoutSettlementRecord['settlementType'] = 'Zero Balance Settled';
  if (finalAmount > 0) {
    settlementType = 'Resident Must Pay';
  } else if (finalAmount < 0) {
    settlementType = 'Hostel Must Refund';
  }

  return res.json({
    resident,
    outstandingRent,
    approvedCharges,
    securityDepositHeld,
    totalDeductions,
    refundableSecurityDeposit,
    finalAmount: Math.abs(finalAmount),
    signedFinalAmount: finalAmount,
    settlementType,
    unpaidBills,
    damageRecords,
  });
});

apiRouter.post('/residents/:id/checkout-settlement', authMiddleware, adminOnly, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db.checkoutSettlements) db.checkoutSettlements = [];
  if (!db.checkInOuts) db.checkInOuts = [];

  const resident = db.residents.find((r) => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }

  const { deductions = [], notes } = req.body;

  // Outstanding rent
  const unpaidBills = db.bills.filter(
    (b) => b.residentId === resident.id && (b.status === 'Pending' || b.status === 'Overdue')
  );
  const outstandingRent = unpaidBills.reduce((acc, b) => acc + b.remainingBalance, 0);

  // Approved damage charges
  const damageRecords = (db.damageRecords || []).filter(
    (d) => d.residentId === resident.id && (d.recoveryApproved || d.recoveryChargeApproved) && (d.chargeToResidentAmount || d.recoveryAmount)
  );
  const approvedCharges = damageRecords.reduce((acc, d) => acc + (d.chargeToResidentAmount || d.recoveryAmount || 0), 0);

  // Security deposit held
  const deposit = (db.deposits as any[] || []).find((d) => d.residentId === resident.id);
  const securityDepositHeld = deposit ? deposit.amount : (resident.securityDeposit || 0);

  const validDeductions: SettlementDeductionItem[] = Array.isArray(deductions)
    ? deductions.map((d: any, idx: number) => ({
        id: d.id || `DED-${idx + 1}`,
        reason: String(d.reason || 'Deduction item').trim(),
        amount: Math.max(0, Number(d.amount) || 0),
        approvedBy: req.user?.name || 'Owner',
      }))
    : [];

  const totalDeductions = validDeductions.reduce((acc, d) => acc + d.amount, 0);
  const refundableSecurityDeposit = Math.max(0, securityDepositHeld - totalDeductions);

  const rawFinal = (outstandingRent + approvedCharges) - refundableSecurityDeposit;
  let settlementType: CheckoutSettlementRecord['settlementType'] = 'Zero Balance Settled';
  if (rawFinal > 0) {
    settlementType = 'Resident Must Pay';
  } else if (rawFinal < 0) {
    settlementType = 'Hostel Must Refund';
  }

  const nowIso = new Date().toISOString();

  // Create checkout settlement record
  const settlementRecord: CheckoutSettlementRecord = {
    id: `SETTLE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    floor: resident.floor,
    bedNumber: resident.bedNumber,
    checkoutDate: nowIso,
    outstandingRent,
    approvedCharges,
    otherDues: 0,
    securityDepositHeld,
    deductions: validDeductions,
    totalDeductions,
    refundableSecurityDeposit,
    finalAmount: Math.abs(rawFinal),
    settlementType,
    status: 'Completed & Locked',
    settledBy: req.user?.name || 'Hostel Owner',
    settledAt: nowIso,
    notes: notes ? String(notes).trim() : undefined,
  };

  db.checkoutSettlements.unshift(settlementRecord);

  // Update resident status to Vacated
  resident.status = 'Vacated';
  resident.checkoutDate = nowIso.split('T')[0];

  // Free the bed in room
  const room = db.rooms.find((r) => r.roomNumber === resident.roomNumber);
  if (room) {
    const bed = room.beds.find((b) => b.bedNumber === resident.bedNumber);
    if (bed) {
      bed.isOccupied = false;
      delete bed.residentId;
      delete bed.residentName;
    }
    const occ = room.beds.filter((b) => b.isOccupied).length;
    room.status = occ === 0 ? 'Available' : occ === room.capacity ? 'Fully Occupied' : 'Partially Occupied';
  }

  // Update deposit record
  if (deposit) {
    deposit.status = refundableSecurityDeposit > 0 ? 'Refunded' : 'Partially Refunded';
    deposit.refundableAmount = refundableSecurityDeposit;
    deposit.deductionAmount = totalDeductions;
    deposit.finalSettlementStatus = refundableSecurityDeposit > 0 ? 'Fully Refunded' : 'Settled with Deductions';
    deposit.refundDate = nowIso.split('T')[0];
  }

  // Mark all resident bills as Settled/Cleared
  unpaidBills.forEach((b) => {
    b.status = 'Paid';
    b.remainingBalance = 0;
  });

  // Check-in/out record
  db.checkInOuts.unshift({
    id: `CIO-${Date.now()}`,
    residentId: resident.id,
    residentName: resident.fullName,
    roomNumber: resident.roomNumber,
    type: 'check-out',
    date: nowIso.split('T')[0],
    timestamp: nowIso,
    notes: `Final checkout settlement completed. Result: ${settlementType} ₹${Math.abs(rawFinal)}`,
  });

  logActivity(
    db,
    { id: req.user?.id || 'admin', name: req.user?.name || 'Hostel Owner', role: 'admin' },
    'RESIDENT_CHECKOUT_SETTLED',
    'Resident Management',
    { type: 'CheckoutSettlement', id: settlementRecord.id, name: resident.fullName },
    `Completed checkout settlement for ${resident.fullName} (Room ${resident.roomNumber}). Final Result: ${settlementType} ₹${Math.abs(rawFinal)}`
  );

  saveDb(db);

  return res.status(201).json({
    success: true,
    message: `Checkout settlement completed for ${resident.fullName}. Room & Bed are now freed.`,
    settlement: settlementRecord,
  });
});


