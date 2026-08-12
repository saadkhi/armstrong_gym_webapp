import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
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

export default function App() {
  const [viewMode, setViewMode] = useState<'portfolio' | 'admin' | 'login'>('portfolio');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('armstrong_admin_token')
  );

  // Force-logout on any 401 from the API — only when in the admin view
  useEffect(() => {
    const onUnauthorized = () => {
      // Only react when the user is actively using the admin dashboard.
      // Ignore 401s on portfolio (no token) and login (token not yet issued).
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

  // Sync URL hash or route (/ vs /gym)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.includes('gymadminportal') || path.startsWith('/gym') || hash.includes('gymadminportal') || hash === '#gym') {
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
  const refreshData = async () => {
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
    }
  };

  useEffect(() => {
    // Only fetch protected data when the admin dashboard is actually active
    if (viewMode !== 'admin') return;
    refreshData();
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

  // Cron execution handler
  const handleTriggerCron = async () => {
    try {
      await triggerCronAutomation();
      await refreshData();
      toast.success('Fee & Expiry Reminders Cron Executed!');
    } catch (err: any) {
      toast.error('Cron Execution Error: ' + err.message);
    }
  };

  // Render Public Portfolio if viewMode === 'portfolio'
  if (viewMode === 'portfolio') {
    return (
      <>
        <Toaster position="top-right" />
        <Portfolio onGoToAdmin={navigateToAdmin} />
      </>
    );
  }

  // Render Login Modal if viewMode === 'login'
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

  // Render Full Admin Dashboard
  return (
    <div className="flex h-screen bg-transparent text-white font-sans overflow-hidden selection:bg-[#E51924] selection:text-white">
      <Toaster position="top-right" />

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigatePortfolio={navigateToPortfolio}
        onLogout={handleLogout}
        expiringCount={stats.expiringMembers}
        outstandingDuesCount={members.filter((m) => m.remainingBalance > 0).length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Topbar
          onQuickAddMember={() => setActiveTab('members')}
          onQuickAddPayment={() => setActiveTab('payments')}
          onQuickAttendance={() => setActiveTab('attendance')}
          onTriggerCron={handleTriggerCron}
          members={members}
          onSelectMember={(m) => setSelectedMember(m)}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
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
