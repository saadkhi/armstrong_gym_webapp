import React, { useState, useRef } from 'react';
import {
  Users, UserPlus, Search, Filter, QrCode, CreditCard, Trash2, Edit, Eye,
  CheckCircle2, AlertTriangle, XCircle, Phone, Mail, Calendar, X,
  Printer, Sparkles, Camera, Upload, UserCircle2, RefreshCw,
} from 'lucide-react';
import { Member, MembershipPlanType } from '../types';
import toast from 'react-hot-toast';
import logoImg from '../assets/images/logo.jpg';
import { ConfirmDialog } from './ConfirmDialog';
import { uploadImage, renewMember } from '../api/client';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface MembersModuleProps {
  members: Member[];
  onAddMember: (memberData: Partial<Member>) => Promise<void>;
  onUpdateMember: (id: string, memberData: Partial<Member>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onSelectMember: (member: Member) => void;
  onRefresh?: () => Promise<void>;
}

export const MembersModule: React.FC<MembersModuleProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSelectMember,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formPlanType, setFormPlanType] = useState<MembershipPlanType>('Monthly');
  const [formPlanCost, setFormPlanCost] = useState(2500);
  const [formAmountPaid, setFormAmountPaid] = useState(2500);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPhotoUrl, setFormPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  );
  const [formNotes, setFormNotes] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Renewal modal state
  const [renewTarget, setRenewTarget] = useState<Member | null>(null);
  const [renewPlanType, setRenewPlanType] = useState<MembershipPlanType>('Monthly');
  const [renewPlanCost, setRenewPlanCost] = useState(2500);
  const [renewAmountPaid, setRenewAmountPaid] = useState(2500);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('Cash');
  const [renewTxnId, setRenewTxnId] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);
  const renewModalRef = useFocusTrap<HTMLDivElement>(!!renewTarget);

  const openRenew = (m: Member) => {
    setRenewTarget(m);
    setRenewPlanType(m.planType);
    setRenewPlanCost(m.planCost);
    setRenewAmountPaid(m.planCost); // default: pay in full
    setRenewPaymentMethod('Cash');
    setRenewTxnId('');
  };

  const handleRenewPlanChange = (plan: MembershipPlanType) => {
    setRenewPlanType(plan);
    const costs: Record<MembershipPlanType, number> = {
      Monthly: 2500, Quarterly: 6000, 'Half-Yearly': 10000, Yearly: 18000,
    };
    setRenewPlanCost(costs[plan]);
    setRenewAmountPaid(costs[plan]);
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTarget) return;
    setIsRenewing(true);
    try {
      await renewMember(renewTarget.id, {
        planType: renewPlanType,
        planCost: renewPlanCost,
        amountPaid: renewAmountPaid,
        paymentMethod: renewPaymentMethod,
        transactionId: renewTxnId || undefined,
        notes: `Renewal — ${renewPlanType} plan`,
      });
      toast.success(`✓ ${renewTarget.name}'s membership renewed!`);
      setRenewTarget(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Renewal failed');
    } finally {
      setIsRenewing(false);
    }
  };

  // Focus trap for the add/edit modal
  const modalRef = useFocusTrap<HTMLDivElement>(showAddModal);

  // Photo file input refs — separate inputs so capture attribute is static
  const photoInputRef = useRef<HTMLInputElement>(null);       // gallery
  const photoCameraRef = useRef<HTMLInputElement>(null);      // camera

  // Upload selected file to Cloudinary; fall back to base64 if unavailable
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read as data-URI first so we always have a local preview immediately
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUri = ev.target?.result as string;
      if (!dataUri) return;
      setFormPhotoUrl(dataUri); // show preview instantly
      // Then upload to Cloudinary in the background
      setIsUploadingPhoto(true);
      try {
        const url = await uploadImage(dataUri, 'members');
        setFormPhotoUrl(url);
      } catch {
        // keep data-URI as fallback — toast is informational only
        toast.error('Photo upload failed — photo will be stored locally');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // Auto set plan cost when planType changes
  const handlePlanTypeChange = (plan: MembershipPlanType) => {
    setFormPlanType(plan);
    if (plan === 'Monthly') setFormPlanCost(2500);
    else if (plan === 'Quarterly') setFormPlanCost(6000);
    else if (plan === 'Half-Yearly') setFormPlanCost(10000);
    else if (plan === 'Yearly') setFormPlanCost(18000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      toast.error('Name and Phone are required');
      return;
    }

    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, {
          name: formName,
          email: formEmail,
          phone: formPhone,
          gender: formGender,
          planType: formPlanType,
          planCost: Number(formPlanCost),
          amountPaid: Number(formAmountPaid),
          startDate: formStartDate,
          photoUrl: formPhotoUrl,
          notes: formNotes,
        });
        toast.success(`Member ${editingMember.id} updated!`);
      } else {
        await onAddMember({
          name: formName,
          email: formEmail,
          phone: formPhone,
          gender: formGender,
          planType: formPlanType,
          planCost: Number(formPlanCost),
          amountPaid: Number(formAmountPaid),
          startDate: formStartDate,
          photoUrl: formPhotoUrl,
          notes: formNotes,
        });
        toast.success('New Member registered with Auto ID!');
      }

      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error saving member');
    }
  };

  const openEdit = (m: Member) => {
    setEditingMember(m);
    setFormName(m.name);
    setFormEmail(m.email || '');
    setFormPhone(m.phone);
    setFormGender(m.gender);
    setFormPlanType(m.planType);
    setFormPlanCost(m.planCost);
    setFormAmountPaid(m.amountPaid);
    setFormStartDate(m.startDate);
    setFormPhotoUrl(m.photoUrl || '');
    setFormNotes(m.notes || '');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPlanCost(2500);
    setFormAmountPaid(2500);
    setFormNotes('');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);

    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && m.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Members Directory</span>
          </h1>
          <p className="text-xs text-white/50">
            Manage gym memberships, auto GM IDs, QR passes & balance calculations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 flex items-center gap-2 transition-all hover:scale-102"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Register Member</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID (GM-001), Name, Phone..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#0A0A0A] text-white placeholder-white/30 rounded-xl border border-white/8 focus:outline-none focus:border-[#E51924]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'Active', 'Expiring', 'Expired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-[#E51924] text-white font-bold shadow-md shadow-[#E51924]/20'
                  : 'bg-[#0A0A0A] text-white/50 hover:text-white border border-white/8'
              }`}
            >
              {st} ({st === 'All' ? members.length : members.filter((m) => m.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs mobile-card-table">
            <thead className="bg-white/5 text-white/50 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 sm:px-4">Member</th>
                <th className="py-3.5 px-4">Plan & Expiry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Paid / Balance</th>
                <th className="py-3.5 px-4">QR & Card</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 sm:px-4" data-label="Member">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20"
                        />
                        <div>
                          <p
                            onClick={() => onSelectMember(m)}
                            className="font-bold text-white hover:text-[#ff3e3e] cursor-pointer transition-colors"
                          >
                            {m.name}
                          </p>
                          <p className="text-[10px] font-mono text-white/40">
                            {m.id} • {m.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white/90">{m.planType} Plan</p>
                      <p className="text-[10px] text-white/40 font-mono">
                        Exp: {m.expiryDate}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          m.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : m.status === 'Expiring'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {m.status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                        {m.status === 'Expiring' && <AlertTriangle className="w-3 h-3" />}
                        {m.status === 'Expired' && <XCircle className="w-3 h-3" />}
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <p className="text-emerald-400 font-bold">
                        Rs. {m.amountPaid.toLocaleString('en-PK')}
                      </p>
                      {m.remainingBalance > 0 ? (
                        <p className="text-[10px] text-rose-400 font-bold">
                          Due: Rs. {m.remainingBalance.toLocaleString('en-PK')}
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/40">Paid in Full</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setShowCardModal(m)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Pass Card</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectMember(m)}
                          title="View Profile"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          title="Edit Member"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {(m.status === 'Expiring' || m.status === 'Expired') && (
                          <button
                            onClick={() => openRenew(m)}
                            title="Renew Membership"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmTarget(m)}
                          title="Delete Member"
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
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No members match search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
          <div ref={modalRef} className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative my-8">
            <button onClick={closeModal} aria-label="Close modal" className="absolute top-5 right-5 text-white/50 hover:text-white">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div>
              <h2 id="member-modal-title" className="text-lg font-black text-white">
                {editingMember ? `Edit Member: ${editingMember.id}` : 'Register New Member'}
              </h2>
              <p className="text-xs text-white/50">
                {editingMember ? 'Update membership plan, contact, or photo.' : 'Auto ID (GM-XXX) will be assigned automatically.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="member-name" className="block text-xs font-semibold text-white/80 mb-1">Full Name *</label>
                <input id="member-name" type="text" required placeholder="e.g. Tariq Mahmood" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="member-phone" className="block text-xs font-semibold text-white/80 mb-1">Phone Number *</label>
                  <input id="member-phone" type="tel" required placeholder="+92 300 1234567" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
                <div>
                  <label htmlFor="member-gender" className="block text-xs font-semibold text-white/80 mb-1">Gender</label>
                  <select id="member-gender" value={formGender} onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="member-plan" className="block text-xs font-semibold text-white/80 mb-1">Membership Plan Type</label>
                <select id="member-plan" value={formPlanType} onChange={(e) => handlePlanTypeChange(e.target.value as MembershipPlanType)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]">
                  <option value="Monthly">Monthly Pass (1 Month — Rs. 2,500)</option>
                  <option value="Quarterly">Quarterly Beast (3 Months — Rs. 6,000)</option>
                  <option value="Half-Yearly">Half-Yearly Elite (6 Months — Rs. 10,000)</option>
                  <option value="Yearly">Yearly Champion (12 Months — Rs. 18,000)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="member-plan-cost" className="block text-xs font-semibold text-white/80 mb-1">Total Plan Cost (Rs.)</label>
                  <input id="member-plan-cost" type="number" value={formPlanCost} onChange={(e) => setFormPlanCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
                <div>
                  <label htmlFor="member-amount-paid" className="block text-xs font-semibold text-white/80 mb-1">Initial Payment Paid (Rs.)</label>
                  <input id="member-amount-paid" type="number" value={formAmountPaid} onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
              </div>

              <div>
                <label htmlFor="member-start-date" className="block text-xs font-semibold text-white/80 mb-1">Start Date</label>
                <input id="member-start-date" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Member Photo</label>
                <input ref={photoInputRef} id="member-photo-gallery" type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
                <input ref={photoCameraRef} id="member-photo-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFileChange} />
                <div className="flex items-center gap-4">
                  <div onClick={() => photoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-[#E51924]/60 cursor-pointer flex-shrink-0 transition-all group bg-white/5"
                    title="Click to upload or take photo" role="button" aria-label="Upload member photo">
                    {formPhotoUrl ? <img src={formPhotoUrl} alt="Member photo preview" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle2 className="w-10 h-10 text-white/20 group-hover:text-[#E51924]/50 transition-colors" aria-hidden="true" />
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center" aria-label="Uploading photo">
                        <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                        </svg>
                      </div>
                    )}
                    {!isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <button type="button" onClick={() => photoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E51924]/40 text-white/70 hover:text-white text-xs font-semibold transition-all">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Upload from Gallery
                    </button>
                    <button type="button" onClick={() => photoCameraRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E51924]/40 text-white/70 hover:text-white text-xs font-semibold transition-all">
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" /> Take a Photo
                    </button>
                    {formPhotoUrl && (
                      <button type="button" onClick={() => setFormPhotoUrl('')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white/3 hover:bg-red-500/10 border border-white/8 hover:border-red-500/30 text-white/40 hover:text-red-400 text-xs font-semibold transition-all">
                        <X className="w-3 h-3" aria-hidden="true" /> Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20">Cancel</button>
                <button type="submit" disabled={isUploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-[#E51924] text-white text-xs font-extrabold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploadingPhoto ? 'Uploading photo…' : editingMember ? 'Save Changes' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Membership Pass Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCardModal(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-sm font-extrabold text-white">Digital Membership Pass</h3>
              <p className="text-[11px] text-white/50">Armstrong Gym Official Card</p>
            </div>

            {/* Printable Pass Card */}
            <div className="bg-gradient-to-br from-black via-[#141414] to-black border-2 border-red-500/60 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <img src={logoImg} alt="Armstrong Gym Logo" className="h-8 w-auto rounded-lg" />
                </div>
                <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  {showCardModal.id}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={showCardModal.photoUrl}
                  alt={showCardModal.name}
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-red-500/60 shadow-md"
                />
                <div>
                  <p className="font-extrabold text-sm text-white">{showCardModal.name}</p>
                  <p className="text-[11px] text-white/60">{showCardModal.phone}</p>
                  <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                    {showCardModal.planType} Plan
                  </p>
                </div>
              </div>

              {/* QR Code SVG / Visual */}
              <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center space-y-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    showCardModal.id
                  )}`}
                  alt="Member QR Code"
                  className="w-24 h-24"
                />
                <span className="text-[9px] font-mono font-bold text-black">
                  SCAN FOR ENTRY: {showCardModal.id}
                </span>
              </div>

              <div className="text-[10px] text-white/50 flex justify-between font-mono pt-1">
                <span>Valid Until: {showCardModal.expiryDate}</span>
                <span className="text-emerald-400 font-bold">{showCardModal.status}</span>
              </div>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Pass Card</span>
            </button>
          </div>
        </div>
      )}

      {/* Membership Renewal Modal */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="renew-modal-title">
          <div ref={renewModalRef} className="bg-[#0D0D0D] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <button onClick={() => setRenewTarget(null)} aria-label="Close modal" className="absolute top-5 right-5 text-white/50 hover:text-white">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest mb-2">
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                MEMBERSHIP RENEWAL
              </div>
              <h2 id="renew-modal-title" className="text-lg font-black text-white">
                Renew — {renewTarget.name}
              </h2>
              <p className="text-xs text-white/50">
                {renewTarget.status === 'Expired'
                  ? `Expired on ${renewTarget.expiryDate}. New plan starts from today.`
                  : `Expires ${renewTarget.expiryDate}. New plan extends from that date.`}
              </p>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label htmlFor="renew-plan" className="block text-xs font-semibold text-white/80 mb-1">New Plan *</label>
                <select id="renew-plan" value={renewPlanType} onChange={(e) => handleRenewPlanChange(e.target.value as MembershipPlanType)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500">
                  <option value="Monthly">Monthly — Rs. 2,500</option>
                  <option value="Quarterly">Quarterly — Rs. 6,000</option>
                  <option value="Half-Yearly">Half-Yearly — Rs. 10,000</option>
                  <option value="Yearly">Yearly — Rs. 18,000</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="renew-cost" className="block text-xs font-semibold text-white/80 mb-1">Plan Cost (Rs.)</label>
                  <input id="renew-cost" type="number" min={0} value={renewPlanCost} onChange={(e) => setRenewPlanCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 font-mono" />
                </div>
                <div>
                  <label htmlFor="renew-paid" className="block text-xs font-semibold text-white/80 mb-1">Amount Paid (Rs.)</label>
                  <input id="renew-paid" type="number" min={0} value={renewAmountPaid} onChange={(e) => setRenewAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-emerald-400 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 font-mono font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="renew-method" className="block text-xs font-semibold text-white/80 mb-1">Payment Method</label>
                  <select id="renew-method" value={renewPaymentMethod} onChange={(e) => setRenewPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="renew-txn" className="block text-xs font-semibold text-white/80 mb-1">Transaction ID</label>
                  <input id="renew-txn" type="text" placeholder="Optional" value={renewTxnId} onChange={(e) => setRenewTxnId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 font-mono" />
                </div>
              </div>

              {renewAmountPaid < renewPlanCost && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Partial payment — Rs. {(renewPlanCost - renewAmountPaid).toLocaleString('en-PK')} will remain as outstanding balance.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRenewTarget(null)} className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20">Cancel</button>
                <button type="submit" disabled={isRenewing}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${isRenewing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {isRenewing ? 'Renewing…' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete Member"
        message={`Permanently delete ${confirmTarget?.name} (${confirmTarget?.id})? All their records will be removed and this cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirmTarget) return;
          await onDeleteMember(confirmTarget.id);
          toast.success(`${confirmTarget.name} removed`);
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};
