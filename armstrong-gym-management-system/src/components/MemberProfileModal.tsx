import React from 'react';
import { X, Phone, Mail, CreditCard, Clock } from 'lucide-react';
import { Member, Payment, Attendance } from '../types';

interface MemberProfileModalProps {
  member: Member;
  payments: Payment[];
  attendance: Attendance[];
  onClose: () => void;
  onRecordPaymentClick: (memberId: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member, payments, attendance, onClose, onRecordPaymentClick,
}) => {
  const memberPayments  = payments.filter((p) => p.memberId  === member.id);
  const memberAttendance = attendance.filter((a) => a.memberId === member.id);

  const statusCls =
    member.status === 'Active'   ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    member.status === 'Expiring' ? 'bg-amber-500/20  text-amber-400  border-amber-500/30'  :
                                   'bg-[#E51924]/20  text-[#E51924]  border-[#E51924]/30';

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-3xl p-6 space-y-6 shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white p-1 rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-4">
            <img src={member.photoUrl} alt={member.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#E51924]/40 shadow-lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{member.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E51924]/10 text-[#E51924] font-bold border border-[#E51924]/20">
                  {member.id}
                </span>
              </div>
              <p className="text-xs text-white/50 flex items-center gap-3">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#E51924]" />{member.phone}</span>
                {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-cyan-400" />{member.email}</span>}
              </p>
              <p className="text-[11px] text-white/40">
                Plan: <strong className="text-white/80">{member.planType} Pass</strong> • Start: {member.startDate} • Exp: <strong className="text-emerald-400">{member.expiryDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-white/8">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${statusCls}`}>
              {member.status}
            </span>
            {member.remainingBalance > 0 ? (
              <button
                onClick={() => { onClose(); onRecordPaymentClick(member.id); }}
                className="px-3 py-1.5 rounded-xl bg-[#E51924] text-white font-black text-xs hover:bg-red-600 transition-all shadow-md shadow-[#E51924]/25"
              >
                Clear Due: ₹{member.remainingBalance.toLocaleString('en-IN')}
              </button>
            ) : (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Paid in Full
              </span>
            )}
          </div>
        </div>

        {/* QR + History */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR pass */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-3 flex flex-col items-center text-center">
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Member QR Pass</h3>
            <div className="bg-white p-3 rounded-xl border-2 border-[#E51924]/40 shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(member.id)}`}
                alt="QR" className="w-32 h-32"
              />
            </div>
            <p className="text-[10px] font-mono text-[#E51924] font-bold">QR ID: {member.id}</p>
            <div className="w-full pt-2 border-t border-white/8 text-[11px] text-white/50 space-y-1 text-left">
              <p>Total Paid: <strong className="text-white">₹{member.amountPaid}</strong></p>
              <p>Plan Cost:  <strong className="text-white">₹{member.planCost}</strong></p>
              <p>Remaining:  <strong className="text-[#E51924]">₹{member.remainingBalance}</strong></p>
            </div>
          </div>

          {/* Payment + attendance history */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment History ({memberPayments.length})</span>
              </h3>
              <div className="bg-[#0D0D0D] border border-white/8 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/3 text-white/40 font-semibold border-b border-white/8">
                    <tr>
                      <th className="py-2 px-3">Receipt</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {memberPayments.length > 0 ? memberPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/3">
                        <td className="py-2 px-3 font-bold text-white/80">{p.id}</td>
                        <td className="py-2 px-3 text-white/40">{p.date.split(' ')[0]}</td>
                        <td className="py-2 px-3 text-white/60">{p.paymentMethod}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-4 text-center text-white/30 text-xs">No payments recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Check-In History ({memberAttendance.length})</span>
              </h3>
              <div className="bg-[#0D0D0D] border border-white/8 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/3 text-white/40 font-semibold border-b border-white/8">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3 text-right">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {memberAttendance.length > 0 ? memberAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-white/3">
                        <td className="py-2 px-3 font-bold text-white/80">{a.date}</td>
                        <td className="py-2 px-3 text-cyan-400 font-bold">{a.time}</td>
                        <td className="py-2 px-3 text-right text-white/40">{a.checkInMethod}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="py-4 text-center text-white/30 text-xs">No check-ins logged.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
