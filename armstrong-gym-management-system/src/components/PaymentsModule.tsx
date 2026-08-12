import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  Search,
  Trash2,
  Printer,
  IndianRupee,
  CheckCircle2,
  X,
  FileText,
  Calendar,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Eye,
  Send,
  AlertCircle,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { Payment, Member, PaymentMethod } from '../types';
import { verifyPayment } from '../api/client';
import toast from 'react-hot-toast';
import logoImg from '../assets/images/logo.jpg';

interface PaymentsModuleProps {
  payments: Payment[];
  members: Member[];
  onRecordPayment: (paymentData: {
    memberId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    transactionId?: string;
    billUrl?: string;
    verificationStatus?: string;
  }) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  preselectedMemberId?: string;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({
  payments,
  members,
  onRecordPayment,
  onDeletePayment,
  onRefreshData,
  preselectedMemberId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'verification'>('records');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(!!preselectedMemberId);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);
  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

  // Form states
  const [formMemberId, setFormMemberId] = useState(preselectedMemberId || '');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('UPI');
  const [formTransactionId, setFormTransactionId] = useState('');
  const [formBillUrl, setFormBillUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleAdminImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size should be under 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormBillUrl(event.target.result as string);
        toast.success('Bill image uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const pendingPayments = payments.filter((p) => p.verificationStatus === 'Pending Verification');

  // Auto set recommended due amount when selecting member
  const handleMemberSelectChange = (id: string) => {
    setFormMemberId(id);
    const m = members.find((mem) => mem.id === id);
    if (m && m.remainingBalance > 0) {
      setFormAmount(m.remainingBalance);
    } else {
      setFormAmount(0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId) {
      toast.error('Please select a member');
      return;
    }
    if (!formAmount || formAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      await onRecordPayment({
        memberId: formMemberId,
        amount: Number(formAmount),
        paymentMethod: formMethod,
        transactionId: formTransactionId || `TXN-${Date.now().toString().slice(-6)}`,
        billUrl: formBillUrl,
        verificationStatus: 'Verified', // Record directly as verified by admin
        notes: formNotes,
      });

      toast.success('Payment recorded successfully & portal balance updated!');
      closeModal();
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Error recording payment');
    }
  };

  const handleVerifyBill = async (p: Payment) => {
    setIsVerifyingId(p.id);
    try {
      const res = await verifyPayment(p.id);
      toast.success(`Transaction ${p.id} verified! Portal balance updated.`);
      if (res.whatsappUrl) {
        toast.success('Opening WhatsApp payment confirmation receipt...');
        window.open(res.whatsappUrl, '_blank');
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Error verifying transaction bill');
    } finally {
      setIsVerifyingId(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormMemberId('');
    setFormAmount(0);
    setFormTransactionId('');
    setFormBillUrl('');
    setFormNotes('');
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(search.toLowerCase()) ||
      p.memberId.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.paymentMethod.toLowerCase().includes(search.toLowerCase()) ||
      (p.transactionId && p.transactionId.toLowerCase().includes(search.toLowerCase()));

    if (activeSubTab === 'verification') {
      return matchesSearch && p.verificationStatus === 'Pending Verification';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Payments & Transaction Bills Verification</span>
          </h1>
          <p className="text-xs text-white/50">
            Verify member transaction receipts, update portal balances & issue WhatsApp receipts
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 flex items-center gap-2 transition-all hover:scale-102"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>+ Record Payment & Bill</span>
        </button>
      </div>

      {/* Sub-Tabs (Payment Records vs Pending Verification) */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-card border border-white/10 rounded-2xl p-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('records')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'records'
                ? 'bg-[#E51924] text-white shadow-md shadow-red-500/20'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Payment Records ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('verification')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'verification'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pending Bill Verification</span>
            {pendingPayments.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Receipt, Member ID, UTR..."
            className="w-full pl-10 pr-4 py-1.5 text-xs bg-white/5 text-white placeholder-white/30 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
          />
        </div>
      </div>

      {/* --- SUB-TAB CONTENT --- */}
      {activeSubTab === 'verification' ? (
        /* Transaction Bills Verification Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pending Transaction Bills Awaiting Admin Approval</span>
            </h2>
            <span className="text-xs text-white/40">
              Review transaction proof and click approve to automatically update member portal balance.
            </span>
          </div>

          {filteredPayments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPayments.map((p) => {
                const member = members.find((m) => m.id === p.memberId);
                return (
                  <div
                    key={p.id}
                    className="glass-card border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl hover:border-amber-500/60 transition-all relative"
                  >
                    <div className="flex items-start justify-between border-b border-white/10 pb-3">
                      <div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>AWAITING ADMIN VERIFICATION</span>
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{p.memberName}</h3>
                        <p className="text-[11px] font-mono text-white/50">Member ID: {p.memberId}</p>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-lg font-black text-amber-400">
                          Rs. {p.amount.toLocaleString('en-PK')}
                        </span>
                        <p className="text-[10px] text-white/40">{p.date}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-semibold">
                          Payment Method
                        </p>
                        <p className="font-mono text-white font-bold">{p.paymentMethod}</p>
                      </div>

                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-semibold">
                          UTR / Ref Transaction ID
                        </p>
                        <p className="font-mono text-cyan-400 font-bold truncate">
                          {p.transactionId || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-semibold">
                          Current Due Balance
                        </p>
                        <p className="font-mono text-rose-400 font-bold">
                          Rs. {member ? member.remainingBalance.toLocaleString('en-PK') : 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-semibold">
                          Balance After Approval
                        </p>
                        <p className="font-mono text-emerald-400 font-bold">
                          Rs. {member ? Math.max(0, member.remainingBalance - p.amount).toLocaleString('en-PK') : 0}
                        </p>
                      </div>
                    </div>

                    {/* Bill Receipt Image Proof Attachment */}
                    {p.billUrl ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/50 uppercase flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-400" />
                          <span>Submitted Transaction Bill Receipt Proof</span>
                        </p>
                        <div
                          onClick={() => setPreviewBillUrl(p.billUrl || null)}
                          className="relative h-28 w-full bg-black/60 rounded-xl overflow-hidden border border-white/10 cursor-pointer group hover:border-emerald-500 transition-all"
                        >
                          <img
                            src={p.billUrl}
                            alt="Transaction Bill Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            <Eye className="w-4 h-4 mr-1" />
                            <span>Click to Zoom Receipt</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/40 italic bg-white/5 p-2 rounded border border-white/10">
                        No image proof uploaded; verify UTR reference "{p.transactionId}" in bank statement.
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 text-white/80 border border-white/10 text-xs font-semibold flex items-center gap-1 hover:text-white hover:bg-white/10"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      <button
                        disabled={isVerifyingId === p.id}
                        onClick={() => handleVerifyBill(p)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:scale-102"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {isVerifyingId === p.id ? 'Updating Portal...' : 'Approve & Update Portal'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card border border-white/10 rounded-2xl p-12 text-center text-white/40 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Pending Transaction Bills</h3>
              <p className="text-xs text-white/40">
                All submitted payments and bills have been verified and updated on the member portal.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Payments Table View */
        <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receipt ID</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Method & UTR</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Portal Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-medium">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white/90">
                        {p.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{p.memberName}</p>
                        <p className="text-[10px] font-mono text-white/40">{p.memberId}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/10 font-mono text-[10px] font-semibold">
                            {p.paymentMethod}
                          </span>
                          {p.transactionId && (
                            <p className="text-[10px] font-mono text-cyan-400 truncate max-w-[120px]">
                              {p.transactionId}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-white/40 text-[11px]">
                        {p.date}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                        Rs. {p.amount.toLocaleString('en-PK')}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.verificationStatus === 'Pending Verification' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Pending Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified & Updated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.verificationStatus === 'Pending Verification' && (
                            <button
                              onClick={() => handleVerifyBill(p)}
                              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black flex items-center gap-1 transition-all"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Verify</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>

                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `Delete payment ${p.id} of Rs. ${p.amount}? Member balance will be recalculated.`
                                )
                              ) {
                                await onDeletePayment(p.id);
                                toast.success('Payment deleted & balance recalculated!');
                                if (onRefreshData) await onRefreshData();
                              }
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/40">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment & Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-white">Record Payment & Attach Bill</h2>
              <p className="text-xs text-white/50">
                Record fee payment, upload bill screenshot URL, and update portal status immediately.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Select Member *
                </label>
                <select
                  required
                  value={formMemberId}
                  onChange={(e) => handleMemberSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id}) — Outstanding Due: Rs. {m.remainingBalance.toLocaleString('en-PK')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Payment Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-emerald-400 rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  >
                    <option value="UPI">UPI / Mobile Wallet</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Net Banking">Net Banking / Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-9812304"
                    value={formTransactionId}
                    onChange={(e) => setFormTransactionId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Attach Bill / Receipt Screenshot (Upload Image)
                </label>

                <input
                  type="file"
                  id="admin-bill-file-upload"
                  accept="image/*"
                  onChange={handleAdminImageFileUpload}
                  className="hidden"
                />

                {!formBillUrl ? (
                  <label
                    htmlFor="admin-bill-file-upload"
                    className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-[#E51924] rounded-xl cursor-pointer transition-all group text-center"
                  >
                    <Upload className="w-4 h-4 text-[#E51924] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white group-hover:text-[#E51924]">
                      Upload Bill Image File
                    </span>
                  </label>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-emerald-500/40 bg-black/80 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Bill Image Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormBillUrl('')}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/30"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    </div>
                    {formBillUrl.startsWith('data:image') || formBillUrl.startsWith('http') ? (
                      <div className="h-28 w-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-white/10">
                        <img
                          src={formBillUrl}
                          alt="Bill Proof Preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fees cleared for 2nd installment"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E51924] text-white text-xs font-extrabold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Record & Update Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Proof Zoom Image Modal */}
      {previewBillUrl && (
        <div
          onClick={() => setPreviewBillUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl w-full bg-[#0D0D0D] border border-white/15 rounded-3xl p-4 overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewBillUrl(null)}
              className="absolute top-4 right-4 text-white bg-black/80 p-2 rounded-full hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-extrabold text-white mb-2">Submitted Transaction Bill Proof</p>
            <img
              src={previewBillUrl}
              alt="Transaction Receipt Zoom"
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-sm font-extrabold text-white">Fee Payment Receipt</h3>
              <p className="text-[11px] text-white/50">Armstrong Gym Official Voucher</p>
            </div>

            {/* Receipt Box */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="Armstrong Gym Logo" className="h-10 w-auto rounded-lg" />
                  <div>
                    <p className="text-[10px] text-white/40">Lahore, Pakistan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{selectedReceipt.id}</p>
                  <p className="text-[10px] text-white/40">{selectedReceipt.date}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-white/80">
                <p className="flex justify-between">
                  <span className="text-white/40">Member Name:</span>
                  <span className="font-bold text-white">{selectedReceipt.memberName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">Member ID:</span>
                  <span>{selectedReceipt.memberId}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">Payment Method:</span>
                  <span>{selectedReceipt.paymentMethod}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">Transaction UTR:</span>
                  <span className="text-cyan-400 font-bold">{selectedReceipt.transactionId || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/40">Portal Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedReceipt.verificationStatus || 'Verified'}</span>
                </p>
              </div>

              <div className="border-t border-white/10 pt-3 flex justify-between items-baseline text-sm">
                <span className="font-bold text-white/90">Amount Received:</span>
                <span className="font-black text-emerald-400 text-lg">
                  Rs. {selectedReceipt.amount.toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Payment Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
