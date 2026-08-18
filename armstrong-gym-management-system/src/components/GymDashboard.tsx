import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Sparkles,
  QrCode,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { SystemStats, Member, Payment, Attendance } from '../types';
import type { MonthlyHistoryPoint } from '../api/client';

interface GymDashboardProps {
  stats: SystemStats;
  members: Member[];
  payments: Payment[];
  attendance: Attendance[];
  chartHistory: MonthlyHistoryPoint[];
  onNavigateTab: (tab: any) => void;
  onSelectMember: (member: Member) => void;
}

export const GymDashboard: React.FC<GymDashboardProps> = ({
  stats,
  members,
  payments,
  attendance,
  chartHistory,
  onNavigateTab,
  onSelectMember,
}) => {
  // Expiring members
  const expiringMembersList = members.filter((m) => m.status === 'Expiring');

  // Chart data: use live DB history if available, otherwise show current month only
  const chartData = chartHistory.length > 0
    ? chartHistory.map((h) => ({
        month:    h.label,
        income:   h.income,
        expenses: h.expenses,
        profit:   h.profit,
      }))
    : [
        {
          month:    new Date().toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          income:   stats.monthlyIncome,
          expenses: stats.monthlyExpenses,
          profit:   stats.netProfit,
        },
      ];

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="absolute inset-0 glow-bg pointer-events-none -z-10" />

      {/* Header Overview Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-wide text-white uppercase">OVERVIEW</h2>
          <p className="text-sm opacity-50 font-medium">Performance stats & financial summary</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigateTab('payments')}
            className="glass-card px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/20"
          >
            Record Payment
          </button>
          <button
            onClick={() => onNavigateTab('attendance')}
            className="bg-[#ff3e3e] hover:bg-red-600 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
          >
            Scan QR Code
          </button>
        </div>
      </div>

      {/* Expiring Alert Banner */}
      {stats.expiringMembers > 0 && (
        <div className="glass-card border-l-4 border-[#ff3e3e] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-[#ff3e3e] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-white">
                {stats.expiringMembers} Memberships Expiring Soon!
              </p>
              <p className="text-xs text-white/60">
                Send automated WhatsApp expiry reminders to prompt early renewals.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('whatsapp')}
            className="px-5 py-2 rounded-full bg-[#ff3e3e] text-white font-black text-xs uppercase tracking-wider hover:bg-red-600 transition-all shrink-0 shadow-lg shadow-red-500/20"
          >
            Send Reminders
          </button>
        </div>
      )}

      {/* STATS GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Members */}
        <div
          onClick={() => onNavigateTab('members')}
          className="glass-card p-5 rounded-2xl cursor-pointer transition-all hover:bg-white/5 group border border-white/10"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
            Total Active Members
          </p>
          <h3 className="stat-val text-4xl text-white">{stats.activeMembers}</h3>
          <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider mt-2">
            Total Enrolled: {stats.totalMembers}
          </p>
        </div>

        {/* Daily Income */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="glass-card p-5 rounded-2xl cursor-pointer transition-all hover:bg-white/5 group border border-white/10"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
            Daily Revenue
          </p>
          <h3 className="stat-val text-4xl text-white">
            ₹{stats.todaysIncome.toLocaleString('en-PK')}
          </h3>
          <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider mt-2">
            Today's Collections
          </p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigateTab('members')}
          className="glass-card p-5 rounded-2xl border-l-4 border-red-500 cursor-pointer transition-all hover:bg-white/5 group"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
            Expiring Soon
          </p>
          <h3 className="stat-val text-4xl text-[#ff3e3e]">{stats.expiringMembers}</h3>
          <p className="text-[10px] opacity-40 mt-2 uppercase font-bold tracking-wider">
            Next 7 Days
          </p>
        </div>

        {/* Net Profit */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="glass-card p-5 rounded-2xl cursor-pointer transition-all hover:bg-white/5 group border border-white/10"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
            Net Monthly Profit
          </p>
          <h3 className={`stat-val text-4xl ${stats.netProfit >= 0 ? 'text-white' : 'text-[#ff3e3e]'}`}>
            ₹{stats.netProfit.toLocaleString('en-PK')}
          </h3>
          <p className="text-[10px] opacity-40 mt-2 uppercase font-bold tracking-wider">
            Rev: ₹{stats.monthlyIncome.toLocaleString('en-PK')}
          </p>
        </div>
      </section>

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Expenses Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">
                Revenue & Expense Trends
              </h4>
              <p className="text-[10px] opacity-40 uppercase tracking-wider">Monthly Financial Performance</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-[#ff3e3e]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e]" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3e3e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff3e3e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.08} />
                <XAxis dataKey="month" stroke="#ffffff" opacity={0.4} fontSize={10} fontStyle="normal" />
                <YAxis stroke="#ffffff" opacity={0.4} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '16px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontFamily: 'Inter',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ff3e3e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiring Soon Quick List */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ff3e3e]" />
                <span>Expiring Memberships</span>
              </h4>
              <button
                onClick={() => onNavigateTab('members')}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {expiringMembersList.length > 0 ? (
                expiringMembersList.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMember(m)}
                    className="p-3 rounded-2xl glass-card hover:bg-white/10 flex items-center justify-between cursor-pointer transition-all border border-white/10 group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                      />
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-[#ff3e3e] transition-colors">
                          {m.name}
                        </p>
                        <p className="text-[10px] font-mono text-white/40">
                          Exp: {m.expiryDate}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-[#ff3e3e] transition-colors" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider py-8 text-center">
                  No memberships expiring soon
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('whatsapp')}
            className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-extrabold uppercase tracking-widest transition-all text-center"
          >
            Launch WhatsApp Reminders
          </button>
        </div>
      </div>

      {/* Recent Payments & Today's Attendance Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Recent Payments</span>
            </h4>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:underline"
            >
              View History
            </button>
          </div>

          <div className="space-y-3">
            {payments.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{p.memberName}</p>
                  <p className="text-[10px] text-white/40 font-mono">
                    {p.id} • {p.paymentMethod} • {p.date}
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  +₹{p.amount.toLocaleString('en-PK')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Attendance Feed */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 accent-text" />
              <span>Live Attendance Activity</span>
            </h4>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-[10px] font-bold uppercase tracking-widest accent-text hover:underline"
            >
              Scan Pass
            </button>
          </div>

          <div className="space-y-3">
            {attendance.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">{a.memberName}</p>
                    <p className="text-[10px] text-white/40 font-mono">
                      Time: {a.time} ({a.checkInMethod})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/50">{a.memberId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
