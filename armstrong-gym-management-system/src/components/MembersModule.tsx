import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  QrCode,
  CreditCard,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  X,
  Printer,
  Sparkles,
  Camera,
  Upload,
  UserCircle2,
} from 'lucide-react';
import { Member, MembershipPlanType } from '../types';
import toast from 'react-hot-toast';
import logoImg from '../assets/images/logo.jpg';
import { ConfirmDialog } from './ConfirmDialog';

interface MembersModuleProps {
  members: Member[];
  onAddMember: (memberData: Partial<Member>) => Promise<void>;
  onUpdateMember: (id: string, memberData: Partial<Member>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onSelectMember: (member: Member) => void;
}

export const MembersModule: React.FC<MembersModuleProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSelectMember,
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

  // Photo file input refs — separate inputs so capture attribute is static
  const photoInputRef = useRef<HTMLInputElement>(null);       // gallery
  const photoCameraRef = useRef<HTMLInputElement>(null);      // camera

  // Convert selected file to base64 data URI
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) setFormPhotoUrl(result);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
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
      <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
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

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 font-semibold border-b border-white/10 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Member</th>
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
                    <td className="py-3.5 px-4">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-white">
                {editingMember ? `Edit Member: ${editingMember.id}` : 'Register New Member'}
              </h2>
              <p className="text-xs text-white/50">
                {editingMember
                  ? 'Update membership plan, contact, or photo.'
                  : 'Auto ID (GM-XXX) will be assigned automatically.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mahmood"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+92 300 1234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Gender
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Membership Plan Type
                </label>
                <select
                  value={formPlanType}
                  onChange={(e) => handlePlanTypeChange(e.target.value as MembershipPlanType)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                >
                  <option value="Monthly">Monthly Pass (1 Month - Rs. 2,500)</option>
                  <option value="Quarterly">Quarterly Beast (3 Months - Rs. 6,000)</option>
                  <option value="Half-Yearly">Half-Yearly Elite (6 Months - Rs. 10,000)</option>
                  <option value="Yearly">Yearly Champion (12 Months - Rs. 18,000)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Total Plan Cost (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formPlanCost}
                    onChange={(e) => setFormPlanCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Initial Payment Paid (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formAmountPaid}
                    onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Member Photo
                </label>
                {/* Hidden input: gallery picker (no capture) */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
                {/* Hidden input: camera only (capture="environment") */}
                <input
                  ref={photoCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-[#E51924]/60 cursor-pointer flex-shrink-0 transition-all group bg-white/5"
                    title="Click to upload or take photo"
                  >
                    {formPhotoUrl ? (
                      <img
                        src={formPhotoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle2 className="w-10 h-10 text-white/20 group-hover:text-[#E51924]/50 transition-colors" />
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E51924]/40 text-white/70 hover:text-white text-xs font-semibold transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload from Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => photoCameraRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E51924]/40 text-white/70 hover:text-white text-xs font-semibold transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take a Photo
                    </button>
                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white/3 hover:bg-red-500/10 border border-white/8 hover:border-red-500/30 text-white/40 hover:text-red-400 text-xs font-semibold transition-all"
                      >
                        <X className="w-3 h-3" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
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
                  {editingMember ? 'Save Changes' : 'Register Member'}
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
