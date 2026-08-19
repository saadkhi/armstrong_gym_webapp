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
  XCircle,
  RefreshCw,
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
  onNavigateRenew?: () => void; // optional: navigate to members tab for renewal
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  attendance,
  members,
  onCheckInMember,
  onNavigateRenew,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [search, setSearch] = useState('');
  const [expiredWarning, setExpiredWarning] = useState<Member | null>(null);

  /** Resolve a member ID from any input (direct match, case-insensitive) */
  const resolveMember = (id: string) =>
    members.find((m) => m.id.toLowerCase() === id.trim().toLowerCase());

  /** Check member status before submitting check-in; show warning if expired */
  const guardCheckIn = async (
    id: string,
    method: 'QR Scan' | 'Manual'
  ) => {
    const member = resolveMember(id);
    if (member && member.status === 'Expired') {
      setExpiredWarning(member);
      return; // block — show modal instead
    }
    // Active / Expiring — proceed normally
    try {
      const res = await onCheckInMember(id, method);
      if (method === 'QR Scan') {
        toast.success(`[QR SCAN SUCCESS] ${res.message}`);
        setQrInput('');
      } else {
        toast.success(res.message || `Successfully checked in ${id}!`);
        setSelectedMemberId('');
        setQrInput('');
      }
      // Warn about expiring membership (but still allow entry)
      if (member && member.status === 'Expiring') {
        toast(`⚠️ ${member.name}'s membership expires on ${member.expiryDate}`, {
          icon: '⚠️',
          style: { background: '#92400e', color: '#fef3c7' },
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleManualCheckIn = () => {
    const id = (selectedMemberId || qrInput).trim();
    if (!id) { toast.error('Please enter or select a Member ID (e.g. GM-001)'); return; }
    guardCheckIn(id, 'Manual');
  };

  const handleQrScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput) return;
    guardCheckIn(qrInput, 'QR Scan');
  };

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
      {/* ── Expired Member Warning Modal ──────────────────────────────────────── */}
      {expiredWarning && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          role="alertdialog" aria-modal="true" aria-labelledby="expired-warn-title">
          <div className="bg-[#0D0D0D] border-2 border-rose-500/60 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h2 id="expired-warn-title" className="text-base font-black text-rose-400 uppercase tracking-wider">
                  Membership Expired
                </h2>
                <p className="text-xs text-white/60 mt-0.5">
                  Access is blocked for expired members.
                </p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-white">{expiredWarning.name}</p>
              <p className="text-xs text-white/60 font-mono">{expiredWarning.id} · {expiredWarning.phone}</p>
              <p className="text-xs text-rose-400 font-bold">
                Expired: {expiredWarning.expiryDate} · {expiredWarning.planType} Plan
              </p>
              {expiredWarning.remainingBalance > 0 && (
                <p className="text-xs text-amber-400 font-bold">
                  Outstanding balance: Rs. {expiredWarning.remainingBalance.toLocaleString('en-PK')}
                </p>
              )}
            </div>

            <p className="text-xs text-white/70">
              Please renew this member's plan before allowing gym access. Go to the
              <strong className="text-white"> Members tab </strong>
              and click the <RefreshCw className="w-3 h-3 inline text-emerald-400" aria-hidden="true" /> Renew button.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setExpiredWarning(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20 transition-all"
              >
                Dismiss
              </button>
              {onNavigateRenew && (
                <button
                  onClick={() => { setExpiredWarning(null); onNavigateRenew(); }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Go to Renew
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <QrCode className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <span>Attendance Check-In Station</span>
        </h1>
        <p className="text-xs text-white/50">
          Scan member QR passes or enter GM-IDs. Expired members are blocked until renewed.
        </p>
      </div>

      {/* Check-In Action Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {/* QR Scanner Card */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#E51924]" aria-hidden="true" />
              <span>Digital QR Scanner</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E51924]/20 text-[#E51924] font-bold border border-[#E51924]/30">
              SCANNER ACTIVE
            </span>
          </div>

          <form onSubmit={handleQrScanSubmit} className="space-y-3">
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Scan or paste Member QR Pass (e.g. GM-001)…"
              aria-label="Member ID for QR scan"
              className="w-full px-4 py-3 text-xs bg-white/5 text-[#E51924] font-mono font-bold placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
            />
            <div className="flex items-center gap-2">
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#E51924] text-white font-extrabold text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">
                Submit QR Check-In
              </button>
              <button type="button"
                onClick={() => {
                  const active = members.filter((m) => m.status !== 'Expired');
                  const randomMember = active[Math.floor(Math.random() * active.length)];
                  if (randomMember) {
                    setQrInput(randomMember.id);
                    toast.success(`Simulated QR Scan for ${randomMember.name} (${randomMember.id})`);
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-white/10 text-white/80 text-xs font-semibold hover:bg-white/20">
                Auto-Test
              </button>
            </div>
          </form>
        </div>

        {/* Manual Check-In */}
        <div className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Manual Check-In Lookup</span>
            </h2>
            <span className="text-xs text-white/50 font-mono">
              Today: <strong className="text-emerald-400">{todaysCheckInsCount}</strong>
            </span>
          </div>

          <div className="space-y-3">
            <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}
              aria-label="Select member for check-in"
              className="w-full px-4 py-2.5 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]">
              <option value="">-- Choose Member to Check In --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className={m.status === 'Expired' ? 'text-rose-400' : ''}>
                  {m.status === 'Expired' ? '🚫 ' : m.status === 'Expiring' ? '⚠️ ' : '✓ '}
                  {m.name} ({m.id}) — {m.status}
                </option>
              ))}
            </select>
            <button onClick={handleManualCheckIn}
              className="w-full py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-red-500/20 transition-all">
              Confirm Manual Check-In
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E51924]" aria-hidden="true" />
            <span>Attendance Log History</span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Member ID, or Date…"
              aria-label="Search attendance logs"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs mobile-card-table">
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
                    <td className="py-3 px-3 sm:px-4 font-mono text-white/40" data-label="ID">{a.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{a.memberName}</p>
                      <p className="text-[10px] font-mono text-white/40">{a.memberId}</p>
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-white/70" data-label="Date">{a.date}</td>
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold text-[#E51924]" data-label="Time">{a.time}</td>
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
