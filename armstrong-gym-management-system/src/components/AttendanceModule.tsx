import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Search,
  UserCheck,
  Clock,
  Camera,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Attendance, Member } from '../types';
import toast from 'react-hot-toast';

interface AttendanceModuleProps {
  attendance: Attendance[];
  members: Member[];
  onCheckInMember: (
    memberId: string,
    checkInMethod?: 'QR Scan' | 'Manual'
  ) => Promise<any>;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  attendance,
  members,
  onCheckInMember,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [search, setSearch] = useState('');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  const handleManualCheckIn = async (idToUse?: string) => {
    const id = (idToUse || selectedMemberId || qrInput).trim();
    if (!id) {
      toast.error('Please enter or select a Member ID (e.g. GM-001)');
      return;
    }

    try {
      const res = await onCheckInMember(id, 'Manual');
      toast.success(res.message || `Successfully checked in ${id}!`);
      setSelectedMemberId('');
      setQrInput('');
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleQrScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput) return;
    try {
      const res = await onCheckInMember(qrInput, 'QR Scan');
      toast.success(`[QR SCAN SUCCESS] ${res.message}`);
      setQrInput('');
    } catch (err: any) {
      toast.error(err.message || 'QR Scan check-in error');
    }
  };

  // Filter attendance by search
  const filteredAttendance = attendance.filter(
    (a) =>
      a.memberName.toLowerCase().includes(search.toLowerCase()) ||
      a.memberId.toLowerCase().includes(search.toLowerCase()) ||
      a.date.includes(search)
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysCheckInsCount = attendance.filter((a) => a.date === todayStr).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <QrCode className="w-5 h-5 text-cyan-400" />
          <span>Attendance Check-In Station</span>
        </h1>
        <p className="text-xs text-white/50">
          Scan member QR passes or enter GM-IDs. Prevents duplicate daily check-ins.
        </p>
      </div>

      {/* Check-In Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Scanner Card */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#E51924]" />
              <span>Digital QR Scanner</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E51924]/20 text-[#E51924] font-bold border border-[#E51924]/30">
              SCANNER ACTIVE
            </span>
          </div>

          <form onSubmit={handleQrScanSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Scan or Paste Member QR Pass (e.g., GM-001)..."
                className="w-full px-4 py-3 text-xs bg-white/5 text-[#E51924] font-mono font-bold placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#E51924] text-white font-extrabold text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
              >
                Submit QR Check-In
              </button>

              <button
                type="button"
                onClick={() => {
                  const randomMember = members[Math.floor(Math.random() * members.length)];
                  if (randomMember) {
                    setQrInput(randomMember.id);
                    toast.success(`Simulated QR Scan for ${randomMember.name} (${randomMember.id})`);
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20"
              >
                Auto-Test Scan
              </button>
            </div>
          </form>
        </div>

        {/* Manual Member Check-In Selection */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Manual Check-In Lookup</span>
            </h2>
            <span className="text-xs text-white/50 font-mono">
              Today Total: <strong className="text-emerald-400">{todaysCheckInsCount}</strong>
            </span>
          </div>

          <div className="space-y-3">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
            >
              <option value="">-- Choose Member to Check In --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id}) — {m.status} Plan
                </option>
              ))}
            </select>

            <button
              onClick={() => handleManualCheckIn()}
              className="w-full py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-red-500/20 transition-all"
            >
              Confirm Manual Check-In
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E51924]" />
            <span>Attendance Log History</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Member ID, or Date..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Check-In ID</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-white/40">{a.id}</td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{a.memberName}</p>
                      <p className="text-[10px] font-mono text-white/40">{a.memberId}</p>
                    </td>

                    <td className="py-3 px-4 font-mono text-white/70">{a.date}</td>

                    <td className="py-3 px-4 font-mono font-bold text-[#E51924]">
                      {a.time}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/10 text-[10px] font-mono font-semibold">
                        {a.checkInMethod}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40">
                    No attendance logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
