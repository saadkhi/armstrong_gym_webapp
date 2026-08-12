import React, { useState } from 'react';
import {
  Dumbbell,
  UserPlus,
  Trash2,
  Edit,
  Phone,
  Mail,
  Calendar,
  X,
  IndianRupee,
  Users,
} from 'lucide-react';
import { Trainer } from '../types';
import toast from 'react-hot-toast';

interface TrainersModuleProps {
  trainers: Trainer[];
  onAddTrainer: (trainerData: Partial<Trainer>) => Promise<void>;
  onUpdateTrainer: (id: string, trainerData: Partial<Trainer>) => Promise<void>;
  onDeleteTrainer: (id: string) => Promise<void>;
}

export const TrainersModule: React.FC<TrainersModuleProps> = ({
  trainers,
  onAddTrainer,
  onUpdateTrainer,
  onDeleteTrainer,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formSalary, setFormSalary] = useState(35000);
  const [formShift, setFormShift] = useState<'Morning' | 'Evening' | 'Full Day'>('Morning');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      toast.error('Trainer name and phone are required');
      return;
    }

    try {
      if (editingTrainer) {
        await onUpdateTrainer(editingTrainer.id, {
          name: formName,
          phone: formPhone,
          email: formEmail,
          specialty: formSpecialty,
          salary: Number(formSalary),
          shift: formShift,
        });
        toast.success(`Trainer ${editingTrainer.id} updated!`);
      } else {
        await onAddTrainer({
          name: formName,
          phone: formPhone,
          email: formEmail,
          specialty: formSpecialty,
          salary: Number(formSalary),
          shift: formShift,
          status: 'Active',
          joiningDate: new Date().toISOString().split('T')[0],
        });
        toast.success('New Coach registered!');
      }

      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error saving trainer');
    }
  };

  const openEdit = (t: Trainer) => {
    setEditingTrainer(t);
    setFormName(t.name);
    setFormPhone(t.phone);
    setFormEmail(t.email || '');
    setFormSpecialty(t.specialty);
    setFormSalary(t.salary);
    setFormShift(t.shift);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTrainer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormSpecialty('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <span>Coaches & Personal Trainers</span>
          </h1>
          <p className="text-xs text-white/50">
            Manage fitness instructor profiles, shift hours, monthly salaries & assigned members
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 flex items-center gap-2 transition-all hover:scale-102"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add Trainer</span>
        </button>
      </div>

      {/* Trainers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.map((t) => (
          <div
            key={t.id}
            className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 hover:border-[#E51924]/40 transition-all shadow-xl relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#E51924]/20 border border-[#E51924]/30 flex items-center justify-center font-black text-[#E51924] text-base">
                  {t.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">{t.name}</h3>
                  <p className="text-[10px] font-mono text-[#E51924] font-bold">{t.id}</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 text-[10px] font-mono font-bold">
                {t.shift} Shift
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-white/70">
              <p className="text-white/50 font-medium">{t.specialty}</p>
              <p className="flex items-center gap-2 text-white/60 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-[#E51924]" /> {t.phone}
              </p>
              {t.email && (
                <p className="flex items-center gap-2 text-white/60 text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> {t.email}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-white/40 block">Monthly Salary</span>
                <span className="font-bold text-emerald-400 font-mono">
                  Rs. {t.salary.toLocaleString('en-PK')}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 block">Assigned Members</span>
                <span className="font-bold text-white font-mono flex items-center gap-1 justify-end">
                  <Users className="w-3 h-3 text-cyan-400" /> {t.assignedMembersCount || 0}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => openEdit(t)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-semibold flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm(`Remove trainer ${t.name}?`)) {
                    await onDeleteTrainer(t.id);
                    toast.success('Trainer removed');
                  }
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-black text-white">
                {editingTrainer ? `Edit Trainer: ${editingTrainer.id}` : 'Register New Coach'}
              </h2>
              <p className="text-xs text-white/50">
                Configure specialization, shift hours, and salary details.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Coach Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quadir Khan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Phone *
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="coach@armstrong.gym"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Specialty / Certification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bodybuilding, Powerlifting, CrossFit"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Monthly Salary (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formSalary}
                    onChange={(e) => setFormSalary(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Shift
                  </label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Full Day">Full Day</option>
                  </select>
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
                  {editingTrainer ? 'Save Changes' : 'Register Coach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
