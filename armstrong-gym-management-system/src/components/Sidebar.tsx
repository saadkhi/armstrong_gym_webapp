import React from 'react';
import {
  LayoutDashboard, Users, CreditCard, QrCode, Dumbbell,
  Receipt, BarChart3, MessageSquare, Settings, Globe, LogOut,
} from 'lucide-react';
import { Logo } from './Logo';

export type ActiveTab =
  | 'dashboard' | 'members' | 'payments' | 'attendance'
  | 'trainers'  | 'expenses' | 'reports'  | 'whatsapp' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNavigatePortfolio: () => void;
  onLogout: () => void;
  expiringCount: number;
  outstandingDuesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, onNavigatePortfolio, onLogout, expiringCount, outstandingDuesCount,
}) => {
  const menuItems = [
    { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
    { id: 'members',    label: 'Members',              icon: Users,
      badge: expiringCount > 0 ? `${expiringCount} Expiring` : undefined,
      badgeColor: 'bg-[#E51924]/20 text-[#E51924] border-[#E51924]/30' },
    { id: 'payments',   label: 'Payments',             icon: CreditCard,
      badge: outstandingDuesCount > 0 ? `${outstandingDuesCount} Dues` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'attendance', label: 'Attendance',           icon: QrCode },
    { id: 'trainers',   label: 'Trainers',             icon: Dumbbell },
    { id: 'expenses',   label: 'Expenses',             icon: Receipt },
    { id: 'reports',    label: 'Reports',              icon: BarChart3 },
    { id: 'whatsapp',   label: 'WhatsApp Reminders',   icon: MessageSquare },
    { id: 'settings',   label: 'Settings & Cron',      icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0D0D0D] border-r border-white/8 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-white/8">
          <Logo size="sm" showText={true} />
        </div>

        {/* Nav */}
        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/30">
            Management
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#E51924]/10 text-white border border-[#E51924]/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#E51924]' : 'opacity-60 group-hover:opacity-100'
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#E51924] rounded-r-full shadow-sm shadow-[#E51924]/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/8 space-y-2">
        <button
          onClick={onNavigatePortfolio}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white/70 bg-white/5 hover:bg-white/8 border border-white/10 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-[#E51924] group-hover:rotate-12 transition-transform" />
            <span>Public Website</span>
          </div>
          <span className="text-[10px] text-white/30 bg-white/8 px-1.5 py-0.5 rounded font-mono">/</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#E51924] hover:bg-[#E51924]/10 border border-transparent hover:border-[#E51924]/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
