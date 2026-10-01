import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Room, Resident, Bill, Payment, Complaint, MaintenanceRecord, CleaningRecord, CheckInOutRecord, HostelSettings } from '../../types';
import {
  BarChart3,
  Printer,
  Download,
  FileSpreadsheet,
  Building,
  DollarSign,
  Users,
  DoorOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Layers,
  Wrench,
  Sparkles,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('occupancy');
  const [data, setData] = useState<{
    rooms: Room[];
    residents: Resident[];
    bills: Bill[];
    payments: Payment[];
    complaints: Complaint[];
    maintenance: MaintenanceRecord[];
    cleaning: CleaningRecord[];
    checkouts: CheckInOutRecord[];
    settings: HostelSettings | null;
  }>({
    rooms: [],
    residents: [],
    bills: [],
    payments: [],
    complaints: [],
    maintenance: [],
    cleaning: [],
    checkouts: [],
    settings: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [rms, res, bls, pmts, cmps, maint, clean, st] = await Promise.all([
          api.getRooms(),
          api.getResidents(),
          api.getBills(),
          api.getPayments(),
          api.getComplaints(),
          api.getMaintenanceRecords(),
          api.getCleaningRecords(),
          api.getSettings(),
        ]);
        setData({
          rooms: rms,
          residents: res,
          bills: bls,
          payments: pmts,
          complaints: cmps,
          maintenance: maint,
          cleaning: clean,
          checkouts: [],
          settings: st,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'occupancy' || reportType === 'room_availability') {
      csvContent += 'Room Number,Floor,Type,Capacity,Occupied Beds,Available Beds,Rent Per Person,Status\n';
      data.rooms.forEach((r) => {
        const occ = r.beds.filter((b) => b.isOccupied).length;
        csvContent += `"${r.roomNumber}","${r.floor}","${r.type}","${r.capacity}","${occ}","${r.capacity - occ}","${r.rentPerPerson}","${r.status}"\n`;
      });
    } else if (reportType === 'residents') {
      csvContent += 'Resident ID,Name,Phone,Email,Room,Bed,Floor,Room Type,Rent,Deposit,Status,Joined\n';
      data.residents.forEach((r) => {
        csvContent += `"${r.id}","${r.fullName}","${r.phone}","${r.email}","${r.roomNumber}","${r.bedNumber}","${r.floor}","${r.roomType}","${r.monthlyRent}","${r.securityDeposit}","${r.status}","${r.joiningDate}"\n`;
      });
    } else if (reportType === 'rent_collection' || reportType === 'pending_rent' || reportType === 'overdue') {
      csvContent += 'Invoice ID,Resident,Room,Floor,Month,Billed,Paid,Balance,Status,DueDate\n';
      data.bills.forEach((b) => {
        csvContent += `"${b.id}","${b.residentName}","${b.roomNumber}","${b.floor}","${b.billingMonth}","${b.totalAmount}","${b.amountPaid}","${b.remainingBalance}","${b.status}","${b.dueDate}"\n`;
      });
    } else {
      csvContent += 'Item ID,Title / Description,Reference,Amount / Value,Status,Date\n';
      data.complaints.forEach((c) => {
        csvContent += `"${c.id}","${c.title}","Room ${c.roomNumber}","${c.priority}","${c.status}","${c.createdAt}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hostel_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportOptions = [
    { id: 'occupancy', label: '1. Occupancy Report' },
    { id: 'room_availability', label: '2. Room Availability Report' },
    { id: 'residents', label: '3. Resident Directory' },
    { id: 'rent_collection', label: '4. Monthly Rent Collection Report' },
    { id: 'pending_rent', label: '5. Pending Rent Report' },
    { id: 'overdue', label: '6. Overdue Payments Report' },
    { id: 'payment_methods', label: '7. Cash vs Online Payment Split' },
    { id: 'maintenance_costs', label: '8. Maintenance Cost Report' },
    { id: 'complaint_analytics', label: '9. Complaint Resolution Report' },
    { id: 'floor_revenue', label: '10. Floor-Wise Revenue Report' },
    { id: 'security_deposits', label: '11. Security Deposit Balance Report' },
    { id: 'checkin_checkout', label: '12. Check-in / Checkout History' },
    { id: 'cleaning_compliance', label: '13. Cleaning Compliance Report' },
  ];

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Executive Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access 13 comprehensive operational, inventory, financial, and compliance reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Select Management Report Type (13 Modules)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all ${
                reportType === opt.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 print:border-none print:shadow-none print:p-0">
        {/* Printable Header */}
        <div className="border-b border-slate-200 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {data.settings?.hostelName || 'Greenfield Executive Residency'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {reportOptions.find((r) => r.id === reportType)?.label}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Date Generated: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-IN')}</span></div>
              <div className="font-mono text-[11px]">System Generated</div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Based on Report Type */}

        {/* 1 & 2: Occupancy & Room Availability */}
        {(reportType === 'occupancy' || reportType === 'room_availability') && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400">Total Rooms:</span> <b className="text-slate-900">{data.rooms.length}</b>
              </div>
              <div>
                <span className="text-slate-400">Total Beds:</span>{' '}
                <b className="text-slate-900">{data.rooms.reduce((acc, r) => acc + r.capacity, 0)}</b>
              </div>
              <div>
                <span className="text-slate-400">Occupied Beds:</span>{' '}
                <b className="text-indigo-600">
                  {data.rooms.reduce((acc, r) => acc + r.beds.filter((b) => b.isOccupied).length, 0)}
                </b>
              </div>
              <div>
                <span className="text-slate-400">Available Beds:</span>{' '}
                <b className="text-emerald-600">
                  {data.rooms.reduce((acc, r) => acc + (r.capacity - r.beds.filter((b) => b.isOccupied).length), 0)}
                </b>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5">Room</th>
                  <th className="py-2.5">Floor</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Capacity</th>
                  <th className="py-2.5">Occupied</th>
                  <th className="py-2.5">Available</th>
                  <th className="py-2.5">Rent / Person</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rooms.map((r) => {
                  const occ = r.beds.filter((b) => b.isOccupied).length;
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 font-bold text-slate-900">Room {r.roomNumber}</td>
                      <td className="py-2.5">Floor {r.floor}</td>
                      <td className="py-2.5 capitalize">{r.type}</td>
                      <td className="py-2.5">{r.capacity}</td>
                      <td className="py-2.5 font-semibold text-slate-800">{occ}</td>
                      <td className="py-2.5 font-semibold text-emerald-600">{r.capacity - occ}</td>
                      <td className="py-2.5 font-medium">₹{r.rentPerPerson.toLocaleString('en-IN')}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3: Resident Directory */}
        {reportType === 'residents' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Resident</th>
                <th className="py-2.5">Room / Bed</th>
                <th className="py-2.5">Phone</th>
                <th className="py-2.5">Email</th>
                <th className="py-2.5">Rent / Mo</th>
                <th className="py-2.5">Deposit</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.residents.map((res) => (
                <tr key={res.id}>
                  <td className="py-2.5 font-bold text-slate-900">{res.fullName}</td>
                  <td className="py-2.5">Room {res.roomNumber} ({res.bedNumber})</td>
                  <td className="py-2.5">{res.phone}</td>
                  <td className="py-2.5">{res.email}</td>
                  <td className="py-2.5 font-semibold">₹{res.monthlyRent.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 font-semibold">₹{res.securityDeposit.toLocaleString('en-IN')}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 4, 5, 6: Rent Collection, Pending, Overdue */}
        {(reportType === 'rent_collection' || reportType === 'pending_rent' || reportType === 'overdue') && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Invoice #</th>
                <th className="py-2.5">Resident</th>
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Month</th>
                <th className="py-2.5">Billed (₹)</th>
                <th className="py-2.5">Paid (₹)</th>
                <th className="py-2.5">Balance (₹)</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.bills
                .filter((b) => {
                  if (reportType === 'pending_rent') return b.status === 'Pending' || b.status === 'Partially Paid';
                  if (reportType === 'overdue') return b.status === 'Overdue';
                  return true;
                })
                .map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 font-mono font-bold text-indigo-700">{b.id}</td>
                    <td className="py-2.5 font-bold text-slate-900">{b.residentName}</td>
                    <td className="py-2.5">Room {b.roomNumber}</td>
                    <td className="py-2.5">{b.billingMonth}</td>
                    <td className="py-2.5 font-semibold">₹{b.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 font-semibold text-emerald-600">₹{b.amountPaid.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 font-semibold text-rose-600">₹{b.remainingBalance.toLocaleString('en-IN')}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* 7: Payment Methods Split */}
        {reportType === 'payment_methods' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400">Total Payments:</span>{' '}
                <b className="text-slate-900">{data.payments.length}</b>
              </div>
              <div>
                <span className="text-slate-400">Online UPI / Bank:</span>{' '}
                <b className="text-indigo-600">
                  {data.payments.filter((p) => p.paymentMethod === 'UPI' || p.paymentMethod === 'Bank Transfer').length}
                </b>
              </div>
              <div>
                <span className="text-slate-400">Cash Collections:</span>{' '}
                <b className="text-emerald-600">
                  {data.payments.filter((p) => p.paymentMethod === 'Cash').length}
                </b>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5">Payment ID</th>
                  <th className="py-2.5">Resident</th>
                  <th className="py-2.5">Room</th>
                  <th className="py-2.5">Method</th>
                  <th className="py-2.5">Ref No</th>
                  <th className="py-2.5">Amount (₹)</th>
                  <th className="py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-mono text-indigo-700">{p.id}</td>
                    <td className="py-2.5 font-bold text-slate-900">{p.residentName}</td>
                    <td className="py-2.5">Room {p.roomNumber}</td>
                    <td className="py-2.5 font-semibold">{p.paymentMethod}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-500">{p.transactionReference}</td>
                    <td className="py-2.5 font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-slate-500">{p.paymentDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8: Maintenance Costs */}
        {reportType === 'maintenance_costs' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Work Order</th>
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Issue Type</th>
                <th className="py-2.5">Estimated Cost</th>
                <th className="py-2.5">Actual Cost</th>
                <th className="py-2.5">Contractor</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.maintenance.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 font-mono font-bold text-indigo-700">{m.id}</td>
                  <td className="py-2.5 font-bold">Room {m.roomNumber}</td>
                  <td className="py-2.5">{m.issueType}</td>
                  <td className="py-2.5">₹{m.estimatedCost.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 font-bold text-slate-900">₹{(m.actualCost || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5">{m.contractorName}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 9: Complaint Resolution */}
        {reportType === 'complaint_analytics' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Ticket</th>
                <th className="py-2.5">Resident</th>
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Title</th>
                <th className="py-2.5">Priority</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.complaints.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-mono font-bold text-indigo-700">{c.id}</td>
                  <td className="py-2.5 font-bold text-slate-900">{c.residentName}</td>
                  <td className="py-2.5">Room {c.roomNumber}</td>
                  <td className="py-2.5">{c.category}</td>
                  <td className="py-2.5 font-medium">{c.title}</td>
                  <td className="py-2.5 font-semibold">{c.priority}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 10: Floor Revenue */}
        {reportType === 'floor_revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((fl) => {
                const flBills = data.bills.filter((b) => b.floor === fl);
                const revenue = flBills.reduce((acc, b) => acc + b.amountPaid, 0);
                const billed = flBills.reduce((acc, b) => acc + b.totalAmount, 0);
                return (
                  <div key={fl} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-bold text-slate-900">FLOOR {fl} (7 Rooms)</span>
                    <div className="mt-2 text-slate-600">Billed: ₹{billed.toLocaleString('en-IN')}</div>
                    <div className="font-bold text-emerald-600 text-sm mt-0.5">Collected: ₹{revenue.toLocaleString('en-IN')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 11: Security Deposits */}
        {reportType === 'security_deposits' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Resident</th>
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Deposit Held</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.residents.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-bold text-slate-900">{r.fullName}</td>
                  <td className="py-2.5">Room {r.roomNumber}</td>
                  <td className="py-2.5 font-bold text-indigo-700">₹{r.securityDeposit.toLocaleString('en-IN')}</td>
                  <td className="py-2.5">{r.securityDepositStatus}</td>
                  <td className="py-2.5">{r.joiningDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 12: Check-in / Checkout History */}
        {reportType === 'checkin_checkout' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Resident</th>
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Check-in Date</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5">Deposit Settled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.residents.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 font-bold text-slate-900">{r.fullName}</td>
                  <td className="py-2.5">Room {r.roomNumber} ({r.bedNumber})</td>
                  <td className="py-2.5">{r.joiningDate}</td>
                  <td className="py-2.5 font-semibold text-emerald-600">{r.status}</td>
                  <td className="py-2.5">₹{r.securityDeposit.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 13: Cleaning Compliance */}
        {reportType === 'cleaning_compliance' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5">Room</th>
                <th className="py-2.5">Sanitization Task</th>
                <th className="py-2.5">Scheduled Date</th>
                <th className="py-2.5">Staff Assigned</th>
                <th className="py-2.5">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.cleaning.map((c) => (
                <tr key={c.id}>
                  <td className="py-2.5 font-bold text-slate-900">Room {c.roomNumber}</td>
                  <td className="py-2.5">{c.cleaningType}</td>
                  <td className="py-2.5">{c.scheduledDate}</td>
                  <td className="py-2.5">{c.cleanerName}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
