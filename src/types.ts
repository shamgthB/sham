export type Role = 'admin' | 'resident';

export type RegistrationApprovalStatus = 'Waiting for Owner Approval' | 'Approved' | 'Rejected';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  email: string;
  avatar?: string;
  residentId?: string;
  registrationStatus?: RegistrationApprovalStatus;
  rejectionReason?: string;
  termsAcceptedVersion?: string;
  termsAcceptedAt?: string;
}

export interface ResidentRegistration {
  id: string; // e.g. "REG-1001"
  fullName: string;
  avatar: string; // Base64 or image URL
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string; // Valid Indian mobile number
  email: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyRelationship: string;
  workOrCollege: string;
  designation: string;
  whatTheyDo: 'Student' | 'Working Professional' | 'Intern' | 'Freelancer' | 'Other';
  status: RegistrationApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  assignedRoomNumber?: string;
  assignedBedNumber?: string;
  assignedMonthlyRent?: number;
  approvedResidentId?: string;
}

export interface EmailOTPRecord {
  email: string;
  otp: string;
  purpose: 'registration' | 'forgot_password';
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  verified: boolean;
}

export type RoomType = 'single' | 'double';

export type RoomStatus =
  | 'Available'
  | 'Partially Occupied'
  | 'Fully Occupied'
  | 'Maintenance'
  | 'Temporarily Unavailable';

export interface Bed {
  id: string;
  bedNumber: string; // e.g. "Bed 1", "Bed 2"
  isOccupied: boolean;
  residentId?: string;
  residentName?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  facilities: string[];
  beds: Bed[];
  rentPerPerson: number;
  totalRoomRent: number;
  notes?: string;
}

export type ResidentStatus = 'Active' | 'Notice period' | 'Vacated' | 'Suspended';

export interface Resident {
  id: string; // Resident ID, e.g. "RES-101"
  userId?: string;
  fullName: string;
  avatar?: string;
  dob?: string;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  
  // Emergency
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyRelationship: string;

  // Identification
  idType: 'Aadhaar Card' | 'PAN Card' | 'Passport' | 'Voter ID' | 'Driving License';
  idNumber: string;
  idDocumentUrl?: string;

  // Hostel info
  roomNumber: string;
  floor: number;
  bedNumber: string;
  roomType: RoomType;
  joiningDate: string;
  expectedLeavingDate?: string;
  monthlyRent: number; // Contractual rent active for this resident
  securityDeposit: number;
  depositStatus: 'Paid' | 'Refunded' | 'Partially Refunded' | 'Pending';
  status: ResidentStatus;

  // Education / Work
  workOrCollege: string;
  designation: string;
  notes?: string;
  checkoutDate?: string;

  createdAt: string;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';

export interface Bill {
  id: string; // e.g. "INV-1001"
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  roomType: RoomType;
  billingMonth: string; // e.g. "September 2026"
  rentAmount: number;
  otherCharges: number;
  otherChargesNote?: string;
  discount: number;
  previousBalance: number;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate: string;
  status: PaymentStatus;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other Online Payment';

export interface Payment {
  id: string; // e.g. "PAY-2001"
  billId: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  transactionId?: string;
  receiptNumber?: string;
  receivedBy: string;
  notes?: string;
  createdAt?: string;
}

export interface SecurityDepositRecord {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  bedNumber?: string;
  roomType?: RoomType;
  amount: number; // Security deposit amount (e.g. ₹4,500 Single / ₹3,500 Double per person)
  datePaid: string; // Date Paid
  depositDate?: string; // Backward compatibility
  paymentMethod: PaymentMethod | string; // Cash, UPI, Bank Transfer
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid';
  refundableAmount: number; // Refundable amount upon checkout
  refundAmount?: number; // Backward compatibility
  deductionAmount: number; // Deduction amount
  deductionReason?: string; // Deduction reason (damages, unpaid arrears)
  refundDate?: string; // Refund date
  finalSettlementStatus: 'Held in Custody' | 'Fully Refunded' | 'Partially Refunded' | 'Settled with Deductions' | 'Pending Settlement';
  status?: 'Held' | 'Refunded' | 'Partially Refunded' | 'Pending'; // Backward compatibility
  notes?: string;
}

export type ComplaintCategory =
  | 'Electricity'
  | 'Fan'
  | 'Light'
  | 'Water'
  | 'RO water'
  | 'Wi-Fi'
  | 'Bathroom'
  | 'Toilet'
  | 'Cleaning'
  | 'Food'
  | 'Room'
  | 'Furniture/Bed'
  | 'Other';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ComplaintStatus =
  | 'Submitted'
  | 'Received'
  | 'In Progress'
  | 'Waiting for Information'
  | 'Resolved'
  | 'Closed';

export interface ComplaintHistoryItem {
  timestamp: string;
  status: ComplaintStatus;
  note: string;
  by: string;
}

export interface Complaint {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  title: string;
  category: ComplaintCategory;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  photoAttachment?: string;
  adminResponse?: string;
  internalNotes?: string;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  history: ComplaintHistoryItem[];
}

export interface MealMenu {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // e.g. "Monday"
  breakfast: string;
  lunch: string;
  eveningSnacks: string;
  dinner: string;
  specialNote?: string;
}

export type NoticePriority = 'Normal' | 'Important' | 'Urgent';

export interface Notice {
  id: string;
  title: string;
  message?: string;
  content?: string;
  date?: string;
  createdAt?: string;
  expiryDate?: string;
  category?: 'General' | 'Maintenance' | 'Food & Mess' | 'Rules & Regulations' | 'Holiday / Festival';
  priority?: NoticePriority;
  targetAudience: 'All Residents' | 'Specific Floor' | 'Specific Room' | string;
  targetFloor?: number;
  targetRoomNumber?: string;
  isPinned?: boolean;
  isEmergency?: boolean;
  publishedBy?: string;
  createdBy?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverId: string; // "admin" or resident ID
  receiverName?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface CleaningRecord {
  id: string;
  floor: number;
  roomNumber: string;
  targetArea?: string; // "Attached Toilet & Bathroom", "Common Living Area", "Corridor"
  cleaningType?: 'Toilet and Bathroom Deep Clean' | 'Room Sweeping and Mopping' | 'Full Sanitization' | 'Bed Linen Wash' | string;
  cleaningDate?: string;
  scheduledDate?: string;
  completedDate?: string;
  nextScheduledDate?: string;
  assignedStaff?: string;
  cleanerName?: string;
  status: 'Completed' | 'Scheduled' | 'Overdue' | 'In Progress';
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  roomNumber: string;
  floor: number;
  problem?: string;
  issueType?: string;
  description?: string;
  contractorName?: string;
  reportedBy?: string;
  date?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignedPerson?: string;
  estimatedCost: number;
  actualCost: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  resolutionDate?: string;
  notes?: string;
  complaintId?: string;
}

export interface CheckInOutRecord {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  bedNumber?: string;
  type: 'check-in' | 'check-out';
  date: string;
  securityDeposit?: number;
  finalBillAmount?: number;
  deductions?: number;
  refundAmount?: number;
  remarks?: string;
  notes?: string;
  timestamp?: string;
}

export interface RentHistoryEntry {
  id?: string;
  effectiveDate: string;
  singleRent: number;
  doubleRent: number;
  reason?: string;
  notes?: string;
  changedBy?: string;
  changedAt?: string;
  createdAt?: string;
}

export interface HostelSettings {
  hostelName: string;
  address: string;
  phone: string;
  email: string;
  wifiSsid?: string;
  wifiPassword: string;
  singleRent: number;
  doubleRent: number;
  rentEffectiveDate: string;
  paymentDueDay: number;
  defaultSecurityDeposit?: number;
  defaultSecurityDepositSingle: number;
  defaultSecurityDepositDouble: number;
  foodIncluded: boolean;
  facilities: string[];
  rentHistory: RentHistoryEntry[];
}

export interface DashboardStats {
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  totalResidents: number;
  singleRoomsOccupied: number;
  doubleRoomsOccupied: number;
  vacantRooms: number;
  vacantBeds: number;
  currentMonthExpectedRent: number;
  rentCollected: number;
  rentPending: number;
  overduePayments: number;
  openComplaints: number;
  resolvedComplaints: number;
  upcomingCleanings: number;
  recentResidents: Resident[];
  recentPayments: Payment[];
  recentComplaints: Complaint[];
  notices: Notice[];
  pendingRegistrationsCount?: number;
  pendingVisitorRequestsCount?: number;
  pendingRentConfirmationsCount?: number;
  totalCapacity?: number;
  fullyOccupiedRooms?: number;
  partiallyOccupiedRooms?: number;
  completelyVacantRooms?: number;
  activeResidentsInCount?: number;
  activeResidentsOutCount?: number;
}

export type QRSessionType = 'attendance' | 'facility';

export type FacilityType =
  | 'Dining / Mess'
  | 'Gym & Fitness'
  | 'Study / Library Hall'
  | 'Laundry Area'
  | 'Recreation Lounge'
  | 'Coworking / Wi-Fi Zone'
  | 'Other Facility';

export interface QRSession {
  id: string; // e.g. "QR-101"
  title: string;
  type: QRSessionType;
  facilityType?: FacilityType;
  facilityName?: string;
  token: string; // UUID or unique hash encoded in QR payload
  code: string; // 6-8 character human-readable code e.g. "ATT-2481"
  location: string; // e.g. "Main Gate / Reception", "Ground Floor Mess"
  date: string; // YYYY-MM-DD
  sessionTime?: string; // e.g. "Morning Check-In (07:00 - 10:30 AM)"
  validUntil?: string; // ISO string
  isActive: boolean;
  notes?: string;
  createdAt: string;
  totalScans?: number;
}

export interface CheckInRecord {
  id: string; // e.g. "CHK-5001"
  qrSessionId: string;
  sessionTitle: string;
  type: QRSessionType;
  facilityName?: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Late' | 'Verified';
  method: 'camera_scanner' | 'image_upload' | 'manual_code' | 'admin_override';
  notes?: string;
}

// ---------------- TERMS & CONDITIONS ----------------
export interface TermsConfig {
  version: string;
  title: string;
  rules: string[];
  holidays: string[];
  holidayNotice: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TermsAcceptanceRecord {
  id: string;
  userId: string;
  username?: string;
  userName?: string;
  userRole?: string;
  termsVersion?: string;
  version?: string;
  residentId?: string;
  acceptedAt: string;
  acceptedDate?: string;
  acceptedTime?: string;
  deviceInfo?: string;
  deviceBrowser?: string;
  ipAddress?: string;
}

// ---------------- VISITOR MANAGEMENT ----------------
export type VisitorStatus =
  | 'Waiting for Approval'
  | 'Approved'
  | 'Rejected'
  | 'Checked In'
  | 'Checked Out'
  | 'Cancelled'
  | 'Expired';

export interface VisitorRequest {
  id: string; // e.g. "VIS-101"
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;

  visitorName?: string;
  visitorFullName?: string;
  visitorMobile?: string;
  relationship?: string;
  visitorRelationship?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  visitorGender?: string;
  address?: string;
  visitorAddress?: string;
  idType?: 'Aadhaar Card' | 'PAN Card' | 'Driving License' | 'Passport' | 'Voter ID' | 'Other' | string;
  visitorIdType?: string;
  idNumber?: string;
  visitorIdNumber?: string;
  visitDate: string; // YYYY-MM-DD
  expectedArrivalTime: string; // e.g. "10:30 AM"
  expectedDepartureTime: string; // e.g. "05:00 PM"
  purpose?: string;
  purposeOfVisit?: string;
  idDocumentUrl?: string; // Optional photo or ID doc
  visitorPhotoUrl?: string;
  additionalNotes?: string;

  status: VisitorStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  checkInTime?: string;
  actualCheckInTime?: string;
  checkOutTime?: string;
  actualCheckOutTime?: string;
  durationStayMinutes?: number;
  checkedInBy?: string;
  checkedOutBy?: string;
}

// ---------------- RESIDENT IN / OUT SYSTEM ----------------
export type PresenceStatus = 'IN' | 'OUT';

export interface PresenceSession {
  id: string; // e.g. "SES-1001"
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;
  status: PresenceStatus; // Action taken
  entryTime?: string; // Exact ISO timestamp
  exitTime?: string; // Exact ISO timestamp
  durationMinutes?: number;
  durationInsideMinutes?: number;
  durationOutsideMinutes?: number;
  actionBy?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ResidentPresenceState {
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;
  status: PresenceStatus;
  since: string; // ISO string when current status started
  lastActionTime?: string;
  currentSessionId?: string;
  updatedAt: string;
}

// ---------------- MONTHLY RENT CONFIRMATION & VERIFICATION ----------------
export interface RentPaymentConfirmation {
  id: string; // e.g. "RPC-201"
  billId: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor?: number;
  billingMonth: string; // e.g. "September 2026"
  monthlyRent?: number;
  amount?: number;
  submittedAt?: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentProofUrl?: string;
  residentNotes?: string;
  notes?: string;
  status: 'Payment Confirmation Pending' | 'Paid' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  approvedPaymentId?: string;
  isLocked: boolean;
  createdAt?: string;
}

export interface PaymentCorrectionRecord {
  id: string; // e.g. "CORR-501"
  originalPaymentId: string;
  billId: string;
  residentId: string;
  residentName: string;
  correctedBy?: string;
  adjustedBy?: string;
  correctedAt?: string;
  adjustedAt?: string;
  originalAmount: number;
  correctedAmount: number;
  reason: string;
  adjustmentType: 'Credit' | 'Debit' | 'Full Reversal' | 'Dispute Resolution' | string;
  notes?: string;
}

// ---------------- INVENTORY MANAGEMENT ----------------
export type InventoryCategory =
  | 'Furniture'
  | 'Electrical'
  | 'Sanitary'
  | 'Bedding'
  | 'Appliances'
  | 'Safety & Security'
  | 'Other';

export type InventoryCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair' | 'Damaged';

export interface InventoryItem {
  id: string; // e.g. "INV-ITEM-101"
  name?: string;
  itemName?: string;
  itemCode?: string;
  category: InventoryCategory;
  totalQuantity: number;
  availableQuantity: number;
  assignedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  purchaseDate?: string;
  purchaseCost?: number;
  unitCost?: number;
  currentCondition?: InventoryCondition;
  condition?: string;
  location?: string;
  roomNumber?: string;
  floor?: number;
  notes?: string;
  lastInspectedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface InventoryLog {
  id: string;
  itemId?: string;
  inventoryItemId?: string;
  itemName: string;
  action: 'Added' | 'Updated' | 'Assigned to Room' | 'Marked Damaged' | 'Marked Lost' | 'Restored' | string;
  quantity: number;
  roomNumber?: string;
  floor?: number;
  residentId?: string;
  performedBy: string;
  date?: string;
  timestamp?: string;
  notes?: string;
}

// ---------------- DAMAGE & LOSS ----------------
export type DamageStatus =
  | 'Reported'
  | 'Under Review'
  | 'Confirmed'
  | 'Repaired'
  | 'Replaced'
  | 'Closed';

export interface DamageRecord {
  id: string; // e.g. "DMG-301"
  inventoryItemId?: string;
  residentId?: string;
  residentName?: string;
  roomNumber: string;
  floor: number;
  item?: string;
  itemName?: string;
  type?: 'Damage' | 'Loss / Missing' | 'Vandalism' | 'Wear and Tear';
  damageType?: string;
  description: string;
  date?: string;
  photoUrl?: string;
  estimatedCost: number;
  finalCost?: number;
  status: DamageStatus;
  recoveryChargeApproved?: boolean;
  recoveryApproved?: boolean;
  recoveryAmount?: number;
  chargeToResidentAmount?: number;
  recoveryBillId?: string;
  reportedBy: string;
  reportedAt?: string;
  notes?: string;
  recoveryNotes?: string;
  createdAt: string;
}

// ---------------- ROOM CHANGE HISTORY ----------------
export interface RoomChangeRecord {
  id: string; // e.g. "RC-401"
  residentId: string;
  residentName: string;
  previousFloor: number;
  previousRoom?: string;
  previousRoomNumber?: string;
  previousBed?: string;
  previousBedNumber?: string;
  previousRoomType?: string;
  newFloor: number;
  newRoom?: string;
  newRoomNumber?: string;
  newBed?: string;
  newBedNumber?: string;
  newRoomType?: string;
  changeDate: string;
  changeTime?: string;
  changedBy?: string;
  approvedBy?: string;
  reason: string;
  createdAt?: string;
}

// ---------------- ACTIVITY LOG / AUDIT LOG ----------------
export interface ActivityLogItem {
  id: string;
  performedBy: any;
  action: string;
  affectedRecord: any;
  module?: string;
  details?: string;
  date?: string;
  exactTime?: string;
  timestamp?: string;
  previousValue?: string;
  newValue?: string;
  createdAt?: string;
}

// ---------------- RESIDENT CHECKOUT FINAL SETTLEMENT ----------------
export interface SettlementDeductionItem {
  id?: string;
  reason: string;
  amount: number;
  approvedBy?: string;
}

export interface CheckoutSettlementRecord {
  id: string; // e.g. "SETTLE-101"
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;
  checkoutDate: string;
  outstandingRent: number;
  approvedAdditionalCharges?: number;
  approvedCharges?: number;
  otherApprovedDues?: number;
  otherDues?: number;
  securityDeposit?: number;
  securityDepositHeld?: number;
  deductions: SettlementDeductionItem[];
  totalDeductions: number;
  refundableSecurityDeposit: number;
  finalAmount: number; // positive = Resident Must Pay, negative = Hostel Must Refund
  settlementType: 'Resident Must Pay' | 'Hostel Must Refund' | 'Zero Balance Settled';
  status: 'Draft' | 'Completed' | 'Completed & Locked';
  settledBy: string;
  settledAt: string;
  notes?: string;
}

// ---------------- EMERGENCY SOS ALERT ----------------
export interface EmergencyAlertRecord {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  floor: number;
  bedNumber: string;
  phone?: string;
  mobile?: string;
  emergencyType: string;
  message?: string;
  description?: string;
  status: 'Active' | 'Acknowledged' | 'Resolved';
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ---------------- AUTOMATIC VACANCY STATS ----------------
export interface AutomaticVacancyStats {
  totalRooms: number;
  totalCapacity: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  fullyOccupiedRooms: number;
  partiallyOccupiedRooms: number;
  completelyVacantRooms: number;
  singleRoomsTotal?: number;
  singleRoomsOccupied?: number;
  doubleRoomsTotal?: number;
  doubleRoomsOccupied?: number;
}

