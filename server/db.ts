import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  HostelSettings,
  Room,
  Resident,
  Bill,
  Payment,
  SecurityDepositRecord,
  Complaint,
  MealMenu,
  Notice,
  ChatMessage,
  CleaningRecord,
  MaintenanceRecord,
  CheckInOutRecord,
  User,
  QRSession,
  CheckInRecord,
  ResidentRegistration,
  EmailOTPRecord,
  TermsAcceptanceRecord,
  TermsConfig,
  VisitorRequest,
  PresenceSession,
  ResidentPresenceState,
  RentPaymentConfirmation,
  PaymentCorrectionRecord,
  InventoryItem,
  InventoryLog,
  DamageRecord,
  RoomChangeRecord,
  ActivityLogItem,
  CheckoutSettlementRecord,
  EmergencyAlertRecord,
} from '../src/types';

export const OFFICIAL_TERMS_RULES: string[] = [
  "Residents are responsible for the safety and security of their own belongings.",
  "Residents must switch off the fan and lights and lock the room whenever they leave. A penalty of ₹50 for leaving the light on and ₹100 for leaving the fan running will be charged respectively.",
  "Making excessive noise or fighting in the hostel is strictly prohibited.",
  "Smoking and the consumption or possession of any kind of intoxicating or addictive substance are strictly prohibited in the hostel. Strict action will be taken if any such substance is found in a resident's possession.",
  "Keeping any type of electrical appliance such as an iron, geyser, electric kettle, etc. in the hostel is strictly prohibited. If such items are found in a resident's possession, they may be confiscated.",
  "Hostel fees must be paid between the 1st and 5th of every month. After the 5th, a late fee of ₹50 per day will be charged.",
  "Entry of any outside person into the hostel, except registered hostel residents, is strictly prohibited.",
  "No accommodation or food facilities will be provided for parents or relatives of residents.",
  "Residents may give their belongings or money to another person at their own responsibility. The hostel management will not be responsible for any loss or damage.",
  "Residents must inform the hostel management at least 15 days before leaving the hostel. Otherwise, the security deposit will not be refunded.",
  "If a resident leaves the hostel at any time during the middle of a month, the monthly fee will not be refunded.",
  "If a hostel bed remains reserved/booked for a resident, the full monthly fee must be paid under all circumstances.",
  "Any damage caused to hostel property must be compensated by the resident responsible for the damage.",
  "The hostel gate will remain open from 5:00 AM to 10:00 PM. The gate will not be opened after 10:00 PM.",
  "Residents should take only as much food as they need and must not waste food. Taking food to the room is not permitted.",
  "Residents must not engage in any activity inside the room that causes inconvenience or disturbance to their roommate, as both residents have to live together in the same room.",
  "Suggestions and feedback are always welcome.",
  "Residents must bring their own bucket, mug, cup, and spoon to the hostel.",
  "The hostel management will not be responsible for any incident that occurs outside the hostel premises.",
  "The hostel management will not be responsible for any self-inflicted physical harm arising from any form of mental stress or depression.",
  "In case of any violation or irregularity of hostel rules, the resident may be expelled from the hostel.",
  "In case of any absence from the hostel, the resident must submit a leave application or arrange communication with their parent/guardian.",
  "During hostel holidays, the mess will remain closed. No food will be provided by the hostel during the holiday period.",
];

export const OFFICIAL_HOSTEL_HOLIDAYS: string[] = [
  "Raksha Bandhan",
  "Durga Puja",
  "Diwali",
  "Holi",
];

export interface DatabaseSchema {
  settings: HostelSettings;
  users: (User & { passwordHash: string })[];
  rooms: Room[];
  residents: Resident[];
  bills: Bill[];
  payments: Payment[];
  deposits: SecurityDepositRecord[];
  complaints: Complaint[];
  meals: MealMenu[];
  notices: Notice[];
  messages: ChatMessage[];
  cleaning: CleaningRecord[];
  maintenance: MaintenanceRecord[];
  checkInOuts: CheckInOutRecord[];
  qrSessions: QRSession[];
  checkInRecords: CheckInRecord[];
  registrations: (ResidentRegistration & { passwordHash: string })[];
  emailOTPs: EmailOTPRecord[];
  termsAcceptances: TermsAcceptanceRecord[];
  termsConfig?: TermsConfig;
  visitors: VisitorRequest[];
  presenceSessions: PresenceSession[];
  residentPresence: ResidentPresenceState[];
  rentConfirmations: RentPaymentConfirmation[];
  paymentCorrections: PaymentCorrectionRecord[];
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  damageRecords: DamageRecord[];
  roomChanges: RoomChangeRecord[];
  activityLogs: ActivityLogItem[];
  checkoutSettlements: CheckoutSettlementRecord[];
  emergencyAlerts: EmergencyAlertRecord[];
}

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'hostel_data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data directory, using in-memory fallback:', err);
  }
}

function generateInitialData(): DatabaseSchema {
  const settings: HostelSettings = {
    hostelName: 'Greenfield Executive Residency & Hostel',
    address: 'Plot 42, Metro Residency Lane, Knowledge City, Bangalore, Karnataka - 560066',
    phone: '+91 98765 43210',
    email: 'management@greenfieldhostel.com',
    wifiPassword: 'Greenfield#WiFi2026',
    singleRent: 9000,
    doubleRent: 6500, // per person
    rentEffectiveDate: '2026-01-01',
    paymentDueDay: 5,
    defaultSecurityDepositSingle: 4500,
    defaultSecurityDepositDouble: 3500,
    foodIncluded: true,
    facilities: [
      'Free High-Speed Wi-Fi on every floor',
      'Weekly toilet & bathroom deep cleaning by management',
      'Hygiene and garbage sanitization protocol',
      'Free RO cold & normal drinking water',
      '24-Hour Electricity with instant inverter/generator backup',
      '4 Times Hygienic Meal Service included in accommodation rent',
      'Attached individual or shared bathrooms with modern fittings',
      'Individual study table, chair, and dedicated wardrobe/locker',
      'Biometric entry and 24/7 CCTV surveillance in common areas',
    ],
    rentHistory: [
      {
        id: 'rh-1',
        effectiveDate: '2026-01-01',
        singleRent: 9000,
        doubleRent: 6500,
        notes: 'Initial standard rates with all meals and high-speed Wi-Fi included',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  // Rooms creation: 3 Floors, 7 Rooms each = 21 Rooms
  // Floor 1: 101 to 107
  // Floor 2: 201 to 207
  // Floor 3: 301 to 307
  // Let 101, 102, 201, 202, 301, 302 be Single living; the rest be Double living
  const rooms: Room[] = [];

  const singleFacilities = [
    '1 Bed',
    '1 Fan',
    '1 Light',
    '1 English Toilet',
    'Attached Bathroom',
    'Appropriate Switches/Switchboard',
    'Wardrobe & Study Desk',
  ];

  const doubleFacilities = [
    '1 Bed',
    '1 Double Sleeping Bed / Arrangement',
    '1 Fan',
    '1 Light',
    '2 Switchboards',
    '1 Indian Toilet',
    'Attached Bathroom',
    'Dual Lockers',
  ];

  for (let floor = 1; floor <= 3; floor++) {
    for (let r = 1; r <= 7; r++) {
      const roomNum = `${floor}0${r}`;
      // 1st two rooms on each floor are Single; remainder are Double
      const isSingle = r <= 2;
      const type = isSingle ? 'single' : 'double';
      const capacity = isSingle ? 1 : 2;
      const rentPerPerson = isSingle ? settings.singleRent : settings.doubleRent;

      const beds = Array.from({ length: capacity }, (_, idx) => ({
        id: `bed-${roomNum}-${idx + 1}`,
        bedNumber: `Bed ${idx + 1}`,
        isOccupied: false,
      }));

      rooms.push({
        id: `room-${roomNum}`,
        roomNumber: roomNum,
        floor,
        type,
        capacity,
        status: 'Available',
        facilities: isSingle ? [...singleFacilities] : [...doubleFacilities],
        beds,
        rentPerPerson,
        totalRoomRent: rentPerPerson * capacity,
        notes: `Floor ${floor} Room ${roomNum} - Common living lounge & Wi-Fi available`,
      });
    }
  }

  // Pre-seed a few active demo residents to show working occupancy & billing
  const residents: Resident[] = [
    {
      id: 'RES-101',
      fullName: 'Aarav Patel',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      dob: '2001-05-14',
      gender: 'Male',
      mobile: '+91 98450 11223',
      email: 'aarav.patel@example.com',
      address: '24 Green Meadows, Ring Road',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
      emergencyContactName: 'Dinesh Patel',
      emergencyContactNumber: '+91 98450 99887',
      emergencyRelationship: 'Father',
      idType: 'Aadhaar Card',
      idNumber: '9845-1234-5678',
      roomNumber: '101',
      floor: 1,
      bedNumber: 'Bed 1',
      roomType: 'single',
      joiningDate: '2026-02-01',
      expectedLeavingDate: '2027-01-31',
      monthlyRent: 9000,
      securityDeposit: 4500,
      depositStatus: 'Paid',
      status: 'Active',
      workOrCollege: 'Cognizant Tech Solutions',
      designation: 'Associate Software Engineer',
      notes: 'Prefers quiet study environment. Prompt payer.',
      createdAt: '2026-02-01T09:00:00.000Z',
    },
    {
      id: 'RES-103A',
      fullName: 'Rohan Verma',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      dob: '2002-08-20',
      gender: 'Male',
      mobile: '+91 97110 44556',
      email: 'rohan.verma@example.com',
      address: 'Flat 302, Lotus Heights, Gomti Nagar',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      pinCode: '226010',
      emergencyContactName: 'Sunita Verma',
      emergencyContactNumber: '+91 97110 88776',
      emergencyRelationship: 'Mother',
      idType: 'Aadhaar Card',
      idNumber: '4455-8899-1122',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 1',
      roomType: 'double',
      joiningDate: '2026-01-15',
      expectedLeavingDate: '2026-12-31',
      monthlyRent: 6500,
      securityDeposit: 3500,
      depositStatus: 'Paid',
      status: 'Active',
      workOrCollege: 'National Institute of Design',
      designation: 'Postgraduate Student',
      notes: 'Art & design student. Vegetarian meals preferred.',
      createdAt: '2026-01-15T10:30:00.000Z',
    },
    {
      id: 'RES-103B',
      fullName: 'Vikram Sen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      dob: '2000-11-03',
      gender: 'Male',
      mobile: '+91 99201 33221',
      email: 'vikram.sen@example.com',
      address: 'B-12 Lake View Enclave, Salt Lake',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '700091',
      emergencyContactName: 'Bimal Sen',
      emergencyContactNumber: '+91 99201 99001',
      emergencyRelationship: 'Uncle',
      idType: 'Passport',
      idNumber: 'Z8941022',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 2',
      roomType: 'double',
      joiningDate: '2026-02-10',
      expectedLeavingDate: '2026-11-30',
      monthlyRent: 6500,
      securityDeposit: 3500,
      depositStatus: 'Paid',
      status: 'Active',
      workOrCollege: 'Infosys BPM',
      designation: 'Financial Analyst',
      notes: 'Shares room 103 with Rohan amicably.',
      createdAt: '2026-02-10T14:00:00.000Z',
    },
    {
      id: 'RES-201',
      fullName: 'Neha Kulkarni',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      dob: '2001-03-12',
      gender: 'Female',
      mobile: '+91 98820 66778',
      email: 'neha.kulkarni@example.com',
      address: '15 Shivneri Colony',
      city: 'Nashik',
      state: 'Maharashtra',
      pinCode: '422005',
      emergencyContactName: 'Anil Kulkarni',
      emergencyContactNumber: '+91 98820 11229',
      emergencyRelationship: 'Father',
      idType: 'PAN Card',
      idNumber: 'BKUPK8872L',
      roomNumber: '201',
      floor: 2,
      bedNumber: 'Bed 1',
      roomType: 'single',
      joiningDate: '2026-03-01',
      expectedLeavingDate: '2027-02-28',
      monthlyRent: 9000,
      securityDeposit: 4500,
      depositStatus: 'Paid',
      status: 'Active',
      workOrCollege: 'HCL Technologies',
      designation: 'UI/UX Designer',
      notes: 'Floor 2 single occupant.',
      createdAt: '2026-03-01T11:00:00.000Z',
    },
  ];

  // Update room occupancy for pre-seeded residents
  residents.forEach((res) => {
    const room = rooms.find((r) => r.roomNumber === res.roomNumber);
    if (room) {
      const bed = room.beds.find((b) => b.bedNumber === res.bedNumber);
      if (bed) {
        bed.isOccupied = true;
        bed.residentId = res.id;
        bed.residentName = res.fullName;
      }
      const occupiedCount = room.beds.filter((b) => b.isOccupied).length;
      if (occupiedCount === room.capacity) {
        room.status = 'Fully Occupied';
      } else if (occupiedCount > 0) {
        room.status = 'Partially Occupied';
      } else {
        room.status = 'Available';
      }
    }
  });

  // Users: Admin + 4 Residents
  const users: (User & { passwordHash: string })[] = [
    {
      id: 'usr-admin',
      username: 'admin',
      passwordHash: 'admin123', // Plain for simplicity & ease of demo verification
      role: 'admin',
      name: 'Rajesh Sharma',
      email: 'management@greenfieldhostel.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-aarav',
      username: 'aarav',
      passwordHash: 'resident123',
      role: 'resident',
      name: 'Aarav Patel',
      email: 'aarav.patel@example.com',
      residentId: 'RES-101',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-rohan',
      username: 'rohan',
      passwordHash: 'resident123',
      role: 'resident',
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      residentId: 'RES-103A',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-vikram',
      username: 'vikram',
      passwordHash: 'resident123',
      role: 'resident',
      name: 'Vikram Sen',
      email: 'vikram.sen@example.com',
      residentId: 'RES-103B',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-neha',
      username: 'neha',
      passwordHash: 'resident123',
      role: 'resident',
      name: 'Neha Kulkarni',
      email: 'neha.kulkarni@example.com',
      residentId: 'RES-201',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  ];

  // Pre-seed Invoices / Bills
  const bills: Bill[] = [
    {
      id: 'INV-2026-09-101',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      floor: 1,
      roomType: 'single',
      billingMonth: 'September 2026',
      rentAmount: 9000,
      otherCharges: 0,
      discount: 0,
      previousBalance: 0,
      totalAmount: 9000,
      amountPaid: 9000,
      remainingBalance: 0,
      dueDate: '2026-09-05',
      status: 'Paid',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'INV-2026-09-103A',
      residentId: 'RES-103A',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      floor: 1,
      roomType: 'double',
      billingMonth: 'September 2026',
      rentAmount: 6500,
      otherCharges: 0,
      discount: 0,
      previousBalance: 0,
      totalAmount: 6500,
      amountPaid: 4000,
      remainingBalance: 2500,
      dueDate: '2026-09-05',
      status: 'Partially Paid',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'INV-2026-09-103B',
      residentId: 'RES-103B',
      residentName: 'Vikram Sen',
      roomNumber: '103',
      floor: 1,
      roomType: 'double',
      billingMonth: 'September 2026',
      rentAmount: 6500,
      otherCharges: 0,
      discount: 0,
      previousBalance: 0,
      totalAmount: 6500,
      amountPaid: 0,
      remainingBalance: 6500,
      dueDate: '2026-09-05',
      status: 'Overdue',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'INV-2026-09-201',
      residentId: 'RES-201',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      floor: 2,
      roomType: 'single',
      billingMonth: 'September 2026',
      rentAmount: 9000,
      otherCharges: 0,
      discount: 0,
      previousBalance: 0,
      totalAmount: 9000,
      amountPaid: 9000,
      remainingBalance: 0,
      dueDate: '2026-09-05',
      status: 'Paid',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
  ];

  // Pre-seed Payments
  const payments: Payment[] = [
    {
      id: 'PAY-901',
      billId: 'INV-2026-09-101',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      floor: 1,
      amount: 9000,
      paymentDate: '2026-09-03',
      paymentMethod: 'UPI',
      transactionReference: 'UPI/624911849201@okhdfcbank',
      receivedBy: 'Rajesh Sharma (Owner)',
      notes: 'Full payment received via UPI QR',
    },
    {
      id: 'PAY-902',
      billId: 'INV-2026-09-103A',
      residentId: 'RES-103A',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      floor: 1,
      amount: 4000,
      paymentDate: '2026-09-04',
      paymentMethod: 'Cash',
      transactionReference: 'CASH-REC-103',
      receivedBy: 'Rajesh Sharma (Owner)',
      notes: 'Partial cash payment, balance ₹2,500 due on 15th',
    },
    {
      id: 'PAY-903',
      billId: 'INV-2026-09-201',
      residentId: 'RES-201',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      floor: 2,
      amount: 9000,
      paymentDate: '2026-09-02',
      paymentMethod: 'Bank Transfer',
      transactionReference: 'IMPS/624501239845',
      receivedBy: 'Rajesh Sharma (Owner)',
      notes: 'NetBanking IMPS transfer verified',
    },
  ];

  // Pre-seed Security Deposits with full deposit lifecycle fields
  const deposits: SecurityDepositRecord[] = [
    {
      id: 'DEP-101',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      bedNumber: 'Bed 1',
      roomType: 'single',
      amount: 4500,
      datePaid: '2026-02-01',
      depositDate: '2026-02-01',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      refundableAmount: 4500,
      refundAmount: 0,
      deductionAmount: 0,
      deductionReason: '',
      refundDate: '',
      finalSettlementStatus: 'Held in Custody',
      status: 'Held',
      notes: 'Full deposit paid at check-in (Single Room standard deposit)',
    },
    {
      id: 'DEP-103A',
      residentId: 'RES-103A',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      bedNumber: 'Bed 1',
      roomType: 'double',
      amount: 3500,
      datePaid: '2026-01-15',
      depositDate: '2026-01-15',
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Paid',
      refundableAmount: 3500,
      refundAmount: 0,
      deductionAmount: 0,
      deductionReason: '',
      refundDate: '',
      finalSettlementStatus: 'Held in Custody',
      status: 'Held',
      notes: 'Full deposit paid at check-in (Double Room standard deposit)',
    },
    {
      id: 'DEP-103B',
      residentId: 'RES-103B',
      residentName: 'Vikram Sen',
      roomNumber: '103',
      bedNumber: 'Bed 2',
      roomType: 'double',
      amount: 3500,
      datePaid: '2026-02-10',
      depositDate: '2026-02-10',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      refundableAmount: 3500,
      refundAmount: 0,
      deductionAmount: 0,
      deductionReason: '',
      refundDate: '',
      finalSettlementStatus: 'Held in Custody',
      status: 'Held',
      notes: 'Full deposit paid at check-in (Double Room standard deposit)',
    },
    {
      id: 'DEP-201',
      residentId: 'RES-201',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      bedNumber: 'Bed 1',
      roomType: 'single',
      amount: 4500,
      datePaid: '2026-03-01',
      depositDate: '2026-03-01',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      refundableAmount: 4500,
      refundAmount: 0,
      deductionAmount: 0,
      deductionReason: '',
      refundDate: '',
      finalSettlementStatus: 'Held in Custody',
      status: 'Held',
      notes: 'Full deposit paid at check-in (Single Room standard deposit)',
    },
  ];

  // Pre-seed Complaints
  const complaints: Complaint[] = [
    {
      id: 'CMP-101',
      residentId: 'RES-103A',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      floor: 1,
      title: 'Bathroom washbasin tap leaking water',
      category: 'Water',
      description: 'The washbasin tap in attached bathroom has a slow persistent drip causing water wastage.',
      priority: 'Medium',
      status: 'In Progress',
      adminResponse: 'Plumber Suresh has been notified and scheduled for visit today at 4:30 PM.',
      internalNotes: 'Replace washer or tap valve',
      assignedTo: 'Suresh (Hostel Plumber)',
      createdAt: '2026-09-08T10:15:00.000Z',
      history: [
        {
          timestamp: '2026-09-08T10:15:00.000Z',
          status: 'Submitted',
          note: 'Complaint registered by resident Rohan Verma',
          by: 'Rohan Verma',
        },
        {
          timestamp: '2026-09-08T11:00:00.000Z',
          status: 'In Progress',
          note: 'Assigned to plumber Suresh',
          by: 'Rajesh Sharma',
        },
      ],
    },
    {
      id: 'CMP-102',
      residentId: 'RES-201',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      floor: 2,
      title: 'Ceiling fan regulator noisy at speed 2',
      category: 'Fan',
      description: 'The ceiling fan regulator gives buzzing sound when switched to speed 2.',
      priority: 'Low',
      status: 'Resolved',
      adminResponse: 'Regulator unit replaced with brand new Anchor modular switch.',
      internalNotes: 'Replaced regulator component cost ₹180',
      assignedTo: 'Mahesh (Electrician)',
      createdAt: '2026-09-04T15:20:00.000Z',
      resolvedAt: '2026-09-05T12:00:00.000Z',
      history: [
        {
          timestamp: '2026-09-04T15:20:00.000Z',
          status: 'Submitted',
          note: 'Complaint registered by resident',
          by: 'Neha Kulkarni',
        },
        {
          timestamp: '2026-09-05T12:00:00.000Z',
          status: 'Resolved',
          note: 'Replaced regulator and tested ok',
          by: 'Rajesh Sharma',
        },
      ],
    },
  ];

  // Pre-seed Meal Menus
  const meals: MealMenu[] = [
    {
      id: 'meal-mon',
      date: '2026-09-07',
      dayOfWeek: 'Monday',
      breakfast: 'Poha with Roasted Peanuts, Boiled Sprouts, Masala Chai / Coffee',
      lunch: 'Rajma Masala, Steamed Basmati Rice, Chapati, Mixed Salad, Curd',
      eveningSnacks: 'Vegetable Samosa with Mint Chutney, Hot Tea',
      dinner: 'Aloo Gobi Matar, Dal Tadka, Phulka Roti, Jeera Rice, Gulab Jamun (1 pc)',
      specialNote: 'Dessert served with dinner tonight',
    },
    {
      id: 'meal-tue',
      date: '2026-09-08',
      dayOfWeek: 'Tuesday',
      breakfast: 'South Indian Idli & Medu Vada, Coconut Chutney, Sambar, Filter Coffee',
      lunch: 'Palak Paneer, Yellow Moong Dal, Steamed Rice, Tawa Roti, Papad',
      eveningSnacks: 'Banana Bread & Salted Biscuits, Ginger Tea',
      dinner: 'Seasonal Mix Veg Korma, Dal Fry, Roti, Peas Pulao, Boondi Raita',
    },
    {
      id: 'meal-wed',
      date: '2026-09-09',
      dayOfWeek: 'Wednesday',
      breakfast: 'Stuffed Aloo Paratha with Butter, Curd & Pickle, Tea',
      lunch: 'Chole Masala, Bhature / Rice, Jeera Aloo, Cucumber Salad',
      eveningSnacks: 'Crispy Veg Pakoras, Green Chutney, Cutting Chai',
      dinner: 'Paneer Butter Masala, Kali Dal Makhani, Butter Naan / Roti, Rice, Kheer',
      specialNote: 'Special Punjabi evening spread',
    },
    {
      id: 'meal-thu',
      date: '2026-09-10',
      dayOfWeek: 'Thursday',
      breakfast: 'Upma with Cashews, Tomato Chutney, Fresh Fruits, Tea/Coffee',
      lunch: 'Bhindi Do Pyaza, Toor Dal Tadka, Rice, Phulka, Butter Milk (Chaas)',
      eveningSnacks: 'Bhel Puri with Sev & Chutneys, Tea',
      dinner: 'Malai Kofta, Kashmiri Pulao, Chapati, Dal Palak, Fruit Custard',
      specialNote: 'Fresh chilled Butter Milk available during lunch',
    },
    {
      id: 'meal-fri',
      date: '2026-09-11',
      dayOfWeek: 'Friday',
      breakfast: 'Crispy Masala Dosa, Sambar, Chutney, Tea / Milk',
      lunch: 'Egg Curry / Paneer Bhurji, Dal Lasooni, Steamed Rice, Roti, Salad',
      eveningSnacks: 'Bread Pakora, Sweet & Spicy Dip, Tea',
      dinner: 'Vegetable Dum Biryani, Mirchi Ka Salan, Onion Raita, Moong Dal Halwa',
      specialNote: 'Egg option available for non-vegetarian residents',
    },
    {
      id: 'meal-sat',
      date: '2026-09-12',
      dayOfWeek: 'Saturday',
      breakfast: 'Bread Omelette / Veg Cheese Toast, Cornflakes with Milk, Coffee',
      lunch: 'Kadhi Pakora, Steamed Rice, Aloo Jeera, Roti, Fried Papad',
      eveningSnacks: 'Pav Bhaji with Buttered Pav, Chai',
      dinner: 'Matar Paneer, Dal Makhani, Tawa Paratha, Veg Pulao, Ice Cream',
    },
    {
      id: 'meal-sun',
      date: '2026-09-13',
      dayOfWeek: 'Sunday',
      breakfast: 'Puri Bhaji with Halwa, Masala Tea / Coffee',
      lunch: 'Special Sunday Feast: Paneer Tikka Masala, Dal Maharani, Veg Pulao, Butter Roti, Gulab Jamun',
      eveningSnacks: 'Dry Cake & Cookies, Coffee',
      dinner: 'Light Khichdi, Kadhi, Roasted Papad, Pickle, Aloo Chokha (Digestive Sunday Supper)',
      specialNote: 'Sunday Brunch timing extended until 10:30 AM',
    },
  ];

  // Pre-seed Notices
  const notices: Notice[] = [
    {
      id: 'NOT-01',
      title: 'Weekly Deep Toilet & Bathroom Cleaning - Saturday',
      message:
        'All attached and common toilets on Floor 1, Floor 2, and Floor 3 will undergo deep sanitization and hygiene cleaning between 9:30 AM and 1:30 PM this Saturday. Please ensure bathroom floors are clear of laundry.',
      date: '2026-09-08',
      expiryDate: '2026-09-15',
      priority: 'Important',
      targetAudience: 'all',
      createdBy: 'Rajesh Sharma (Owner)',
    },
    {
      id: 'NOT-02',
      title: 'Free High-Speed Wi-Fi Upgrade Completed on Floor 2 & 3',
      message:
        'New dual-band Wi-Fi 6 access points have been installed. Use SSID "GreenfieldGuest_HighSpeed_5G" with password "Greenfield#WiFi2026" for speeds up to 300 Mbps.',
      date: '2026-09-05',
      priority: 'Normal',
      targetAudience: 'all',
      createdBy: 'Rajesh Sharma (Owner)',
    },
    {
      id: 'NOT-03',
      title: 'Monthly Rent Reminder: Due Date 5th of Each Month',
      message:
        'Dear residents, kindly note that monthly rent is due on the 5th of every month. Payments can be submitted via UPI, NetBanking, or cash to the office desk to avoid late fees.',
      date: '2026-09-01',
      expiryDate: '2026-09-30',
      priority: 'Urgent',
      targetAudience: 'all',
      createdBy: 'Rajesh Sharma (Owner)',
    },
  ];

  // Pre-seed Cleaning Records
  const cleaning: CleaningRecord[] = [
    {
      id: 'CLN-101',
      floor: 1,
      roomNumber: '101',
      targetArea: 'Attached Toilet & Bathroom',
      cleaningDate: '2026-09-06',
      nextScheduledDate: '2026-09-13',
      assignedStaff: 'Ramesh (Housekeeping)',
      status: 'Completed',
      notes: 'Acid scrub, anti-bacterial fogging, mirror cleaned',
    },
    {
      id: 'CLN-103',
      floor: 1,
      roomNumber: '103',
      targetArea: 'Attached Toilet & Bathroom',
      cleaningDate: '2026-09-06',
      nextScheduledDate: '2026-09-13',
      assignedStaff: 'Ramesh (Housekeeping)',
      status: 'Completed',
      notes: 'Indian toilet descaled and floor sanitized',
    },
    {
      id: 'CLN-201',
      floor: 2,
      roomNumber: '201',
      targetArea: 'Attached Toilet & Bathroom',
      cleaningDate: '2026-09-01',
      nextScheduledDate: '2026-09-08',
      assignedStaff: 'Sunil (Housekeeping)',
      status: 'Overdue',
      notes: 'Scheduled for immediate re-visit',
    },
    {
      id: 'CLN-FL1-LIVING',
      floor: 1,
      roomNumber: 'Common Area',
      targetArea: 'Common Living Area & Corridor',
      cleaningDate: '2026-09-09',
      nextScheduledDate: '2026-09-12',
      assignedStaff: 'Ramesh (Housekeeping)',
      status: 'Completed',
      notes: 'Mop with disinfectant, sofas dusted',
    },
  ];

  // Pre-seed Maintenance
  const maintenance: MaintenanceRecord[] = [
    {
      id: 'MNT-01',
      roomNumber: '103',
      floor: 1,
      problem: 'Washbasin tap drip replacement',
      reportedBy: 'Rohan Verma (Resident)',
      date: '2026-09-08',
      priority: 'Medium',
      assignedPerson: 'Suresh (Plumber)',
      estimatedCost: 250,
      actualCost: 0,
      status: 'In Progress',
      notes: 'Parts purchased, scheduled installation today',
      complaintId: 'CMP-101',
    },
    {
      id: 'MNT-02',
      roomNumber: '201',
      floor: 2,
      problem: 'Fan speed regulator buzzing',
      reportedBy: 'Neha Kulkarni',
      date: '2026-09-04',
      priority: 'Low',
      assignedPerson: 'Mahesh (Electrician)',
      estimatedCost: 200,
      actualCost: 180,
      status: 'Completed',
      resolutionDate: '2026-09-05',
      notes: 'Anchor modular regulator replaced successfully',
      complaintId: 'CMP-102',
    },
  ];

  // Pre-seed Chat Messages
  const messages: ChatMessage[] = [
    {
      id: 'msg-1',
      senderId: 'usr-aarav',
      senderName: 'Aarav Patel (Room 101)',
      senderRole: 'resident',
      receiverId: 'admin',
      message: 'Hello Rajesh sir, I will be working late on Friday. Could you please keep my dinner plate in the warm pantry?',
      createdAt: '2026-09-08T18:30:00.000Z',
      read: true,
    },
    {
      id: 'msg-2',
      senderId: 'usr-admin',
      senderName: 'Rajesh Sharma (Owner)',
      senderRole: 'admin',
      receiverId: 'usr-aarav',
      message: 'Sure Aarav, I informed the cook chef Ramu. Your dinner will be boxed in the microwave rack on floor 1 common lounge.',
      createdAt: '2026-09-08T18:45:00.000Z',
      read: true,
    },
    {
      id: 'msg-3',
      senderId: 'usr-rohan',
      senderName: 'Rohan Verma (Room 103)',
      senderRole: 'resident',
      receiverId: 'admin',
      message: 'Sir, regarding the balance rent of ₹2,500, my scholarship stipend will credit on 14th September and I will clear it.',
      createdAt: '2026-09-09T09:10:00.000Z',
      read: true,
    },
    {
      id: 'msg-4',
      senderId: 'usr-admin',
      senderName: 'Rajesh Sharma (Owner)',
      senderRole: 'admin',
      receiverId: 'usr-rohan',
      message: 'Noted Rohan. Thanks for informing in advance. Approved until 15th September without overdue charges.',
      createdAt: '2026-09-09T10:00:00.000Z',
      read: true,
    },
  ];

  const checkInOuts: CheckInOutRecord[] = [
    {
      id: 'CIO-101',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      bedNumber: 'Bed 1',
      type: 'check-in',
      date: '2026-02-01',
      securityDeposit: 4500,
      remarks: 'Initial onboarding, room key handed over',
    },
    {
      id: 'CIO-103A',
      residentId: 'RES-103A',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      bedNumber: 'Bed 1',
      type: 'check-in',
      date: '2026-01-15',
      securityDeposit: 3500,
      remarks: 'Initial onboarding, bed 1 allocated',
    },
    {
      id: 'CIO-103B',
      residentId: 'RES-103B',
      residentName: 'Vikram Sen',
      roomNumber: '103',
      bedNumber: 'Bed 2',
      type: 'check-in',
      date: '2026-02-10',
      securityDeposit: 3500,
      remarks: 'Onboarding completed with ID verified',
    },
    {
      id: 'CIO-201',
      residentId: 'RES-201',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      bedNumber: 'Bed 1',
      type: 'check-in',
      date: '2026-03-01',
      securityDeposit: 4500,
      remarks: 'Full deposit paid, key provided',
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const qrSessions: QRSession[] = [
    {
      id: 'QR-ATT-101',
      title: 'Daily Hostel Attendance & Gate Entry',
      type: 'attendance',
      token: 'SEC-ATT-2026-GATE01-9481',
      code: 'ATT-9481',
      location: 'Main Reception & Gate 1',
      date: todayStr,
      sessionTime: 'Morning & Daily Roll Call (06:00 - 23:00)',
      isActive: true,
      notes: 'Mandatory daily check-in for all hostel residents.',
      createdAt: new Date().toISOString(),
      totalScans: 4,
    },
    {
      id: 'QR-FAC-201',
      title: 'Hostel Mess & Dining Hall Service',
      type: 'facility',
      facilityType: 'Dining / Mess',
      facilityName: 'Dining Hall (4 Meals / Day)',
      token: 'SEC-FAC-2026-MESS01-5120',
      code: 'MESS-5120',
      location: 'Ground Floor Dining Hall Counter',
      date: todayStr,
      sessionTime: 'Breakfast, Lunch, Snacks & Dinner',
      isActive: true,
      notes: 'Scan at meal distribution counter for verified meal entry.',
      createdAt: new Date().toISOString(),
      totalScans: 3,
    },
    {
      id: 'QR-FAC-202',
      title: 'Library & Quiet Study Hall Access',
      type: 'facility',
      facilityType: 'Study / Library Hall',
      facilityName: 'Quiet Study Hall',
      token: 'SEC-FAC-2026-STUDY-3319',
      code: 'STUDY-3319',
      location: '2nd Floor North Wing Study Center',
      date: todayStr,
      sessionTime: '24/7 Access',
      isActive: true,
      notes: 'Air-conditioned study desks and high-speed Wi-Fi workstation.',
      createdAt: new Date().toISOString(),
      totalScans: 2,
    },
    {
      id: 'QR-FAC-203',
      title: 'Fitness Gym & Workout Studio',
      type: 'facility',
      facilityType: 'Gym & Fitness',
      facilityName: 'Fitness Gym',
      token: 'SEC-FAC-2026-GYM-7842',
      code: 'GYM-7842',
      location: 'Ground Floor Wellness Wing',
      date: todayStr,
      sessionTime: 'Morning 06:00-10:00 & Evening 17:00-21:30',
      isActive: true,
      notes: 'Treadmills, dumbbells, yoga mats, and resistance machines.',
      createdAt: new Date().toISOString(),
      totalScans: 1,
    },
    {
      id: 'QR-FAC-204',
      title: 'Terrace Laundry & Automatic Washers',
      type: 'facility',
      facilityType: 'Laundry Area',
      facilityName: 'Terrace Laundry Hub',
      token: 'SEC-FAC-2026-LAUNDRY-6621',
      code: 'LAUND-6621',
      location: '3rd Floor Terrace Laundry Bay',
      date: todayStr,
      sessionTime: '07:00 - 22:00 Daily',
      isActive: true,
      notes: 'Front-load washers and drying zone.',
      createdAt: new Date().toISOString(),
      totalScans: 1,
    },
  ];

  const checkInRecords: CheckInRecord[] = [
    {
      id: 'CHK-5001',
      qrSessionId: 'QR-ATT-101',
      sessionTitle: 'Daily Hostel Attendance & Gate Entry',
      type: 'attendance',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      floor: 1,
      bedNumber: 'Single Bed',
      timestamp: `${todayStr}T08:15:20.000Z`,
      date: todayStr,
      status: 'Present',
      method: 'camera_scanner',
      notes: 'Scanned via resident mobile camera at Gate 1',
    },
    {
      id: 'CHK-5002',
      qrSessionId: 'QR-FAC-201',
      sessionTitle: 'Hostel Mess & Dining Hall Service',
      type: 'facility',
      facilityName: 'Dining Hall (4 Meals / Day)',
      residentId: 'RES-101',
      residentName: 'Aarav Patel',
      roomNumber: '101',
      floor: 1,
      bedNumber: 'Single Bed',
      timestamp: `${todayStr}T08:42:10.000Z`,
      date: todayStr,
      status: 'Verified',
      method: 'camera_scanner',
      notes: 'Breakfast meal verification check-in',
    },
    {
      id: 'CHK-5003',
      qrSessionId: 'QR-ATT-101',
      sessionTitle: 'Daily Hostel Attendance & Gate Entry',
      type: 'attendance',
      residentId: 'RES-102',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 1',
      timestamp: `${todayStr}T08:30:45.000Z`,
      date: todayStr,
      status: 'Present',
      method: 'camera_scanner',
    },
    {
      id: 'CHK-5004',
      qrSessionId: 'QR-FAC-201',
      sessionTitle: 'Hostel Mess & Dining Hall Service',
      type: 'facility',
      facilityName: 'Dining Hall (4 Meals / Day)',
      residentId: 'RES-102',
      residentName: 'Rohan Verma',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 1',
      timestamp: `${todayStr}T08:45:18.000Z`,
      date: todayStr,
      status: 'Verified',
      method: 'manual_code',
    },
    {
      id: 'CHK-5005',
      qrSessionId: 'QR-ATT-101',
      sessionTitle: 'Daily Hostel Attendance & Gate Entry',
      type: 'attendance',
      residentId: 'RES-103',
      residentName: 'Vikram Sen',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 2',
      timestamp: `${todayStr}T09:05:00.000Z`,
      date: todayStr,
      status: 'Present',
      method: 'camera_scanner',
    },
    {
      id: 'CHK-5006',
      qrSessionId: 'QR-FAC-202',
      sessionTitle: 'Library & Quiet Study Hall Access',
      type: 'facility',
      facilityName: 'Quiet Study Hall',
      residentId: 'RES-104',
      residentName: 'Neha Kulkarni',
      roomNumber: '201',
      floor: 2,
      bedNumber: 'Single Bed',
      timestamp: `${todayStr}T09:30:12.000Z`,
      date: todayStr,
      status: 'Verified',
      method: 'camera_scanner',
      notes: 'Desk check-in for study session',
    },
    {
      id: 'CHK-5007',
      qrSessionId: 'QR-FAC-203',
      sessionTitle: 'Fitness Gym & Workout Studio',
      type: 'facility',
      facilityName: 'Fitness Gym',
      residentId: 'RES-103',
      residentName: 'Vikram Sen',
      roomNumber: '103',
      floor: 1,
      bedNumber: 'Bed 2',
      timestamp: `${todayStr}T07:15:30.000Z`,
      date: todayStr,
      status: 'Verified',
      method: 'camera_scanner',
    },
  ];

  return {
    settings,
    users,
    rooms,
    residents,
    bills,
    payments,
    deposits,
    complaints,
    meals,
    notices,
    messages,
    cleaning,
    maintenance,
    checkInOuts,
    qrSessions,
    checkInRecords,
    registrations: [
      {
        id: 'REG-2026-01',
        fullName: 'Devendra Joshi',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        dob: '2002-04-12',
        gender: 'Male',
        mobile: '+91 98234 56789',
        email: 'devendra.joshi@example.com',
        emailVerified: true,
        emailVerifiedAt: '2026-09-09T10:15:00.000Z',
        address: 'B-14, Shanti Nagar, MG Road',
        city: 'Nagpur',
        state: 'Maharashtra',
        pinCode: '440010',
        emergencyContactName: 'Mahesh Joshi',
        emergencyContactNumber: '+91 98234 99881',
        emergencyRelationship: 'Father',
        workOrCollege: 'Infosys BPM',
        designation: 'Process Associate',
        whatTheyDo: 'Working Professional',
        passwordHash: 'Pass@2026#Secure',
        status: 'Waiting for Owner Approval',
        createdAt: '2026-09-09T10:18:00.000Z',
      },
    ],
    emailOTPs: [],
    termsAcceptances: [
      {
        id: 'TA-001',
        userId: 'usr-admin',
        username: 'admin',
        userName: 'Hostel Administration',
        userRole: 'admin',
        version: 'v2.0-2026',
        termsVersion: 'v2.0-2026',
        acceptedAt: '2026-01-01T09:00:00.000Z',
        acceptedDate: '2026-01-01',
        acceptedTime: '09:00:00 AM',
        deviceInfo: 'Hostel Terminal Desktop (Owner System)',
        deviceBrowser: 'Hostel Terminal Desktop (Owner System)',
        ipAddress: '127.0.0.1',
      },
      {
        id: 'TA-002',
        userId: 'usr-aarav',
        username: 'aarav',
        residentId: 'RES-101',
        userName: 'Aarav Patel',
        userRole: 'resident',
        version: 'v2.0-2026',
        termsVersion: 'v2.0-2026',
        acceptedAt: '2026-01-02T10:15:30.000Z',
        acceptedDate: '2026-01-02',
        acceptedTime: '10:15:30 AM',
        deviceInfo: 'Mobile Chrome (Android 14)',
        deviceBrowser: 'Mozilla/5.0 (Linux; Android 14)',
        ipAddress: '192.168.1.102',
      },
    ],
    termsConfig: {
      version: 'v2.0-2026',
      title: 'Official Hostel Terms & Conditions',
      rules: [...OFFICIAL_TERMS_RULES],
      holidays: [...OFFICIAL_HOSTEL_HOLIDAYS],
      holidayNotice: 'During these holidays, the mess will remain closed and no food will be provided by the hostel.',
      updatedAt: '2026-09-10T12:00:00.000Z',
      updatedBy: 'Hostel Administration',
    },
    visitors: [
      {
        id: 'VIS-101',
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        roomNumber: '101',
        floor: 1,
        bedNumber: 'Bed 1',
        visitorName: 'Ramesh Patel',
        visitorMobile: '+91 98450 88771',
        relationship: 'Uncle',
        gender: 'Male',
        address: 'MG Road, Pune, Maharashtra',
        idType: 'Aadhaar Card',
        idNumber: '8877-4411-2299',
        visitDate: '2026-09-10',
        expectedArrivalTime: '11:00 AM',
        expectedDepartureTime: '03:00 PM',
        purpose: 'Family visit & dropping books',
        status: 'Approved',
        createdAt: '2026-09-09T14:30:00.000Z',
        reviewedBy: 'Rajesh Sharma (Owner)',
        reviewedAt: '2026-09-09T16:00:00.000Z',
      },
      {
        id: 'VIS-102',
        residentId: 'RES-103A',
        residentName: 'Rohan Verma',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 1',
        visitorName: 'Amit Saxena',
        visitorMobile: '+91 97110 33221',
        relationship: 'Friend / College Mate',
        gender: 'Male',
        address: 'Salt Lake, Kolkata, West Bengal',
        idType: 'Aadhaar Card',
        idNumber: '3322-9988-1122',
        visitDate: '2026-09-11',
        expectedArrivalTime: '02:00 PM',
        expectedDepartureTime: '06:00 PM',
        purpose: 'Group study & project submission discussion',
        status: 'Waiting for Approval',
        createdAt: '2026-09-10T04:15:00.000Z',
      },
      {
        id: 'VIS-103',
        residentId: 'RES-103B',
        residentName: 'Vikram Sen',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 2',
        visitorName: 'Kunal Roy',
        visitorMobile: '+91 99201 55443',
        relationship: 'Cousin',
        gender: 'Male',
        address: 'Whitefield, Bangalore',
        idType: 'Driving License',
        idNumber: 'KA-04-2022-009182',
        visitDate: '2026-09-09',
        expectedArrivalTime: '10:00 AM',
        expectedDepartureTime: '01:00 PM',
        purpose: 'Personal meet',
        status: 'Checked Out',
        createdAt: '2026-09-08T18:00:00.000Z',
        reviewedBy: 'Rajesh Sharma (Owner)',
        reviewedAt: '2026-09-08T19:00:00.000Z',
        checkInTime: '2026-09-09T10:05:00.000Z',
        checkOutTime: '2026-09-09T12:50:00.000Z',
        checkedInBy: 'Reception Desk',
        checkedOutBy: 'Reception Desk',
      },
    ],
    presenceSessions: [
      {
        id: 'SES-1001',
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        roomNumber: '101',
        floor: 1,
        bedNumber: 'Bed 1',
        status: 'IN',
        entryTime: '2026-09-10T09:25:00.000Z',
        date: '2026-09-10',
        createdAt: '2026-09-10T09:25:00.000Z',
      },
      {
        id: 'SES-1002',
        residentId: 'RES-103A',
        residentName: 'Rohan Verma',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 1',
        status: 'OUT',
        exitTime: '2026-09-10T11:40:00.000Z',
        date: '2026-09-10',
        createdAt: '2026-09-10T11:40:00.000Z',
      },
      {
        id: 'SES-1003',
        residentId: 'RES-103B',
        residentName: 'Vikram Sen',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 2',
        status: 'IN',
        entryTime: '2026-09-10T08:30:00.000Z',
        date: '2026-09-10',
        createdAt: '2026-09-10T08:30:00.000Z',
      },
      {
        id: 'SES-998',
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        roomNumber: '101',
        floor: 1,
        bedNumber: 'Bed 1',
        status: 'OUT',
        entryTime: '2026-09-09T08:00:00.000Z',
        exitTime: '2026-09-09T18:30:00.000Z',
        durationMinutes: 630,
        date: '2026-09-09',
        createdAt: '2026-09-09T08:00:00.000Z',
      },
    ],
    residentPresence: [
      {
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        roomNumber: '101',
        floor: 1,
        bedNumber: 'Bed 1',
        status: 'IN',
        since: '2026-09-10T09:25:00.000Z',
        currentSessionId: 'SES-1001',
        updatedAt: '2026-09-10T09:25:00.000Z',
      },
      {
        residentId: 'RES-103A',
        residentName: 'Rohan Verma',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 1',
        status: 'OUT',
        since: '2026-09-10T11:40:00.000Z',
        currentSessionId: 'SES-1002',
        updatedAt: '2026-09-10T11:40:00.000Z',
      },
      {
        residentId: 'RES-103B',
        residentName: 'Vikram Sen',
        roomNumber: '103',
        floor: 1,
        bedNumber: 'Bed 2',
        status: 'IN',
        since: '2026-09-10T08:30:00.000Z',
        currentSessionId: 'SES-1003',
        updatedAt: '2026-09-10T08:30:00.000Z',
      },
    ],
    rentConfirmations: [
      {
        id: 'RPC-101',
        billId: 'INV-1001',
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        roomNumber: '101',
        floor: 1,
        billingMonth: 'September 2026',
        monthlyRent: 9000,
        submittedAt: '2026-09-03T11:30:00.000Z',
        paymentMethod: 'UPI',
        transactionReference: 'UPI/20260903/89201948',
        residentNotes: 'Paid via Google Pay directly to hostel QR',
        status: 'Paid',
        reviewedBy: 'Rajesh Sharma (Owner)',
        reviewedAt: '2026-09-03T14:10:00.000Z',
        approvedPaymentId: 'PAY-2001',
        isLocked: true,
      },
      {
        id: 'RPC-102',
        billId: 'INV-1002',
        residentId: 'RES-103A',
        residentName: 'Rohan Verma',
        roomNumber: '103',
        floor: 1,
        billingMonth: 'September 2026',
        monthlyRent: 6500,
        submittedAt: '2026-09-09T18:00:00.000Z',
        paymentMethod: 'Cash',
        residentNotes: 'Handed over cash at office counter to Warden',
        status: 'Payment Confirmation Pending',
        isLocked: false,
      },
    ],
    paymentCorrections: [],
    inventory: [
      {
        id: 'INV-ITEM-1',
        name: 'Ceiling Fan (High Speed 1200mm)',
        category: 'Electrical',
        totalQuantity: 25,
        availableQuantity: 4,
        assignedQuantity: 21,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-11-10',
        purchaseCost: 1850,
        currentCondition: 'Good',
        location: 'Rooms & Storage Room Floor 1',
        notes: 'Crompton 5-star energy efficient fans in all 21 rooms',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-11-10T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-2',
        name: 'Single Bed Frame with Underbed Storage',
        category: 'Furniture',
        totalQuantity: 25,
        availableQuantity: 4,
        assignedQuantity: 21,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-10-15',
        purchaseCost: 6500,
        currentCondition: 'Excellent',
        location: 'All Rooms',
        notes: 'Hardwood finish with hydraulic storage box',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-10-15T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-3',
        name: 'Orthopaedic Foam Mattress (36x75)',
        category: 'Bedding',
        totalQuantity: 30,
        availableQuantity: 6,
        assignedQuantity: 24,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-10-20',
        purchaseCost: 3200,
        currentCondition: 'Excellent',
        location: 'Rooms & Backup linen room',
        notes: '6-inch high-density bonded foam with anti-dustmite cover',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-10-20T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-4',
        name: 'Ergonomic Mesh Study Chair',
        category: 'Furniture',
        totalQuantity: 25,
        availableQuantity: 4,
        assignedQuantity: 21,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-11-01',
        purchaseCost: 2800,
        currentCondition: 'Good',
        location: 'Resident study desks',
        notes: 'Adjustable height and lumbar support',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-11-01T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-5',
        name: 'Study Desk with Bookshelf',
        category: 'Furniture',
        totalQuantity: 25,
        availableQuantity: 4,
        assignedQuantity: 21,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-10-15',
        purchaseCost: 4500,
        currentCondition: 'Good',
        location: 'All Rooms',
        notes: 'Laminated water-resistant surface',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-10-15T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-6',
        name: 'LED Batten Tube Light (20W Cool White)',
        category: 'Electrical',
        totalQuantity: 50,
        availableQuantity: 7,
        assignedQuantity: 41,
        damagedQuantity: 2,
        lostQuantity: 0,
        purchaseDate: '2025-11-15',
        purchaseCost: 320,
        currentCondition: 'Good',
        location: 'Rooms & Corridors',
        notes: 'Philips LED battens',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-11-15T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-7',
        name: 'Bathroom Bucket & Mug Plastic Set',
        category: 'Sanitary',
        totalQuantity: 25,
        availableQuantity: 4,
        assignedQuantity: 21,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-11-20',
        purchaseCost: 350,
        currentCondition: 'Good',
        location: 'Attached Bathrooms',
        notes: 'Heavy-duty 20L bucket with 1L mug',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-11-20T00:00:00.000Z',
      },
      {
        id: 'INV-ITEM-8',
        name: 'Modular Switchboard (Anchor 8-Module)',
        category: 'Electrical',
        totalQuantity: 48,
        availableQuantity: 6,
        assignedQuantity: 42,
        damagedQuantity: 0,
        lostQuantity: 0,
        purchaseDate: '2025-10-05',
        purchaseCost: 580,
        currentCondition: 'Good',
        location: 'Rooms & Living lounges',
        notes: 'Anchor Roma modular switch plates with surge protection',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2025-10-05T00:00:00.000Z',
      },
    ],
    inventoryLogs: [
      {
        id: 'INVL-01',
        itemId: 'INV-ITEM-1',
        itemName: 'Ceiling Fan (High Speed 1200mm)',
        action: 'Assigned to Room',
        quantity: 21,
        performedBy: 'Rajesh Sharma (Owner)',
        date: '2026-01-01',
        notes: 'Installed across all 21 rooms on floors 1, 2, and 3',
      },
    ],
    damageRecords: [
      {
        id: 'DMG-101',
        residentId: 'RES-103A',
        residentName: 'Rohan Verma',
        roomNumber: '103',
        floor: 1,
        item: 'Ceiling Fan Regulator',
        type: 'Damage',
        description: 'Knob cracked during movement',
        date: '2026-08-28',
        estimatedCost: 250,
        finalCost: 250,
        status: 'Repaired',
        recoveryChargeApproved: false,
        reportedBy: 'Floor 1 Housekeeping Staff',
        notes: 'Repaired by hostel maintenance under regular upkeep without charging resident',
        createdAt: '2026-08-28T10:00:00.000Z',
      },
    ],
    roomChanges: [
      {
        id: 'RC-101',
        residentId: 'RES-101',
        residentName: 'Aarav Patel',
        previousFloor: 1,
        previousRoom: '102',
        previousBed: 'Bed 1',
        newFloor: 1,
        newRoom: '101',
        newBed: 'Bed 1',
        changeDate: '2026-03-01',
        changeTime: '10:00 AM',
        changedBy: 'Rajesh Sharma (Owner)',
        reason: 'Resident requested upgrade to single private room for professional work focus',
        createdAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    activityLogs: [
      {
        id: 'ACT-101',
        performedBy: 'Rajesh Sharma (Owner)',
        action: 'Resident Approved & Room Allocated',
        affectedRecord: 'Resident Aarav Patel (RES-101) -> Room 101, Bed 1',
        date: '2026-02-01',
        exactTime: '09:00 AM',
        previousValue: 'Status: Waiting for Owner Approval',
        newValue: 'Status: Active, Room 101 (Single, ₹9,000/mo)',
        createdAt: '2026-02-01T09:00:00.000Z',
      },
      {
        id: 'ACT-102',
        performedBy: 'Rajesh Sharma (Owner)',
        action: 'Rent Payment Approved (Immutable)',
        affectedRecord: 'Payment PAY-2001 (Aarav Patel, Sep 2026, ₹9,000)',
        date: '2026-09-03',
        exactTime: '02:10 PM',
        previousValue: 'Status: Payment Confirmation Pending',
        newValue: 'Status: Paid (Locked)',
        createdAt: '2026-09-03T14:10:00.000Z',
      },
      {
        id: 'ACT-103',
        performedBy: 'Rajesh Sharma (Owner)',
        action: 'Visitor Approved',
        affectedRecord: 'Visitor Ramesh Patel for Resident Aarav Patel',
        date: '2026-09-09',
        exactTime: '04:00 PM',
        previousValue: 'Status: Waiting for Approval',
        newValue: 'Status: Approved',
        createdAt: '2026-09-09T16:00:00.000Z',
      },
    ],
    checkoutSettlements: [],
    emergencyAlerts: [],
  };
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  const ensureArrays = (db: DatabaseSchema) => {
    if (!db.qrSessions) db.qrSessions = [];
    if (!db.checkInRecords) db.checkInRecords = [];
    if (!db.registrations) db.registrations = [];
    if (!db.emailOTPs) db.emailOTPs = [];
    if (!db.termsAcceptances) db.termsAcceptances = [];
    if (!db.termsConfig || !db.termsConfig.rules || db.termsConfig.rules.length !== 23) {
      db.termsConfig = {
        version: 'v2.0-2026',
        title: 'Official Hostel Terms & Conditions',
        rules: [...OFFICIAL_TERMS_RULES],
        holidays: [...OFFICIAL_HOSTEL_HOLIDAYS],
        holidayNotice: 'During these holidays, the mess will remain closed and no food will be provided by the hostel.',
        updatedAt: '2026-09-10T12:00:00.000Z',
        updatedBy: 'Hostel Administration',
      };
    }
    if (!db.visitors) db.visitors = [];
    if (!db.presenceSessions) db.presenceSessions = [];
    if (!db.residentPresence) db.residentPresence = [];
    if (!db.rentConfirmations) db.rentConfirmations = [];
    if (!db.paymentCorrections) db.paymentCorrections = [];
    if (!db.inventory) db.inventory = [];
    if (!db.inventoryLogs) db.inventoryLogs = [];
    if (!db.damageRecords) db.damageRecords = [];
    if (!db.roomChanges) db.roomChanges = [];
    if (!db.activityLogs) db.activityLogs = [];
    if (!db.checkoutSettlements) db.checkoutSettlements = [];
    if (!db.emergencyAlerts) db.emergencyAlerts = [];
  };

  if (cachedDb) {
    ensureArrays(cachedDb);
    return cachedDb;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw);
      ensureArrays(cachedDb!);
      return cachedDb!;
    }
  } catch (err) {
    console.warn('Failed to read db.json from disk, initializing fresh state:', err);
  }

  const initial = generateInitialData();
  cachedDb = initial;
  ensureArrays(cachedDb);
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist initial db.json to disk, using in-memory store:', err);
  }
  return cachedDb;
}

export function saveDb(data: DatabaseSchema): void {
  cachedDb = data;
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist db.json to disk, maintaining in-memory state:', err);
  }
}
