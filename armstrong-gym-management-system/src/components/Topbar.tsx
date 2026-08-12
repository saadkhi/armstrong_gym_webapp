import React, { useState } from 'react';
import { Search, UserPlus, QrCode, RefreshCw, Clock } from 'lucide-react';
import { Member } from '../types';

interface TopbarProps {
  onQuickAddMember: () => void;
  onQuickAddPayment: () => void;
  onQuickAttendance: () => void;
  onTriggerCron: () => void;
  members: Member[];
  onSelectMember: (member: Member) => void;
  adminName?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onQuickAddMember, onQuickAttendance, onTriggerCron,
  members, onSelectMember, adminName = 'Armstrong Admin',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredMembers = searchQuery.trim()
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phone.includes(searchQuery)
      )
    : [];

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="h-16 bg-[#0D0D0D] border-b border-white/8 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search */}
      <div className="relative w-72 md:w-96">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search member by ID, name, phone..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 text-white placeholder-white/30 rounded-full border border-white/10 focus:outline-none focus:border-[#E51924]/60 focus:ring-1 focus:ring-[#E51924]/30 font-medium uppercase tracking-wider transition-all"
          />
        </div>

        {showResults && searchQuery.trim().length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-[#111111] border border-white/12 rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50 p-2 divide-y divide-white/8"
            onMouseLeave={() => setShowResults(false)}
          >
            {filteredMembers.length > 0 ? filteredMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => { onSelectMember(m); setSearchQuery(''); setShowResults(false); }}
                className="w-full text-left p-2.5 hover:bg-white/8 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <img src={m.photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15" />
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#E51924] transition-colors">{m.name}</p>
                    <p className="text-[10px] text-white/40 font-mono">{m.id} • {m.phone}</p>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  m.status === 'Active'   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  m.status === 'Expiring' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            'bg-[#E51924]/20 text-[#E51924] border border-[#E51924]/30'
                }`}>{m.status}</span>
              </button>
            )) : (
              <div className="p-4 text-center text-xs font-bold uppercase tracking-wider text-white/30">
                No matching members found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-extrabold uppercase tracking-widest text-white/50 font-mono">
          <Clock className="w-3.5 h-3.5 text-[#E51924]" />
          <span>{formattedDate}</span>
        </div>

        <button
          onClick={onTriggerCron}
          title="Run Daily Fee & Expiry Reminder Cron Job"
          className="p-2 rounded-full bg-white/5 hover:bg-white/8 text-white/70 hover:text-white border border-white/10 transition-all text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 group"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#E51924] group-hover:rotate-180 transition-transform duration-500" />
          <span className="hidden sm:inline">RUN CRON</span>
        </button>

        <button
          onClick={onQuickAttendance}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E51924] text-white hover:bg-red-600 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#E51924]/25"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SCAN QR</span>
        </button>

        <button
          onClick={onQuickAddMember}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/8 text-white text-xs font-black uppercase tracking-widest border border-white/15 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ MEMBER</span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/8">
          <div className="w-8 h-8 rounded-full bg-[#E51924] flex items-center justify-center font-black text-xs text-white shadow-md shadow-[#E51924]/30">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};
