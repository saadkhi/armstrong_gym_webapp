import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  Copy,
  Sparkles,
  DollarSign,
  Check,
} from 'lucide-react';
import { Member, ReminderLog } from '../types';
import { sendBatchWhatsAppUnpaid } from '../api/client';
import toast from 'react-hot-toast';

interface WhatsAppModuleProps {
  members: Member[];
  logs: ReminderLog[];
  onSendWhatsApp: (
    memberId: string,
    type: string,
    customMessage?: string
  ) => Promise<{ success: boolean; whatsappUrl: string; log: ReminderLog }>;
  onTriggerCron: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const WhatsAppModule: React.FC<WhatsAppModuleProps> = ({
  members,
  logs,
  onSendWhatsApp,
  onTriggerCron,
  onRefreshData,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [messageType, setMessageType] = useState<
    'Fee Reminder' | 'Expiry Reminder' | 'Expired Notice' | 'Custom'
  >('Fee Reminder');
  const [customMsg, setCustomMsg] = useState('');
  const [search, setSearch] = useState('');

  // Unpaid batch broadcast state
  const unpaidMembers = members.filter((m) => m.remainingBalance > 0);
  const totalUnpaidDues = unpaidMembers.reduce((sum, m) => sum + m.remainingBalance, 0);

  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState<string[]>(
    unpaidMembers.map((m) => m.id)
  );
  const [batchTemplate, setBatchTemplate] = useState(
    'Dear {Name}, your Armstrong Gym fee balance of ₹{Balance} for your {Plan} plan is pending. Please complete your payment via UPI/Cash and submit your transaction receipt to gym admin. Thank you!'
  );
  const [batchDispatchResults, setBatchDispatchResults] = useState<
    Array<{
      memberId: string;
      memberName: string;
      phone: string;
      remainingBalance: number;
      message: string;
      whatsappUrl: string;
    }>
  >([]);
  const [isSendingBatch, setIsSendingBatch] = useState(false);

  // Toggle selection for individual unpaid member
  const toggleUnpaidMember = (id: string) => {
    setSelectedUnpaidIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUnpaid = () => {
    if (selectedUnpaidIds.length === unpaidMembers.length) {
      setSelectedUnpaidIds([]);
    } else {
      setSelectedUnpaidIds(unpaidMembers.map((m) => m.id));
    }
  };

  const handleBatchBroadcast = async () => {
    if (selectedUnpaidIds.length === 0) {
      toast.error('Please select at least one unpaid client to send automated messages.');
      return;
    }

    setIsSendingBatch(true);
    try {
      const res = await sendBatchWhatsAppUnpaid(selectedUnpaidIds, batchTemplate);
      toast.success(res.message);
      setBatchDispatchResults(res.dispatchList);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Error executing batch WhatsApp automation');
    } finally {
      setIsSendingBatch(false);
    }
  };

  const handleSendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }

    try {
      const res = await onSendWhatsApp(selectedMemberId, messageType, customMsg);
      toast.success('WhatsApp message logged! Opening WhatsApp Web...');
      window.open(res.whatsappUrl, '_blank');
      setCustomMsg('');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Error sending WhatsApp message');
    }
  };

  const copyAllBatchLinks = () => {
    if (batchDispatchResults.length === 0) return;
    const text = batchDispatchResults
      .map((item) => `${item.memberName} (${item.phone}):\n${item.whatsappUrl}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied all batch WhatsApp links to clipboard!');
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.memberName.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp Automation & Fee Reminders</span>
          </h1>
          <p className="text-xs text-white/50">
            Dispatch automated fee reminders to all clients who haven't paid fees & view audit logs
          </p>
        </div>

        <button
          onClick={async () => {
            await onTriggerCron();
            if (onRefreshData) await onRefreshData();
            toast.success('Daily Fee & Expiry Cron Automation Executed!');
          }}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-[#E51924] border border-[#E51924]/20 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <span>Execute Daily Fee Cron Job</span>
        </button>
      </div>

      {/* --- AUTOMATED UNPAID CLIENTS BROADCAST PANEL --- */}
      <div className="glass-card border border-red-500/30 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[#E51924] text-[10px] font-extrabold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>AUTOMATED FEE DISPATCH ENGINE</span>
            </div>
            <h2 className="text-base font-extrabold text-white">
              Send Automated WhatsApp Message to All Unpaid Clients
            </h2>
            <p className="text-xs text-white/50">
              Scans all members with pending fees and generates personalized WhatsApp payment links
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40">Pending Dues</p>
              <p className="text-sm font-black text-emerald-400">
                ₹{totalUnpaidDues.toLocaleString('en-PK')}{' '}
                <span className="text-xs text-white/40 font-normal">
                  ({unpaidMembers.length} Unpaid Members)
                </span>
              </p>
            </div>
          </div>
        </div>

        {unpaidMembers.length > 0 ? (
          <div className="space-y-4">
            {/* Unpaid Clients Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/80">
                  Select Unpaid Clients to Receive Automated Message ({selectedUnpaidIds.length}/{unpaidMembers.length}):
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAllUnpaid}
                  className="text-[#E51924] hover:underline font-bold text-[11px]"
                >
                  {selectedUnpaidIds.length === unpaidMembers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-black/60 rounded-xl border border-white/10">
                {unpaidMembers.map((m) => {
                  const isSelected = selectedUnpaidIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleUnpaidMember(m.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/40 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            isSelected
                              ? 'bg-[#E51924] border-red-400 text-white font-black'
                              : 'border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{m.name}</p>
                          <p className="text-[10px] text-white/40 font-mono">{m.phone}</p>
                        </div>
                      </div>

                      <div className="text-right pl-2">
                        <span className="text-xs font-mono font-extrabold text-amber-400">
                          ₹{m.remainingBalance.toLocaleString('en-PK')}
                        </span>
                        <p className="text-[9px] text-white/40">{m.planType}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template Preview / Editor */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Automated Message Template (Supports placeholders: <span className="font-mono text-emerald-400">&#123;Name&#125;</span>, <span className="font-mono text-emerald-400">&#123;Balance&#125;</span>, <span className="font-mono text-emerald-400">&#123;Plan&#125;</span>):
              </label>
              <textarea
                rows={2}
                value={batchTemplate}
                onChange={(e) => setBatchTemplate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-black/60 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] font-mono"
              />
            </div>

            {/* Trigger Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                disabled={isSendingBatch || selectedUnpaidIds.length === 0}
                onClick={handleBatchBroadcast}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E51924] hover:bg-red-600 disabled:opacity-50 text-white font-black text-xs shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 hover:scale-101"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSendingBatch
                    ? 'Dispatching Automated Messages...'
                    : `Send Automated Fee Reminders to ${selectedUnpaidIds.length} Unpaid Clients`}
                </span>
              </button>

              {batchDispatchResults.length > 0 && (
                <button
                  type="button"
                  onClick={copyAllBatchLinks}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All WhatsApp Links</span>
                </button>
              )}
            </div>

            {/* Generated Batch Results list with WhatsApp links */}
            {batchDispatchResults.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h3 className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Successfully Generated Automated WhatsApp Links for {batchDispatchResults.length} Clients
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {batchDispatchResults.map((item) => (
                    <div
                      key={item.memberId}
                      className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.memberName}</span>
                        <span className="text-xs font-mono font-black text-amber-400">
                          Due: ₹{item.remainingBalance.toLocaleString('en-PK')}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60 line-clamp-2 italic font-mono bg-white/5 p-1.5 rounded border border-white/10">
                        "{item.message}"
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-white/40 font-mono">{item.phone}</span>
                        <a
                          href={item.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open WhatsApp Web</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-white/50 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">All Clear! No Pending Dues Detected</p>
            <p className="text-xs text-white/40">
              All registered members have paid their membership fees in full.
            </p>
          </div>
        )}
      </div>

      {/* Direct Individual WhatsApp Message Form */}
      <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-extrabold text-white">Send Individual Custom WhatsApp Message</h2>

        <form onSubmit={handleSendSingle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Select Recipient Member *
              </label>
              <select
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.phone}) — {m.status} (Due: ₹{m.remainingBalance.toLocaleString('en-PK')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Template Category
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
              >
                <option value="Fee Reminder">Fee Balance Pending Reminder</option>
                <option value="Expiry Reminder">Membership Expiring Soon Notice</option>
                <option value="Expired Notice">Membership Expired Reactivation</option>
                <option value="Custom">Custom WhatsApp Message</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              rows={2}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Leave empty to use automatic smart template based on category..."
              className="w-full px-3.5 py-2 text-xs bg-black/60 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
            <span>Send Individual Message</span>
          </button>
        </form>
      </div>

      {/* Reminder Logs History */}
      <div className="glass-card border border-white/10 rounded-2xl p-4 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E51924]" />
            <span>Automated Reminder Audit Logs ({logs.length})</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs by name or phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-black/60 text-white placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Message Preview</th>
                <th className="py-3 px-4">Sent Time</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-white/40">{l.id}</td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{l.memberName}</p>
                      <p className="text-[10px] font-mono text-white/40">{l.phone}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-white/10 text-[10px] font-mono font-bold">
                        {l.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-white/70 text-[11px]">
                      {l.message}
                    </td>

                    <td className="py-3 px-4 font-mono text-white/40 text-[11px]">{l.sentAt}</td>

                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No reminder logs found.
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
