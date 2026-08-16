import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Portfolio } from './components/Portfolio';
import { GymDashboard } from './components/GymDashboard';
import { MembersModule } from './components/MembersModule';
import { MemberProfileModal } from './components/MemberProfileModal';
import { PaymentsModule } from './components/PaymentsModule';
import { AttendanceModule } from './components/AttendanceModule';
import { TrainersModule } from './components/TrainersModule';
import { ExpensesModule } from './components/ExpensesModule';
import { ReportsModule } from './components/ReportsModule';
import { WhatsAppModule } from './components/WhatsAppModule';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';

import {
  Member,
  Payment,
  Attendance,
  Trainer,
  Expense,
  ReminderLog,
  SystemStats,
} from './types';

import {
  fetchStats,
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  fetchPayments,
  createPayment,
  deletePayment,
  fetchAttendance,
  checkInMember,
  fetchTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchReminderLogs,
  sendWhatsAppMessage,
  triggerCronAutomation,
  fetchSettings,
  updateSettings,
} from './api/client';

// ─── Skeleton shimmer components ────────────────────────────────────────────────
const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div
    className={`bg-white/5 rounded-xl animate-pulse ${className}`}
    aria-hidden="true"
  />
);

const DashboardSkeleton = () => (
  <div className="space-y-8 pb-12" aria-label="Loading dashboard…" aria-busy="true">
    {/* Header */}
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-9 w-48" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <div className="flex gap-3">
        <SkeletonBlock className="h-9 w-36 rounded-full" />
        <SkeletonBlock className="h-9 w-32 rounded-full" />
      </div>
    </div>
    {/* Stats grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card border border-white/10 rounded-2xl p-5 space-y-3">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-10 w-24" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
      ))}
    </div>
    {/* Chart placeholder */}
    <div className="glass-card border border-white/10 rounded-2xl p-6">
      <SkeletonBlock className="h-4 w-40 mb-6" />
      <SkeletonBlock className="h-48 w-full rounded-xl" />
    </div>
  </div>
);

const TableSkeleton = ({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="space-y-4 pb-12" aria-label="Loading data…" aria-busy="true">
    {/* Header bar */}
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-3 w-56" />
      </div>
      <SkeletonBlock className="h-9 w-36 rounded-xl" />
    </div>
    {/* Filter bar */}
    <div className="glass-card border border-white/10 rounded-2xl p-4 flex gap-4">
      <SkeletonBlock className="h-9 w-64 rounded-xl" />
      <div className="flex gap-2 ml-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-20 rounded-xl" />
        ))}
      </div>
    </div>
    {/* Table */}
    <div className="glass-card border border-white/10 rounded-2xl overflow-hidden">
      {/* thead */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/10 bg-white/5">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* tbody */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock key={j} className={`h-4 ${j === 0 ? 'w-10 rounded-full' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  const [viewMode, setViewMode] = useState<'portfolio' | 'admin' | 'login'>('portfolio');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('armstrong_admin_token')
  );

  // Loading state — true during the initial data fetch after login
  const [isLoading, setIsLoading] = useState(false);
  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Force-logout on any 401 from the API — only when in the admin view
  useEffect(() => {
    const onUnauthorized = () => {
      if (viewMode !== 'admin') return;
      localStorage.removeItem('armstrong_admin_token');
      setAuthToken(null);
      setViewMode('login');
      window.location.hash = '#gym';
      toast.error('Session expired. Please sign in again.');
    };
    window.addEventListener('armstrong:unauthorized', onUnauthorized);
    return () => window.removeEventListener('armstrong:unauthorized', onUnauthorized);
  }, [viewMode]);

  // System Data
  const [stats, setStats] = useState<SystemStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringMembers: 0,
    expiredMembers: 0,
    todaysIncome: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    outstandingDues: 0,
    netProfit: 0,
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Modals & Selections
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [preselectedPayMemberId, setPreselectedPayMemberId] = useState<string | undefined>(undefined);

  // Sync URL hash or route
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path.includes('gymadminportal') ||
        path.startsWith('/gym') ||
        hash.includes('gymadminportal') ||
        hash === '#gym'
      ) {
        if (!authToken) {
          setViewMode('login');
        } else {
          setViewMode('admin');
        }
      } else {
        setViewMode('portfolio');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [authToken]);

  // Load all system data
  const refreshData = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [sData, mData, pData, aData, tData, eData, lData, setRes] =
        await Promise.all([
          fetchStats(),
          fetchMembers(),
          fetchPayments(),
          fetchAttendance(),
          fetchTrainers(),
          fetchExpenses(),
          fetchReminderLogs(),
          fetchSettings(),
        ]);

      setStats(sData);
      setMembers(mData);
      setPayments(pData);
      setAttendance(aData);
      setTrainers(tData);
      setExpenses(eData);
      setReminderLogs(lData);
      setSettings(setRes);
    } catch (err) {
      console.error('Error refreshing backend data:', err);
      toast.error('Failed to load dashboard data. Please refresh.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'admin') return;
    refreshData(true); // show skeleton on initial admin load
  }, [viewMode]);

  // Auth Handlers
  const handleLoginSuccess = (token: string, _user?: any) => {
    localStorage.setItem('armstrong_admin_token', token);
    setAuthToken(token);
    setViewMode('admin');
    window.location.hash = '#gym';
  };

  const handleLogout = () => {
    localStorage.removeItem('armstrong_admin_token');
    setAuthToken(null);
    setViewMode('portfolio');
    window.location.hash = '';
    toast.success('Signed out of Armstrong Gym Admin');
  };

  const navigateToAdmin = () => {
    if (!authToken) {
      setViewMode('login');
      window.location.hash = '#gym';
    } else {
      setViewMode('admin');
      window.location.hash = '#gym';
    }
  };

  const navigateToPortfolio = () => {
    setViewMode('portfolio');
    window.location.hash = '';
  };

  const handleTriggerCron = async () => {
    try {
      await triggerCronAutomation();
      await refreshData();
      toast.success('Fee & Expiry Reminders Cron Executed!');
    } catch (err: any) {
      toast.error('Cron Execution Error: ' + err.message);
    }
  };

  // ─── Portfolio ───────────────────────────────────────────────────────────────
  if (viewMode === 'portfolio') {
    return (
      <>
        <Toaster position="top-right" />
        <Portfolio onGoToAdmin={navigateToAdmin} />
      </>
    );
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  if (viewMode === 'login') {
    return (
      <>
        <Toaster position="top-right" />
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onGoToPortfolio={navigateToPortfolio}
        />
      </>
    );
  }

  // ─── Admin Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-transparent text-white font-sans overflow-hidden selection:bg-[#E51924] selection:text-white">
      <Toaster position="top-right" />

      {/* Left Sidebar — nav landmark added in Sidebar component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigatePortfolio={navigateToPortfolio}
        onLogout={handleLogout}
        expiringCount={stats.expiringMembers}
        outstandingDuesCount={members.filter((m) => m.remainingBalance > 0).length}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar — header landmark */}
        <header className="sticky top-0 z-20">
          {/* Mobile hamburger — only visible < lg */}
          <div className="lg:hidden flex items-center px-4 pt-3 pb-0">
            <button
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors mr-3"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <Topbar
            onQuickAddMember={() => setActiveTab('members')}
            onQuickAddPayment={() => setActiveTab('payments')}
            onQuickAttendance={() => setActiveTab('attendance')}
            onTriggerCron={handleTriggerCron}
            members={members}
            onSelectMember={(m) => setSelectedMember(m)}
          />
        </header>

        <main id="main-content" className="flex-1 p-6 max-w-7xl w-full mx-auto">

          {/* ── Skeleton while initial data loads ── */}
          {isLoading && activeTab === 'dashboard' && <DashboardSkeleton />}
          {isLoading && activeTab !== 'dashboard' && <TableSkeleton />}

          {/* ── Actual content (hidden during load via conditional render) ── */}
          {!isLoading && (
            <>
              {activeTab === 'dashboard' && (
                <GymDashboard
                  stats={stats}
                  members={members}
                  payments={payments}
                  attendance={attendance}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              )}

              {activeTab === 'members' && (
                <MembersModule
                  members={members}
                  onAddMember={async (mData) => {
                    await createMember(mData);
                    await refreshData();
                  }}
                  onUpdateMember={async (id, mData) => {
                    await updateMember(id, mData);
                    await refreshData();
                  }}
                  onDeleteMember={async (id) => {
                    await deleteMember(id);
                    await refreshData();
                  }}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsModule
                  payments={payments}
                  members={members}
                  preselectedMemberId={preselectedPayMemberId}
                  onRecordPayment={async (pData) => {
                    await createPayment(pData);
                    setPreselectedPayMemberId(undefined);
                    await refreshData();
                  }}
                  onDeletePayment={async (id) => {
                    await deletePayment(id);
                    await refreshData();
                  }}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceModule
                  attendance={attendance}
                  members={members}
                  onCheckInMember={async (mId, method) => {
                    const res = await checkInMember(mId, method);
                    await refreshData();
                    return res;
                  }}
                />
              )}

              {activeTab === 'trainers' && (
                <TrainersModule
                  trainers={trainers}
                  onAddTrainer={async (tData) => {
                    await createTrainer(tData);
                    await refreshData();
                  }}
                  onUpdateTrainer={async (id, tData) => {
                    await updateTrainer(id, tData);
                    await refreshData();
                  }}
                  onDeleteTrainer={async (id) => {
                    await deleteTrainer(id);
                    await refreshData();
                  }}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesModule
                  expenses={expenses}
                  onAddExpense={async (eData) => {
                    await createExpense(eData);
                    await refreshData();
                  }}
                  onDeleteExpense={async (id) => {
                    await deleteExpense(id);
                    await refreshData();
                  }}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsModule
                  payments={payments}
                  expenses={expenses}
                  members={members}
                  attendance={attendance}
                />
              )}

              {activeTab === 'whatsapp' && (
                <WhatsAppModule
                  members={members}
                  logs={reminderLogs}
                  onSendWhatsApp={async (mId, type, customMsg) => {
                    const res = await sendWhatsAppMessage(mId, type, customMsg);
                    await refreshData();
                    return res;
                  }}
                  onTriggerCron={handleTriggerCron}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsModal
                  settings={settings}
                  onSaveSettings={async (sData) => {
                    await updateSettings(sData);
                    await refreshData();
                  }}
                  onTriggerCron={handleTriggerCron}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Member Profile Drawer Modal */}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          payments={payments}
          attendance={attendance}
          onClose={() => setSelectedMember(null)}
          onRecordPaymentClick={(mId) => {
            setPreselectedPayMemberId(mId);
            setActiveTab('payments');
          }}
        />
      )}
    </div>
  );
}
