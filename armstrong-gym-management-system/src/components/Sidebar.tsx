import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, CreditCard, QrCode, Dumbbell,
  Receipt, BarChart3, MessageSquare, Settings, Globe, LogOut, X,
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
  /** Whether the drawer is open on mobile. Controlled by App.tsx. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, onNavigatePortfolio, onLogout,
  expiringCount, outstandingDuesCount, mobileOpen, onMobileClose,
}) => {
  const menuItems = [
    { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
    { id: 'members',    label: 'Members',            icon: Users,
      badge: expiringCount > 0 ? `${expiringCount} Expiring` : undefined,
      badgeColor: 'bg-[#E51924]/20 text-[#E51924] border-[#E51924]/30' },
    { id: 'payments',   label: 'Payments',           icon: CreditCard,
      badge: outstandingDuesCount > 0 ? `${outstandingDuesCount} Dues` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'attendance', label: 'Attendance',         icon: QrCode },
    { id: 'trainers',   label: 'Trainers',           icon: Dumbbell },
    { id: 'expenses',   label: 'Expenses',           icon: Receipt },
    { id: 'reports',    label: 'Reports',            icon: BarChart3 },
    { id: 'whatsapp',   label: 'WhatsApp Reminders', icon: MessageSquare },
    { id: 'settings',   label: 'Settings & Cron',   icon: Settings },
  ];

  // Close drawer when a tab is selected on mobile
  const handleTabClick = (id: string) => {
    setActiveTab(id as ActiveTab);
    onMobileClose();
  };

  // Close on Escape key
  const closeRef = useRef(onMobileClose);
  closeRef.current = onMobileClose;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) closeRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navContent = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-white/8 flex items-center justify-between">
        <Logo size="sm" showText={true} />
        {/* Close button — only visible on mobile inside the drawer */}
        <button
          onClick={onMobileClose}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Nav items */}
      <nav aria-label="Admin navigation" className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/30">
          Management
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[#E51924]/10 text-white border border-[#E51924]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#E51924]' : 'opacity-60 group-hover:opacity-100'
                  }`}
                  aria-hidden="true"
                />
                {item.label}
              </span>
              {item.badge && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-[#E51924] rounded-r-full shadow-sm shadow-[#E51924]/50"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/8 space-y-2">
        <button
          onClick={() => { onNavigatePortfolio(); onMobileClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white/70 bg-white/5 hover:bg-white/8 border border-white/10 transition-all group"
        >
          <span className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-[#E51924] group-hover:rotate-12 transition-transform" aria-hidden="true" />
            Public Website
          </span>
          <span className="text-[10px] text-white/30 bg-white/8 px-1.5 py-0.5 rounded font-mono" aria-hidden="true">/</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[#E51924] hover:bg-[#E51924]/10 border border-transparent hover:border-[#E51924]/20 transition-all"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar — always visible lg+ ── */}
      <aside
        aria-label="Admin sidebar"
        className="hidden lg:flex w-64 bg-[#0D0D0D] border-r border-white/8 flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none"
      >
        {navContent}
      </aside>

      {/* ── Mobile drawer + backdrop ── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <aside
        aria-label="Admin navigation menu"
        aria-modal="true"
        role="dialog"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0D0D0D] border-r border-white/8 flex flex-col justify-between select-none transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
};
