import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { HostelSettings, TermsConfig, TermsAcceptanceRecord } from '../../types';
import {
  OFFICIAL_TERMS_RULES,
  OFFICIAL_HOSTEL_HOLIDAYS,
  HOSTEL_HOLIDAY_NOTICE,
} from '../../lib/termsData';
import {
  Settings,
  DollarSign,
  Building,
  Calendar,
  History,
  Save,
  CheckCircle,
  Wifi,
  Shield,
  UtensilsCrossed,
  Sparkles,
  FileText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, refreshSettings } = useAuth();
  const [activeSection, setActiveSection] = useState<'pricing' | 'terms'>('pricing');

  // Pricing & Profile state
  const [form, setForm] = useState({
    hostelName: '',
    address: '',
    phone: '',
    email: '',
    wifiSsid: '',
    wifiPassword: '',
    singleRent: 9000,
    doubleRent: 6500,
    defaultSecurityDepositSingle: 4500,
    defaultSecurityDepositDouble: 3500,
    rentEffectiveDate: new Date().toISOString().split('T')[0],
    rentChangeNote: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Terms & Conditions state
  const [termsConfig, setTermsConfig] = useState<TermsConfig | null>(null);
  const [acceptanceRecords, setAcceptanceRecords] = useState<TermsAcceptanceRecord[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('v2.1-2026');
  const [publishing, setPublishing] = useState(false);
  const [termsSearch, setTermsSearch] = useState('');
  const [versionFilter, setVersionFilter] = useState('all');
  const [termsSuccessMsg, setTermsSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        hostelName: settings.hostelName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        wifiSsid: settings.wifiSsid || '',
        wifiPassword: settings.wifiPassword,
        singleRent: settings.singleRent,
        doubleRent: settings.doubleRent,
        defaultSecurityDepositSingle: settings.defaultSecurityDepositSingle ?? 4500,
        defaultSecurityDepositDouble: settings.defaultSecurityDepositDouble ?? 3500,
        rentEffectiveDate: settings.rentEffectiveDate,
        rentChangeNote: '',
      });
    }
  }, [settings]);

  const fetchTermsData = async () => {
    setLoadingTerms(true);
    try {
      const [cfg, recs] = await Promise.all([
        api.getTermsCurrent(),
        api.getTermsRecords(),
      ]);
      setTermsConfig(cfg);
      setAcceptanceRecords(recs.records || []);
      if (cfg?.version) {
        // Suggest next minor version e.g. v2.0-2026 -> v2.1-2026
        const match = cfg.version.match(/v?(\d+)\.(\d+)/);
        if (match) {
          const major = match[1];
          const minor = parseInt(match[2], 10) + 1;
          setNewVersion(`v${major}.${minor}-2026`);
        } else {
          setNewVersion(`${cfg.version}-updated`);
        }
      }
    } catch (err: any) {
      console.error('Failed to load terms data:', err);
    } finally {
      setLoadingTerms(false);
    }
  };

  useEffect(() => {
    fetchTermsData();
  }, []);

  const handleSubmitPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await api.updateSettings({
        hostelName: form.hostelName,
        address: form.address,
        phone: form.phone,
        email: form.email,
        wifiSsid: form.wifiSsid,
        wifiPassword: form.wifiPassword,
        singleRent: Number(form.singleRent),
        doubleRent: Number(form.doubleRent),
        defaultSecurityDepositSingle: Number(form.defaultSecurityDepositSingle),
        defaultSecurityDepositDouble: Number(form.defaultSecurityDepositDouble),
        rentEffectiveDate: form.rentEffectiveDate,
        rentChangeNote: form.rentChangeNote || 'Annual accommodation tariff update',
      });
      await refreshSettings();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;

    setPublishing(true);
    try {
      const res = await api.publishTerms({
        version: newVersion.trim(),
        rules: termsConfig?.rules || OFFICIAL_TERMS_RULES,
        holidays: termsConfig?.holidays || OFFICIAL_HOSTEL_HOLIDAYS,
        holidayNotice: termsConfig?.holidayNotice || HOSTEL_HOLIDAY_NOTICE,
      });
      setTermsConfig(res.termsConfig);
      setIsPublishModalOpen(false);
      setTermsSuccessMsg(
        `Terms & Conditions version ${newVersion.trim()} published successfully! All residents will be required to review and accept on their next login/session.`
      );
      await fetchTermsData();
      setTimeout(() => setTermsSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to publish new terms version');
    } finally {
      setPublishing(false);
    }
  };

  // Filter acceptance records
  const filteredRecords = acceptanceRecords.filter((rec) => {
    const matchesSearch =
      termsSearch === '' ||
      (rec.userName && rec.userName.toLowerCase().includes(termsSearch.toLowerCase())) ||
      (rec.userId && rec.userId.toLowerCase().includes(termsSearch.toLowerCase())) ||
      (rec.username && rec.username.toLowerCase().includes(termsSearch.toLowerCase()));

    const currentV = termsConfig?.version || 'v2.0-2026';
    const recV = rec.version || rec.termsVersion;
    const matchesVersion =
      versionFilter === 'all' ||
      (versionFilter === 'current' && recV === currentV) ||
      (versionFilter === 'historical' && recV !== currentV);

    return matchesSearch && matchesVersion;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            Hostel Administration &amp; Policy Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage tariffs, facility credentials, official hostel rules, version history, and resident acceptance audits.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSection('pricing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'pricing'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Profile &amp; Tariffs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('terms');
              fetchTermsData();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'terms'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Terms &amp; Conditions</span>
            {termsConfig?.version && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {termsConfig.version}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: PROFILE & TARIFFS */}
      {/* ==================================================================== */}
      {activeSection === 'pricing' && (
        <div className="space-y-6">
          {savedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Hostel settings and pricing plan saved successfully!
            </div>
          )}

          <form onSubmit={handleSubmitPricing} className="space-y-6">
            {/* Card 1: Critical Rent & Pricing Configuration */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Room Rent &amp; Tariffs (Editable Anytime)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All rents include 4 daily meals, free Wi-Fi, 24h electricity, RO water, and weekly cleaning.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Single Room Rent (₹ / Month) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={form.singleRent}
                      onChange={(e) => setForm({ ...form, singleRent: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Standard: ₹9,000 / month</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Double Room Rent Per Person (₹ / Month) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={form.doubleRent}
                      onChange={(e) => setForm({ ...form, doubleRent: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Standard: ₹6,500 / person / month</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Rent Effective From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.rentEffectiveDate}
                    onChange={(e) => setForm({ ...form, rentEffectiveDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Past bills remain locked to their historical rates.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Reason / Note for Rent Change
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Annual electricity and inflation revision"
                    value={form.rentChangeNote}
                    onChange={(e) => setForm({ ...form, rentChangeNote: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Security Deposit Defaults (Refundable Caution Money)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Single Living Room Security Deposit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={form.defaultSecurityDepositSingle}
                        onChange={(e) =>
                          setForm({ ...form, defaultSecurityDepositSingle: Number(e.target.value) })
                        }
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Default caution deposit for single rooms: <strong>₹4,500</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Double Living Room Security Deposit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        value={form.defaultSecurityDepositDouble}
                        onChange={(e) =>
                          setForm({ ...form, defaultSecurityDepositDouble: Number(e.target.value) })
                        }
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Default caution deposit for double rooms: <strong>₹3,500</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Hostel Identity & Wi-Fi */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  Hostel Information &amp; Facility Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hostel Name</label>
                  <input
                    type="text"
                    required
                    value={form.hostelName}
                    onChange={(e) => setForm({ ...form, hostelName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resident Wi-Fi SSID</label>
                  <input
                    type="text"
                    value={form.wifiSsid}
                    onChange={(e) => setForm({ ...form, wifiSsid: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resident Wi-Fi Password</label>
                  <input
                    type="text"
                    value={form.wifiPassword}
                    onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </div>
          </form>

          {/* Card 3: Rent Change History Audit Log */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Rent Revision Audit History
              </h3>
              <span className="text-xs text-slate-500">Locked Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5">Effective Date</th>
                    <th className="py-2.5">Single Rent (₹)</th>
                    <th className="py-2.5">Double Rent (₹)</th>
                    <th className="py-2.5">Changed By</th>
                    <th className="py-2.5">Reason / Remarks</th>
                    <th className="py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {settings?.rentHistory && settings.rentHistory.length > 0 ? (
                    settings.rentHistory.map((h, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold text-indigo-700">{h.effectiveDate}</td>
                        <td className="py-2.5 font-semibold">₹{h.singleRent.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 font-semibold">₹{h.doubleRent.toLocaleString('en-IN')}</td>
                        <td className="py-2.5">{h.changedBy}</td>
                        <td className="py-2.5 text-slate-600">{h.reason}</td>
                        <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                          {new Date(h.changedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No historical rent changes logged
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: TERMS & CONDITIONS MANAGEMENT */}
      {/* ==================================================================== */}
      {activeSection === 'terms' && (
        <div className="space-y-6">
          {termsSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{termsSuccessMsg}</span>
            </div>
          )}

          {/* Current Policy Overview Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Official Hostel Terms &amp; Conditions
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active Official Policy
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    <span>
                      Current Version:{' '}
                      <strong className="text-indigo-600 font-bold">
                        {termsConfig?.version || 'v2.0-2026'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>All 23 Official Rules Active</span>
                    <span>•</span>
                    <span>
                      Updated:{' '}
                      {termsConfig?.updatedAt
                        ? new Date(termsConfig.updatedAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Current'}
                    </span>
                    <span>•</span>
                    <span>By: {termsConfig?.updatedBy || 'Owner'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchTermsData}
                  disabled={loadingTerms}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Refresh records"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTerms ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Publish New Version
                </button>
              </div>
            </div>

            {/* Notice Bar */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold mb-0.5">Official Terms Integrity</p>
                <p>
                  All 23 official rules are binding on hostel residents. Residents are strictly not permitted to edit official rules. Publishing a new version prompts all residents to review and accept the updated terms.
                </p>
              </div>
            </div>

            {/* Scrollable View of 23 Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Active 23 Hostel Rules (English • Numbered Format)
                </h4>
                <span className="text-[11px] text-slate-400">Total: 23 rules</span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {(termsConfig?.rules || OFFICIAL_TERMS_RULES).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-lg border border-slate-200/80 flex items-start gap-3 text-xs leading-relaxed"
                  >
                    <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 font-normal">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Hostel Holidays */}
            <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Hostel Holidays
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(termsConfig?.holidays || OFFICIAL_HOSTEL_HOLIDAYS).map((holiday, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-950 text-center shadow-2xs"
                  >
                    {holiday}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <UtensilsCrossed className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{termsConfig?.holidayNotice || HOSTEL_HOLIDAY_NOTICE}</span>
              </div>
            </div>
          </div>

          {/* Card: Resident Acceptance Records Audit Log */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Resident Acceptance Audit Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent legal audit record of resident acceptances with User ID, version, date, time, and IP.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search resident or User ID..."
                    value={termsSearch}
                    onChange={(e) => setTermsSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1 border border-slate-300 rounded-xl px-2 py-1 text-xs bg-white">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select
                    value={versionFilter}
                    onChange={(e) => setVersionFilter(e.target.value)}
                    className="text-xs bg-transparent focus:outline-none text-slate-700"
                  >
                    <option value="all">All Versions</option>
                    <option value="current">Current Version ({termsConfig?.version || 'v2.0-2026'})</option>
                    <option value="historical">Historical Versions</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Resident / User</th>
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3">Terms Version</th>
                    <th className="py-2.5 px-3">Acceptance Date &amp; Time</th>
                    <th className="py-2.5 px-3">Device &amp; IP</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((rec) => {
                      const v = rec.version || rec.termsVersion;
                      const isCurrent = v === (termsConfig?.version || 'v2.0-2026');
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">
                              {rec.userName || rec.username || 'Resident User'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Role: {rec.userRole || 'resident'}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-indigo-700 font-semibold">
                            {rec.userId}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                isCurrent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {v}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">
                              {rec.acceptedDate ||
                                (rec.acceptedAt
                                  ? new Date(rec.acceptedAt).toLocaleDateString('en-IN')
                                  : '—')}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {rec.acceptedTime ||
                                (rec.acceptedAt
                                  ? new Date(rec.acceptedAt).toLocaleTimeString('en-IN', {
                                      hour12: true,
                                    })
                                  : '—')}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="text-slate-700 truncate" title={rec.deviceBrowser || rec.deviceInfo}>
                              {rec.deviceBrowser || rec.deviceInfo || 'Browser Client'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              IP: {rec.ipAddress || '127.0.0.1'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Accepted
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {acceptanceRecords.length === 0
                          ? 'No terms acceptance records logged yet.'
                          : 'No records matching search or filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>
                Showing <strong>{filteredRecords.length}</strong> of{' '}
                <strong>{acceptanceRecords.length}</strong> acceptance records
              </span>
              <span className="text-[11px]">Audit records preserved permanently in database</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PUBLISH NEW VERSION MODAL */}
      {/* ==================================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Publish New Terms Version
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hostel Rules &amp; Regulations Version Release
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishTerms} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Important Enforcement Notice
                </p>
                <p>
                  Publishing a new version will require <strong>all existing and new residents</strong> to review and accept the official terms before continuing in the app.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  New Version Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v2.1-2026"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Previous version: <strong>{termsConfig?.version || 'v2.0-2026'}</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Preserved Regulations:</p>
                <p>• All 23 official rules will be published under the new version identifier.</p>
                <p>• Hostel holidays (Raksha Bandhan, Durga Puja, Diwali, Holi) will remain active.</p>
                <p>• Previous acceptance records are preserved for legal and audit history.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing || !newVersion.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  {publishing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish Version {newVersion.trim()}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
