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
  HostelSettings,
  DashboardStats,
  SecurityDepositRecord,
  QRSession,
  CheckInRecord,
  ResidentRegistration,
  TermsConfig,
  TermsAcceptanceRecord,
} from '../types';

const TOKEN_KEY = 'hms_auth_token';
const USER_KEY = 'hms_auth_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token: string, user: User, resident?: Resident | null): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ user, resident }));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): { user: User; resident?: Resident | null } | null {
  const item = localStorage.getItem(USER_KEY);
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (identifier: string, password: string, role?: 'admin' | 'resident') =>
    request<{
      token: string;
      user: User;
      resident?: Resident | null;
      pendingApproval?: boolean;
      rejected?: boolean;
      status?: string;
      message?: string;
      rejectionReason?: string;
      registration?: any;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, username: identifier, password, role }),
    }),

  forgotPassword: (identifier: string, role?: 'admin' | 'resident') =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, role }),
    }),

  activateAccount: (data: { identifier: string; roomNumber: string; newPassword: string }) =>
    request<{ success: boolean; message: string; username?: string }>('/api/auth/activate-account', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: () =>
    request<{ user: User; resident?: Resident | null }>('/api/auth/me'),

  // Settings
  getSettings: () => request<HostelSettings>('/api/settings'),
  updateSettings: (data: Partial<HostelSettings> & { rentChangeNote?: string }) =>
    request<HostelSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard stats
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Rooms
  getRooms: () => request<Room[]>('/api/rooms'),
  createRoom: (data: Partial<Room>) =>
    request<Room>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoom: (id: string, data: Partial<Room>) =>
    request<Room>(`/api/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRoom: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/rooms/${id}`, {
      method: 'DELETE',
    }),

  // Residents
  getResidents: (params?: { status?: string; floor?: number; roomNumber?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.floor) query.append('floor', String(params.floor));
    if (params?.roomNumber) query.append('roomNumber', params.roomNumber);
    if (params?.search) query.append('search', params.search);
    return request<Resident[]>(`/api/residents?${query.toString()}`);
  },
  getResidentById: (id: string) => request<Resident>(`/api/residents/${id}`),
  createResident: (data: any) =>
    request<{ resident: Resident; loginCredentials: { username: string; password: string } }>('/api/residents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResident: (id: string, data: Partial<Resident>) =>
    request<Resident>(`/api/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  checkoutResident: (id: string, data: { checkoutDate?: string; deductionAmount?: number; deductionReason?: string; remarks?: string }) =>
    request<{ success: boolean; message: string; record: CheckInOutRecord }>(`/api/residents/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  changeResidentRoom: (id: string, data: { newRoomNumber: string; newBedNumber: string; updateRent?: boolean }) =>
    request<{ success: boolean; resident: Resident }>(`/api/residents/${id}/change-room`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Bills & Payments
  getBills: (params?: { residentId?: string; month?: string; status?: string; roomNumber?: string; floor?: number }) => {
    const query = new URLSearchParams();
    if (params?.residentId) query.append('residentId', params.residentId);
    if (params?.month) query.append('month', params.month);
    if (params?.status) query.append('status', params.status);
    if (params?.roomNumber) query.append('roomNumber', params.roomNumber);
    if (params?.floor) query.append('floor', String(params.floor));
    return request<Bill[]>(`/api/bills?${query.toString()}`);
  },
  generateMonthlyBills: (billingMonth: string, dueDate?: string) =>
    request<{ success: boolean; count: number; bills: Bill[] }>('/api/bills/generate-monthly', {
      method: 'POST',
      body: JSON.stringify({ billingMonth, dueDate }),
    }),
  createBill: (data: Partial<Bill>) =>
    request<Bill>('/api/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayments: (params?: { residentId?: string; month?: string; method?: string; roomNumber?: string; floor?: number }) => {
    const query = new URLSearchParams();
    if (params?.residentId) query.append('residentId', params.residentId);
    if (params?.month) query.append('month', params.month);
    if (params?.method) query.append('method', params.method);
    if (params?.roomNumber) query.append('roomNumber', params.roomNumber);
    if (params?.floor) query.append('floor', String(params.floor));
    return request<Payment[]>(`/api/payments?${query.toString()}`);
  },
  recordPayment: (data: { billId: string; amount: number; paymentMethod: string; transactionReference?: string; notes?: string; paymentDate?: string }) =>
    request<{ payment: Payment; bill: Bill }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Security deposits
  getDeposits: () => request<SecurityDepositRecord[]>('/api/deposits'),

  // Complaints
  getComplaints: () => request<Complaint[]>('/api/complaints'),
  submitComplaint: (data: Partial<Complaint>) =>
    request<Complaint>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createComplaint: (data: Partial<Complaint>) =>
    request<Complaint>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateComplaint: (id: string, data: Partial<Complaint> & { createMaintenanceRecord?: boolean; estimatedCost?: number; note?: string }) =>
    request<Complaint>(`/api/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Meals
  getMeals: () => request<MealMenu[]>('/api/meals'),
  updateMeal: (id: string, data: Partial<MealMenu>) =>
    request<MealMenu>(`/api/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  createMeal: (data: Partial<MealMenu>) =>
    request<MealMenu>('/api/meals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Notices
  getNotices: () => request<Notice[]>('/api/notices'),
  createNotice: (data: Partial<Notice>) =>
    request<Notice>('/api/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteNotice: (id: string) =>
    request<{ success: boolean }>(`/api/notices/${id}`, {
      method: 'DELETE',
    }),

  // Messages
  getMessages: () => request<ChatMessage[]>('/api/messages'),
  sendMessage: (data: { message: string; receiverId?: string }) =>
    request<ChatMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cleaning
  getCleaningRecords: () => request<CleaningRecord[]>('/api/cleaning'),
  createCleaningRecord: (data: Partial<CleaningRecord>) =>
    request<CleaningRecord>('/api/cleaning', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCleaningRecord: (id: string, data: Partial<CleaningRecord>) =>
    request<CleaningRecord>(`/api/cleaning/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Maintenance
  getMaintenanceRecords: () => request<MaintenanceRecord[]>('/api/maintenance'),
  createMaintenanceRecord: (data: Partial<MaintenanceRecord>) =>
    request<MaintenanceRecord>('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMaintenanceRecord: (id: string, data: Partial<MaintenanceRecord>) =>
    request<MaintenanceRecord>(`/api/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Reports
  getReports: () => request<any>('/api/reports'),

  // QR Code Sessions & Check-In System
  getQRSessions: (params?: { type?: string; activeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.activeOnly) query.set('activeOnly', 'true');
    const qs = query.toString();
    return request<(QRSession & { todayScans?: number; totalScans?: number })[]>(
      `/api/qr-sessions${qs ? `?${qs}` : ''}`
    );
  },

  getQRSession: (id: string) =>
    request<QRSession & { totalScans: number; recentScans: CheckInRecord[] }>(`/api/qr-sessions/${id}`),

  createQRSession: (data: {
    title: string;
    type: 'attendance' | 'facility';
    facilityType?: string;
    facilityName?: string;
    location?: string;
    date?: string;
    sessionTime?: string;
    validUntil?: string;
    notes?: string;
  }) =>
    request<QRSession>('/api/qr-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQRSession: (id: string, data: Partial<QRSession> & { regenerateToken?: boolean }) =>
    request<QRSession>(`/api/qr-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQRSession: (id: string) =>
    request<{ message: string }>(`/api/qr-sessions/${id}`, {
      method: 'DELETE',
    }),

  scanCheckIn: (data: {
    qrPayload?: string;
    token?: string;
    code?: string;
    method?: 'camera_scanner' | 'image_upload' | 'manual_code' | 'admin_override';
    notes?: string;
    residentId?: string;
  }) =>
    request<{
      success?: boolean;
      alreadyCheckedIn?: boolean;
      message: string;
      record: CheckInRecord;
      session: QRSession;
    }>('/api/check-ins/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCheckIns: (params?: {
    date?: string;
    type?: string;
    residentId?: string;
    sessionId?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.type) query.set('type', params.type);
    if (params?.residentId) query.set('residentId', params.residentId);
    if (params?.sessionId) query.set('sessionId', params.sessionId);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{
      records: CheckInRecord[];
      stats: {
        totalToday: number;
        attendanceTodayCount: number;
        uniqueResidentsPresentToday: number;
        totalResidents: number;
        attendanceRate: number;
        facilityScansToday: number;
        facilityBreakdown: Record<string, number>;
      };
    }>(`/api/check-ins${qs ? `?${qs}` : ''}`);
  },

  manualCheckIn: (data: {
    residentId: string;
    qrSessionId?: string;
    status?: string;
    notes?: string;
  }) =>
    request<CheckInRecord>('/api/check-ins/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCheckIn: (id: string) =>
    request<{ message: string }>(`/api/check-ins/${id}`, {
      method: 'DELETE',
    }),

  // Resident Registration & Verification
  sendRegistrationOtp: (email: string) =>
    request<{ success: boolean; message: string; cooldownSeconds: number; expiresInMinutes: number }>(
      '/api/auth/send-registration-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),

  verifyRegistrationOtp: (email: string, otp: string) =>
    request<{ success: boolean; verified: boolean; message: string }>('/api/auth/verify-registration-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  registerResident: (data: any) =>
    request<{
      success: boolean;
      status: string;
      message: string;
      registration: Partial<ResidentRegistration>;
    }>('/api/auth/register-resident', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resubmitRegistration: (data: any) =>
    request<{
      success: boolean;
      status: string;
      message: string;
      registration: ResidentRegistration;
    }>('/api/auth/resubmit-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendForgotPasswordOtp: (email: string) =>
    request<{ success: boolean; message: string; cooldownSeconds: number }>(
      '/api/auth/forgot-password/send-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),

  resetPasswordWithOtp: (data: { email: string; otp: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin Registrations Management
  getRegistrations: () =>
    request<{
      registrations: ResidentRegistration[];
      counts: { pending: number; approved: number; rejected: number; total: number };
    }>('/api/admin/registrations'),

  getRegistrationById: (id: string) =>
    request<ResidentRegistration>(`/api/admin/registrations/${id}`),

  approveRegistration: (
    id: string,
    data: {
      roomNumber?: string;
      bedNumber?: string;
      monthlyRent?: number;
      securityDeposit?: number;
    }
  ) =>
    request<{ success: boolean; message: string; resident: Resident; registration: ResidentRegistration }>(
      `/api/admin/registrations/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  rejectRegistration: (id: string, rejectionReason: string) =>
    request<{ success: boolean; message: string; registration: ResidentRegistration }>(
      `/api/admin/registrations/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      }
    ),

  // --- Terms & Conditions ---
  getTermsCurrent: () =>
    request<TermsConfig>('/api/terms/current'),

  getTermsStatus: () =>
    request<{
      version: string;
      title: string;
      termsContent: string;
      termsConfig?: TermsConfig;
      accepted: boolean;
      acceptedAt?: string;
      acceptedDate?: string;
      acceptedTime?: string;
      acceptanceRecord?: TermsAcceptanceRecord;
    }>('/api/terms/status'),

  acceptTerms: (data?: { version?: string; deviceBrowser?: string }) =>
    request<{ success: boolean; message: string; acceptanceRecord: TermsAcceptanceRecord }>('/api/terms/accept', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getTermsRecords: () =>
    request<{
      currentVersion: string;
      totalAcceptances: number;
      records: TermsAcceptanceRecord[];
    }>('/api/terms/records'),

  publishTerms: (data: {
    version: string;
    rules?: string[];
    holidays?: string[];
    holidayNotice?: string;
  }) =>
    request<{ success: boolean; message: string; termsConfig: TermsConfig }>('/api/terms/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // --- Visitor Management ---
  getVisitorRequests: (params?: { residentId?: string; status?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.residentId) q.append('residentId', params.residentId);
    if (params?.status) q.append('status', params.status);
    if (params?.date) q.append('date', params.date);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/api/visitors${qs}`);
  },

  createVisitorRequest: (data: any) =>
    request<{ success: boolean; message: string; visitor: any }>('/api/visitors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewVisitorRequest: (id: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    request<{ success: boolean; message: string; visitor: any }>(`/api/visitors/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejectionReason }),
    }),

  checkInVisitor: (id: string) =>
    request<{ success: boolean; message: string; visitor: any }>(`/api/visitors/${id}/check-in`, {
      method: 'POST',
    }),

  checkOutVisitor: (id: string) =>
    request<{ success: boolean; message: string; visitor: any }>(`/api/visitors/${id}/check-out`, {
      method: 'POST',
    }),

  cancelVisitorRequest: (id: string) =>
    request<{ success: boolean; message: string; visitor: any }>(`/api/visitors/${id}/cancel`, {
      method: 'POST',
    }),

  // --- Resident In / Out System ---
  getPresenceStatus: (residentId?: string) => {
    const qs = residentId ? `?residentId=${residentId}` : '';
    return request<{
      state: any;
      activeSession: any;
      durationMinutes: number;
      durationFormatted: string;
    }>(`/api/presence/status${qs}`);
  },

  recordPresence: (action: 'IN' | 'OUT', notes?: string) =>
    request<{
      success: boolean;
      action: 'IN' | 'OUT';
      message: string;
      session: any;
      state: any;
    }>('/api/presence/action', {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    }),

  getPresenceHistory: (residentId?: string) => {
    const qs = residentId ? `?residentId=${residentId}` : '';
    return request<any[]>(`/api/presence/history${qs}`);
  },

  getPresenceOverview: () =>
    request<{
      totalResidents: number;
      insideCount: number;
      outsideCount: number;
      activeInside: any[];
      activeOutside: any[];
      recentLogs: any[];
    }>('/api/presence/overview'),

  // --- Monthly Rent Payment Confirmation ---
  getRentPaymentConfirmations: (params?: { residentId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.residentId) q.append('residentId', params.residentId);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/api/rent-confirmations${qs}`);
  },

  submitRentPaymentConfirmation: (data: {
    billId: string;
    monthlyRent: number;
    billingMonth: string;
    paymentMethod: string;
    transactionReference?: string;
    paymentProofUrl?: string;
    notes?: string;
    confirmationAccepted: boolean;
  }) =>
    request<{ success: boolean; message: string; confirmation: any }>('/api/rent-confirmations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewRentPaymentConfirmation: (id: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    request<{ success: boolean; message: string; confirmation: any; payment?: any }>(
      `/api/rent-confirmations/${id}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ action, rejectionReason }),
      }
    ),

  recordPaymentCorrection: (data: {
    originalPaymentId: string;
    adjustedAmount: number;
    reason: string;
    adjustmentType: string;
    notes?: string;
  }) =>
    request<{ success: boolean; message: string; correctionRecord: any; bill: any }>(
      '/api/rent-payments/correction',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // --- Inventory Management ---
  getInventoryItems: (category?: string) => {
    const qs = category ? `?category=${category}` : '';
    return request<{ items: any[]; categories: string[]; stats: any }>(`/api/inventory/items${qs}`);
  },

  createInventoryItem: (data: any) =>
    request<{ success: boolean; item: any }>('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInventoryItem: (id: string, data: any) =>
    request<{ success: boolean; item: any }>(`/api/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  assignInventoryItem: (id: string, data: { roomNumber: string; floor: number; quantity: number; notes?: string }) =>
    request<{ success: boolean; item: any; log: any }>(`/api/inventory/items/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDamageRecords: (params?: { roomNumber?: string; residentId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.roomNumber) q.append('roomNumber', params.roomNumber);
    if (params?.residentId) q.append('residentId', params.residentId);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/api/inventory/damage${qs}`);
  },

  recordDamage: (data: any) =>
    request<{ success: boolean; message: string; damage: any }>('/api/inventory/damage', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewDamageRecord: (id: string, data: { status: string; recoveryApproved?: boolean; chargeToResidentAmount?: number; recoveryNotes?: string }) =>
    request<{ success: boolean; damage: any }>(`/api/inventory/damage/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // --- Emergency SOS ---
  triggerEmergencyAlert: (data: { emergencyType: string; description?: string }) =>
    request<{ success: boolean; message: string; alert: any }>('/api/emergency/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEmergencyAlerts: () =>
    request<any[]>('/api/emergency/alerts'),

  resolveEmergencyAlert: (id: string) =>
    request<{ success: boolean; alert: any }>(`/api/emergency/alerts/${id}/resolve`, {
      method: 'POST',
    }),

  // --- Room Change History ---
  getRoomChangeHistory: (residentId?: string) => {
    const qs = residentId ? `?residentId=${residentId}` : '';
    return request<any[]>(`/api/rooms/change-history${qs}`);
  },

  reassignRoomBed: (residentId: string, data: { newRoomNumber: string; newBedNumber: string; reason: string }) =>
    request<{ success: boolean; message: string; record: any; resident: any }>(
      `/api/residents/${residentId}/reassign-room`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // --- Activity Audit Logs ---
  getActivityLogs: (params?: { module?: string; date?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.module) q.append('module', params.module);
    if (params?.date) q.append('date', params.date);
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/api/activity-logs${qs}`);
  },

  // --- Vacancy Calculation Stats ---
  getVacancyStats: () =>
    request<{
      summary: any;
      floorBreakdown: any[];
      availableRoomsList: any[];
    }>('/api/rooms/vacancy-stats'),

  // --- Resident Checkout Settlement ---
  getCheckoutSettlementPreview: (residentId: string) =>
    request<{
      resident: any;
      deposit: any;
      depositHeld: number;
      outstandingRent: number;
      approvedDamageCharges: number;
      preliminaryDeductions: number;
      refundableSecurityDeposit: number;
      rawFinalBalance: number;
      settlementType: string;
      unpaidBills: any[];
      damageRecords: any[];
    }>(`/api/residents/${residentId}/checkout-preview`),

  completeCheckoutSettlement: (residentId: string, data: { deductions: any[]; notes?: string }) =>
    request<{ success: boolean; message: string; settlement: any }>(
      `/api/residents/${residentId}/checkout-settlement`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getCheckoutSettlements: () =>
    request<any[]>('/api/checkout-settlements'),
};
