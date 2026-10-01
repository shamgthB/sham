import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  UserCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Zap,
  Calendar,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { decodeQRCodeFromImageData, decodeQRCodeFromFile } from '../../lib/qrUtils';
import type { QRSession, CheckInRecord } from '../../types';

export const ResidentQRCheckInView: React.FC = () => {
  const { user, resident } = useAuth();

  const [activeTab, setActiveTab] = useState<'camera' | 'active_passes' | 'upload' | 'manual'>('active_passes');
  const [activeSessions, setActiveSessions] = useState<(QRSession & { todayScans?: number })[]>([]);
  const [myCheckIns, setMyCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual code input
  const [manualCode, setManualCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  // Last check-in result modal / feedback
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    alreadyCheckedIn?: boolean;
    message: string;
    record?: CheckInRecord;
    session?: QRSession;
  } | null>(null);

  // Camera video / canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, checkInsData] = await Promise.all([
        api.getQRSessions({ activeOnly: true }),
        api.getCheckIns({ residentId: resident?.id }),
      ]);
      setActiveSessions(sessionsData || []);
      setMyCheckIns(checkInsData.records || []);
    } catch (err) {
      console.error('Failed to load resident check-in data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resident?.id]);

  // Clean up camera stream when unmounting or switching tabs
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser or environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. You can check in using the "1-Click Active Passes" or "Enter Pass Code" tab.'
          : 'Unable to start camera. Please switch to the "1-Click Active Passes" or "Upload Image" tab.'
      );
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setScanning(false);
  };

  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = decodeQRCodeFromImageData(imageData);

    if (decoded && decoded.data) {
      // QR Code detected!
      stopCamera();
      processScanPayload(decoded.data, 'camera_scanner');
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  // Process payload via API
  const processScanPayload = async (
    payloadOrCode: string,
    method: 'camera_scanner' | 'image_upload' | 'manual_code' | 'admin_override' = 'camera_scanner'
  ) => {
    try {
      const res = await api.scanCheckIn({
        qrPayload: payloadOrCode,
        code: payloadOrCode,
        token: payloadOrCode,
        method,
      });

      setScanResult({
        success: true,
        alreadyCheckedIn: res.alreadyCheckedIn,
        message: res.message,
        record: res.record,
        session: res.session,
      });

      await loadData();
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err?.message || 'Check-in verification failed. Please try again.',
      });
    }
  };

  // 1-Click Scan Active Pass
  const handleQuickCheckIn = async (session: QRSession) => {
    setSubmittingCode(true);
    try {
      const res = await api.scanCheckIn({
        token: session.token,
        code: session.code,
        method: 'camera_scanner',
      });

      setScanResult({
        success: true,
        alreadyCheckedIn: res.alreadyCheckedIn,
        message: res.message,
        record: res.record,
        session: res.session,
      });

      await loadData();
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err?.message || 'Failed to verify check-in.',
      });
    } finally {
      setSubmittingCode(false);
    }
  };

  // Handle Manual Code Submit
  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setSubmittingCode(true);
    try {
      await processScanPayload(manualCode.trim().toUpperCase(), 'manual_code');
      setManualCode('');
    } finally {
      setSubmittingCode(false);
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const decoded = await decodeQRCodeFromFile(file);
      if (decoded && decoded.data) {
        await processScanPayload(decoded.data, 'image_upload');
      } else {
        alert('Could not find a valid QR code in this image. Please try another image or use pass code.');
      }
    } catch (err: any) {
      alert('Error scanning image file: ' + (err?.message || 'Unknown error'));
    }
  };

  // Check if resident is checked in for daily attendance today
  const todaysAttendance = myCheckIns.find(
    (c) => c.type === 'attendance' && c.date === todayStr
  );

  // Compute attendance streak
  const attendanceDates = Array.from(
    new Set(myCheckIns.filter((c) => c.type === 'attendance').map((c) => c.date))
  );
  const attendanceStreak = attendanceDates.length;

  return (
    <div className="space-y-6">
      {/* Resident Top Status Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  QR Attendance & Facility Check-In
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800">
                  Room {resident?.roomNumber || 'Hostel Resident'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Scan QR codes generated at the hostel gate, mess counter, study hall, or gym to log your daily attendance and facility visits.
              </p>
            </div>
          </div>

          {/* Today's Attendance Badge */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
            {todaysAttendance ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Today's Attendance
                  </span>
                  <div className="text-xs font-black text-slate-900">
                    Present •{' '}
                    <span className="text-slate-500 font-normal">
                      {new Date(todaysAttendance.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Today's Attendance
                  </span>
                  <div className="text-xs font-black text-slate-900">Pending Scan Today</div>
                </div>
              </div>
            )}

            <div className="border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Check-Ins
              </span>
              <div className="text-xs font-black text-indigo-600 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{myCheckIns.length} recorded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Check-In Card with Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('active_passes');
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === 'active_passes'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>1-Click Active Passes</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-800 font-black">
              {activeSessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === 'camera'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('manual');
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Enter Pass Code</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload QR Image</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 sm:p-8">
          {/* TAB 1: 1-Click Active Hostel Passes */}
          {activeTab === 'active_passes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Current Active Hostel Passes & Gates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hostel management has generated the following active check-in codes. Click <strong>Verify & Check In</strong> to record your attendance or facility usage instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="self-start sm:self-auto text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Passes</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {activeSessions.map((session) => {
                  const isAttendance = session.type === 'attendance';
                  const alreadyCheckedInToday = myCheckIns.some(
                    (c) => c.qrSessionId === session.id && c.date === todayStr
                  );

                  return (
                    <div
                      key={session.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        alreadyCheckedInToday
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md inline-flex items-center gap-1 ${
                              isAttendance
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAttendance ? <UserCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            <span>{isAttendance ? 'Daily Attendance' : session.facilityType}</span>
                          </span>

                          <span className="font-mono text-xs font-bold text-slate-500">
                            {session.code}
                          </span>
                        </div>

                        <h4 className="text-base font-black text-slate-900 mt-2.5 line-clamp-1">
                          {session.title}
                        </h4>

                        <div className="text-xs text-slate-500 mt-2 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{session.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{session.sessionTime || 'All Day'}</span>
                          </div>
                        </div>

                        {session.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-2.5 bg-white/70 p-2 rounded-xl border border-slate-100">
                            {session.notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        {alreadyCheckedInToday ? (
                          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold py-1">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Checked In Today</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickCheckIn(session)}
                              disabled={submittingCode}
                              className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-normal"
                            >
                              Check In Again
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickCheckIn(session)}
                            disabled={submittingCode}
                            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <Zap className="w-4 h-4 text-amber-300" />
                            <span>Verify & Check In Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-slate-900 border-4 border-indigo-500/30 aspect-square shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />

                {/* Animated Targeting Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  <div className="w-60 h-60 border-2 border-indigo-400/80 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br"></div>

                    {/* Animated horizontal laser beam */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>
                  <span className="mt-4 px-3 py-1 bg-slate-950/80 text-white rounded-full text-xs font-semibold backdrop-blur-xs">
                    Align QR Code within the frame
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Camera Access Notice</span>
                  </div>
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('active_passes')}
                    className="mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Switch to 1-Click Passes
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart Camera</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Stop Camera
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Enter Pass Code Manually */}
          {activeTab === 'manual' && (
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Enter Hostel Pass Code</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Type the 6 to 8-character code shown below the QR code (e.g. <strong>ATT-9481</strong> or <strong>MESS-5120</strong>).
                </p>
              </div>

              <form onSubmit={handleManualCodeSubmit} className="space-y-3 pt-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. ATT-9481"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full text-center text-lg font-mono font-black tracking-widest uppercase rounded-2xl border-2 border-slate-200 p-3.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />

                <button
                  type="submit"
                  disabled={submittingCode || !manualCode.trim()}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-xs transition-all disabled:opacity-50"
                >
                  {submittingCode ? 'Verifying Code...' : 'Submit & Check In'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: Upload Image */}
          {activeTab === 'upload' && (
            <div className="max-w-md mx-auto text-center space-y-4">
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-3xl hover:border-indigo-500 transition-colors bg-slate-50/50">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-black text-slate-800">Upload QR Code Photo or Screenshot</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Select a picture containing the hostel attendance or facility QR code.
                </p>

                <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-block">
                  <span>Browse Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Scan Result Notification */}
      {scanResult && (
        <div
          className={`p-5 rounded-3xl border shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
            scanResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-2xl text-white ${
                  scanResult.success ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black">
                  {scanResult.alreadyCheckedIn ? 'Already Checked In!' : scanResult.message}
                </h3>
                {scanResult.record && (
                  <div className="text-xs text-slate-700 mt-1 space-y-0.5">
                    <p>
                      <strong>Session:</strong> {scanResult.record.sessionTitle}{' '}
                      {scanResult.record.facilityName && `(${scanResult.record.facilityName})`}
                    </p>
                    <p>
                      <strong>Resident:</strong> {scanResult.record.residentName} (Room {scanResult.record.roomNumber})
                    </p>
                    <p>
                      <strong>Logged At:</strong>{' '}
                      {new Date(scanResult.record.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      • <strong>Status:</strong>{' '}
                      <span className="font-bold text-emerald-700">{scanResult.record.status}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 p-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Section 3: My Attendance & Facility History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>My Check-In & Facility Records</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 font-bold">
                {myCheckIns.length} Total
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              History of all your verified daily roll calls and hostel amenity check-ins.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Pass Title / Facility</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myCheckIns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No check-in history found. Scan an active pass above to record your first visit!
                  </td>
                </tr>
              ) : (
                myCheckIns.map((record) => {
                  const isAttendance = record.type === 'attendance';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {new Date(record.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {record.sessionTitle}
                        {record.facilityName && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            {record.facilityName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md capitalize ${
                            isAttendance
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {record.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 capitalize">
                        {record.method.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{record.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
