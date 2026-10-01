import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type {
  Resident,
  Room,
  Bill,
  Payment,
  SecurityDepositRecord,
  Complaint,
  MealMenu,
  Notice,
  CleaningRecord,
} from '../../types';
import {
  Building2,
  User,
  CreditCard,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
  Wifi,
  Megaphone,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  Shield,
  FileText,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BedDouble,
  ShieldCheck,
  Receipt,
  Layers,
  MessageSquare,
  Copy,
  Check,
  Tv,
  Zap,
  Droplet,
  Flame,
  Shirt,
  Camera,
  LogOut,
  Send,
  Coffee,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { InvoiceModal } from '../../components/InvoiceModal';
import { TermsModal } from '../../components/TermsModal';

export const ResidentDashboard: React.FC = () => {
  const { user, settings, logout } = useAuth();
  const navigate = useNavigate();

  const [resident, setResident] = useState<Resident | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [depositRecord, setDepositRecord] = useState<SecurityDepositRecord | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [meals, setMeals] = useState<MealMenu[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [cleaning, setCleaning] = useState<CleaningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Modals
  const [activeInvoiceBill, setActiveInvoiceBill] = useState<Bill | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false);
  const [showWeeklyMenu, setShowWeeklyMenu] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Pay Form
  const [payMethod, setPayMethod] = useState<'UPI' | 'Card' | 'Bank Transfer'>('UPI');
  const [payAmount, setPayAmount] = useState(0);

  // Complaint Form
  const [complaintForm, setComplaintForm] = useState({
    title: '',
    category: 'Electricity' as Complaint['category'],
    description: '',
    priority: 'Medium' as Complaint['priority'],
  });

  const loadResidentData = async () => {
    setLoading(true);
    try {
      const allResidents = await api.getResidents();
      let activeRes = allResidents.find((r) => r.userId === user?.id || (user?.residentId && r.id === user.residentId)) || allResidents[0];
      setResident(activeRes);

      if (activeRes) {
        const [rms, bls, pymts, deps, cmps, mls, nts, cln] = await Promise.all([
          api.getRooms(),
          api.getBills({ residentId: activeRes.id }),
          api.getPayments({ residentId: activeRes.id }),
          api.getDeposits(),
          api.getComplaints(),
          api.getMeals(),
          api.getNotices(),
          api.getCleaningRecords(),
        ]);

        const myRoom = rms.find((r) => r.roomNumber === activeRes.roomNumber) || null;
        const myBills = bls;
        const myPayments = pymts;
        const myDep = deps.find((d) => d.residentId === activeRes.id) || null;
        const myComplaints = cmps.filter((c) => c.residentId === activeRes.id);
        const myCleaning = cln.filter((c) => c.roomNumber === activeRes.roomNumber);

        // Filter notices targeted to all or resident's floor/room
        const myNotices = nts.filter((n) => {
          if (n.targetAudience === 'All Residents') return true;
          if (n.targetAudience === 'Specific Floor' && n.targetFloor === activeRes.floor) return true;
          if (n.targetAudience === 'Specific Room' && n.targetRoomNumber === activeRes.roomNumber) return true;
          return false;
        });

        setRoom(myRoom);
        setBills(myBills);
        setPayments(myPayments);
        setDepositRecord(myDep);
        setComplaints(myComplaints);
        setMeals(mls);
        setNotices(myNotices);
        setCleaning(myCleaning);

        const currentBill = myBills[0];
        if (currentBill) {
          setPayAmount(currentBill.remainingBalance > 0 ? currentBill.remainingBalance : currentBill.totalAmount);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidentData();
  }, [user]);

  const latestBill = bills[0];

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestBill) return;

    try {
      await api.recordPayment({
        billId: latestBill.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionReference: 'UPI/REF-' + Math.floor(10000000 + Math.random() * 90000000),
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Online resident rent payment via ${payMethod}`,
      });
      setIsPayModalOpen(false);
      await loadResidentData();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident) return;

    try {
      await api.createComplaint({
        residentId: resident.id,
        residentName: resident.fullName,
        roomNumber: resident.roomNumber,
        floor: resident.floor,
        category: complaintForm.category,
        title: complaintForm.title,
        description: complaintForm.description,
        priority: complaintForm.priority,
      });
      setIsNewComplaintOpen(false);
      setComplaintForm({
        title: '',
        category: 'Electricity',
        description: '',
        priority: 'Medium',
      });
      await loadResidentData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit complaint');
    }
  };

  const copyWifiPassword = () => {
    const pwd = settings?.wifiPassword || 'Greenfield@2026';
    navigator.clipboard.writeText(pwd);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold">Loading your resident account...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-800">No Resident Profile Linked</p>
        <p className="text-xs text-slate-500 mt-1">Please log in with your resident credentials or contact the hostel warden.</p>
      </div>
    );
  }

  // Find today's meal
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[new Date().getDay()];
  const todaysMeal = meals.find((m) => m.dayOfWeek === todayDayName) || meals[0];

  return (
    <div className="space-y-7 pb-16">
      {/* Top Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Resident Self-Service Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {resident.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Room <strong className="text-white font-black">{resident.roomNumber}</strong> • Bed{' '}
            <strong className="text-white font-black">{resident.bedNumber}</strong> • Floor {resident.floor} (
            {resident.roomType === 'single' ? 'Single Living Room' : 'Double Living Room'})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            type="button"
            onClick={() => navigate('/resident/qr-checkin')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Check-In</span>
          </button>

          {latestBill && latestBill.status !== 'Paid' && (
            <button
              type="button"
              id="pay-rent-quick-btn"
              onClick={() => setIsPayModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Rent (₹{latestBill.remainingBalance.toLocaleString('en-IN')})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNewComplaintOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Complaint</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: MY PROFILE & SECTION 2: MY ROOM & BED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: My Profile */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. My Profile & Emergency Contacts
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Active Resident
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resident Name</span>
              <p className="font-bold text-slate-900 text-sm">{resident.fullName}</p>
              <p className="text-[11px] text-slate-500">{resident.workOrCollege || 'Executive Professional'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone & Mobile</span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                {resident.mobile}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {resident.email}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admission / Check-In</span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {resident.joiningDate}
              </p>
              <p className="text-[11px] text-slate-500">ID: {resident.idType} ({resident.idNumber || 'Verified'})</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permanent Address</span>
              <p className="font-medium text-slate-800 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                {resident.permanentAddress || 'Registered city address on file with hostel management'}
              </p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Emergency Contact</span>
              <p className="font-bold text-slate-900">
                {resident.emergencyContactName} ({resident.emergencyRelationship || 'Guardian'})
              </p>
              <p className="font-bold text-rose-700">{resident.emergencyContactNumber}</p>
            </div>
          </div>
        </div>

        {/* Section 2: My Room & Bed */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-indigo-600" />
              2. My Room & Bed
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
              Floor {resident.floor}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Room Number:</span>
              <span className="font-extrabold text-slate-900 text-sm">Room {resident.roomNumber}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Bed Allocation:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60">
                {resident.bedNumber}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Room Type:</span>
              <span className="font-bold text-slate-900 uppercase">
                {resident.roomType === 'single' ? 'Single Living Room' : 'Double Sharing Room'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Room Amenities Included
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Ceiling Fan & Light</span>
                <span className="flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5 text-blue-500" /> Attached Washroom</span>
                <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> Hot Water Geyser</span>
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-500" /> Cupboard & Lock</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: MONTHLY RENT & SECTION 4: SECURITY DEPOSIT (EXPLICIT SEPARATION MANDATE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Monthly Rent */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                3. Monthly Room Rent
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current month room charges including 4 daily meals, electricity & water.
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {resident.roomType === 'single' ? '₹9,000 / month' : '₹6,500 / month'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-indigo-600">Standard Monthly Tariff</span>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                ₹{resident.monthlyRent.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-slate-500">/ person / month</span>
              </div>
            </div>

            {latestBill ? (
              <span
                className={`text-xs px-3 py-1 rounded-xl font-bold uppercase ${
                  latestBill.status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : latestBill.status === 'Overdue'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {latestBill.status}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold">No bill due</span>
            )}
          </div>

          {latestBill && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Billing Period:</span>
                <span className="font-bold text-slate-900">{latestBill.billingMonth}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Due Date:</span>
                <span className="font-bold text-rose-600">{latestBill.dueDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid So Far:</span>
                <span className="font-bold text-emerald-700">₹{latestBill.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900">Remaining Due Balance:</span>
                <span className="font-black text-rose-600 text-sm">
                  ₹{latestBill.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            {latestBill && (
              <button
                type="button"
                onClick={() => setActiveInvoiceBill(latestBill)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> View Current Invoice
              </button>
            )}

            {latestBill && latestBill.remainingBalance > 0 && (
              <button
                type="button"
                onClick={() => setIsPayModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-1.5 ml-auto"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay Remaining Rent
              </button>
            )}
          </div>
        </div>

        {/* Section 4: Security Deposit (Explicit Separation) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                4. Security Deposit (Caution Money)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Held separately in custody. Fully refundable upon vacation & checkout.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              100% Refundable
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-700">Security Deposit Kept in Trust</span>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                ₹{resident.securityDeposit.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({resident.roomType === 'single' ? 'Single Standard ₹4,500' : 'Double Standard ₹3,500'})
                </span>
              </div>
            </div>

            <span
              className={`text-xs px-3 py-1 rounded-xl font-bold uppercase ${
                resident.depositStatus === 'Paid' || resident.depositStatus === 'Held'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {depositRecord?.finalSettlementStatus || resident.depositStatus || 'Held in Custody'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Date Paid:</span>
              <span className="font-bold text-slate-900">
                {depositRecord?.datePaid || depositRecord?.depositDate || resident.joiningDate}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-900">{depositRecord?.paymentMethod || 'UPI'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Refundable Amount on Vacation:</span>
              <span className="font-bold text-emerald-700">
                ₹{(depositRecord?.refundableAmount ?? resident.securityDeposit).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Deductions (Damages/Arrears):</span>
              <span className="font-bold text-slate-500">
                ₹{(depositRecord?.deductionAmount || 0).toLocaleString('en-IN')}
                {depositRecord?.deductionReason ? ` (${depositRecord.deductionReason})` : ' (None)'}
              </span>
            </div>
          </div>

          {/* Explicit Notice Badge */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mandatory Accounting Separation:</strong> Security deposit is NOT counted as rent. It is caution money held during your residency and refunded upon vacation after key handover.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: CURRENT BILL & SECTION 6: PAYMENT HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 5: Current Bill */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              5. Current Bill Details
            </h2>
            <span className="text-[10px] text-slate-400 font-bold">INV #{latestBill?.id || 'N/A'}</span>
          </div>

          {latestBill ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">Billing Month:</span>
                <span className="font-bold text-slate-900">{latestBill.billingMonth}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">Base Room Rent:</span>
                <span className="font-bold text-slate-900">₹{latestBill.rentAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">Additional Charges / Electricity:</span>
                <span className="font-semibold text-slate-700">₹{latestBill.otherCharges || 0}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">Discount Applied:</span>
                <span className="font-semibold text-emerald-600">-₹{latestBill.discount || 0}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="font-bold text-indigo-950">Net Total Bill:</span>
                <span className="font-black text-indigo-950 text-sm">₹{latestBill.totalAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-500">Payment Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${latestBill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {latestBill.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No current bill issued.</p>
          )}
        </div>

        {/* Section 6: Payment History */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              6. Payment History & Receipts
            </h2>
            <span className="text-[11px] text-slate-400 font-bold">{payments.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Transaction ID / Ref</th>
                  <th className="pb-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-800">{p.paymentDate}</td>
                      <td className="py-2.5 font-bold text-slate-900">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                        {p.transactionReference}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const b = bills.find((x) => x.id === p.billId) || latestBill;
                            if (b) setActiveInvoiceBill(b);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No past payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 7: FOOD MENU & SECTION 8: HOSTEL FACILITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 7: Food Menu */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
              7. Food Menu (4 Meals / Day)
            </h2>
            <button
              type="button"
              onClick={() => setShowWeeklyMenu(!showWeeklyMenu)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
            >
              {showWeeklyMenu ? 'View Today Only' : 'View 7-Day Schedule'}
            </button>
          </div>

          {!showWeeklyMenu ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Today's Specials ({todayDayName})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  All 4 Meals Included
                </span>
              </div>

              {todaysMeal && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px] uppercase">
                      <Sun className="w-3.5 h-3.5 text-amber-600" /> Breakfast (7:30 - 9:30 AM)
                    </span>
                    <p className="text-slate-800 font-semibold">{todaysMeal.breakfast}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/60 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-indigo-800 text-[11px] uppercase">
                      <Coffee className="w-3.5 h-3.5 text-indigo-600" /> Lunch (12:30 - 2:30 PM)
                    </span>
                    <p className="text-slate-800 font-semibold">{todaysMeal.lunch}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-200/60 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-orange-800 text-[11px] uppercase">
                      <Sunset className="w-3.5 h-3.5 text-orange-600" /> Evening Snacks (5:00 - 6:30 PM)
                    </span>
                    <p className="text-slate-800 font-semibold">{todaysMeal.snacks}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-purple-800 text-[11px] uppercase">
                      <Moon className="w-3.5 h-3.5 text-purple-600" /> Dinner (8:00 - 10:00 PM)
                    </span>
                    <p className="text-slate-800 font-semibold">{todaysMeal.dinner}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {meals.map((m) => (
                <div key={m.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{m.dayOfWeek}</span>
                    {m.dayOfWeek === todayDayName && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white">Today</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong>B:</strong> {m.breakfast} • <strong>L:</strong> {m.lunch} • <strong>S:</strong> {m.snacks} • <strong>D:</strong> {m.dinner}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 8: Hostel Facilities */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              8. Hostel Facilities & Access
            </h2>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
              24/7 Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Wi-Fi */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-indigo-600" /> High-Speed Wi-Fi
                </span>
                <button
                  type="button"
                  onClick={copyWifiPassword}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                >
                  {copiedWifi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedWifi ? 'Copied!' : 'Copy Password'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                SSID: <strong className="text-slate-800">{settings?.wifiSsid || 'Hostel_HighSpeed_Fiber'}</strong>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                PWD: <span className="font-mono font-bold text-indigo-700">{settings?.wifiPassword || 'Greenfield@2026'}</span>
              </p>
            </div>

            {/* Power Backup */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> 24/7 Power Backup
              </span>
              <p className="text-[11px] text-slate-500">
                Heavy-duty DG set generator automatically powers room fans, lighting and Wi-Fi during grid outages.
              </p>
            </div>

            {/* RO Water */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-blue-500" /> RO Purified Water
              </span>
              <p className="text-[11px] text-slate-500">
                Multi-stage RO + UV water coolers available on all 3 floors with daily TDS monitoring.
              </p>
            </div>

            {/* Laundry & CCTV */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-emerald-500" /> Laundry & CCTV Security
              </span>
              <p className="text-[11px] text-slate-500">
                Automatic washing machines on terrace; 32 CCTV cameras monitoring corridors & gates 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 9 & 10: COMPLAINTS & MAINTENANCE STATUS */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              9 & 10. Complaints & Maintenance Status
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit repair requests for fan, lighting, plumbing, RO water, or cleaning, and monitor live status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewComplaintOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Lodge New Complaint
          </button>
        </div>

        {complaints.length > 0 ? (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold text-[10px]">
                      {c.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      c.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.priority} Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : c.status === 'In Progress'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-slate-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-slate-600 text-xs leading-relaxed">{c.description}</p>

                {c.adminResponse && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-950 space-y-0.5">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Management Response</span>
                    <p className="text-xs">{c.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs space-y-1">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700">No active complaints</p>
            <p>Everything in Room {resident.roomNumber} is in working order!</p>
          </div>
        )}
      </div>

      {/* SECTION 11: NOTICES & ANNOUNCEMENTS & SECTION 12: DIRECT CONTACT OWNER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 11: Notices */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-600" />
              11. Notices & Announcements
            </h2>
            <span className="text-[11px] text-slate-400 font-bold">{notices.length} Published</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {notices.length > 0 ? (
              notices.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                    n.isPinned ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{n.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No notices issued at this time.</p>
            )}
          </div>
        </div>

        {/* Section 12: Direct Message / Contact Owner */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              12. Direct Contact with Hostel Owner
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
              Rajesh Sharma
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Have an urgent matter or query regarding rent, deposit, or room facilities? Connect directly with the hostel management team:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href={`tel:${settings?.contactPhone || '+919845011223'}`}
                className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-indigo-600" />
                <span>Call Owner ({settings?.contactPhone || '+91 98450 11223'})</span>
              </a>

              <a
                href={`https://wa.me/${(settings?.contactPhone || '919845011223').replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Owner</span>
              </a>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p><strong>Management Office:</strong> Ground Floor, Reception Counter</p>
              <p><strong>Office Hours:</strong> 8:00 AM - 9:00 PM Daily • Emergency Warden 24/7 on Floor 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Official Hostel Terms & Conditions */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Official Hostel Terms &amp; Conditions
          </h3>
          <p className="text-xs text-slate-500">
            Review all 23 official hostel rules, penalty policies, and holiday schedules anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-2 border border-indigo-200 transition-colors shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>View All 23 Rules &amp; Holidays</span>
        </button>
      </div>

      {showTermsModal && (
        <TermsModal
          isOpen={true}
          isMandatory={false}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {/* SECTION 13: LOGOUT BUTTON */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
            <LogOut className="w-4 h-4 text-rose-600" />
            13. Resident Session & Logout
          </h3>
          <p className="text-xs text-slate-500">
            Finished reviewing your hostel account? Sign out securely to protect your room data.
          </p>
        </div>

        <button
          type="button"
          id="resident-dashboard-logout-btn"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          className="px-6 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Resident Dashboard</span>
        </button>
      </div>

      {/* MODAL: Pay Rent Online Simulation */}
      {isPayModalOpen && latestBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Pay Monthly Rent Online
              </h3>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Ref:</span>
                <span className="font-mono font-bold text-indigo-700">{latestBill.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Month:</span>
                <span className="font-semibold text-slate-800">{latestBill.billingMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-black text-slate-900">
                  ₹{latestBill.remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSimulatePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Card', 'Bank Transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        payMethod === m
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Amount to Pay (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-900/20"
                >
                  Confirm Payment (₹{Number(payAmount).toLocaleString('en-IN')})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Complaint */}
      {isNewComplaintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-600" />
                Submit Room Repair / Complaint
              </h3>
              <button
                type="button"
                onClick={() => setIsNewComplaintOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Category *</label>
                <select
                  value={complaintForm.category}
                  onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Fan">Fan issue</option>
                  <option value="Light">Light issue</option>
                  <option value="Plumbing">Tap / Plumbing issue</option>
                  <option value="RO water">RO water issue</option>
                  <option value="Cleaning">Cleaning request</option>
                  <option value="Wi-Fi">Wi-Fi issue</option>
                  <option value="Other">Other / General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Priority</label>
                <select
                  value={complaintForm.priority}
                  onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Low">Low (Within 2-3 days)</option>
                  <option value="Medium">Medium (Inspect within 24 hours)</option>
                  <option value="High">High (Same-day resolution)</option>
                  <option value="Urgent">Urgent (Immediate attention)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bathroom light flickering or tap leaking"
                  value={complaintForm.title}
                  onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Description & Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Describe what is wrong and best time for technician to inspect..."
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewComplaintOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal for Resident */}
      {activeInvoiceBill && (
        <InvoiceModal
          bill={activeInvoiceBill}
          settings={settings}
          onClose={() => setActiveInvoiceBill(null)}
        />
      )}
    </div>
  );
};
