import React, { useState, useRef } from 'react';
import {
  Dumbbell, UserPlus, Trash2, Edit, Phone, Mail, Calendar,
  X, IndianRupee, Users, Camera, Upload, UserCircle2,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { Trainer } from '../types';
import toast from 'react-hot-toast';
import { uploadImage } from '../api/client';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
  const [confirmTarget, setConfirmTarget] = useState<Trainer | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formSalary, setFormSalary] = useState(35000);
  const [formShift, setFormShift] = useState<'Morning' | 'Evening' | 'Full Day'>('Morning');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formClientsCount, setFormClientsCount] = useState('');
  const [formShiftTiming, setFormShiftTiming] = useState('');
  const [formBio, setFormBio] = useState('');

  // Two separate hidden inputs so capture attribute is static per button
  const photoGalleryRef = useRef<HTMLInputElement>(null);
  const photoCameraRef  = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Focus trap for add/edit modal
  const modalRef = useFocusTrap<HTMLDivElement>(showAddModal);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUri = ev.target?.result as string;
      if (!dataUri) return;
      setFormPhotoUrl(dataUri); // instant preview
      setIsUploadingPhoto(true);
      try {
        const url = await uploadImage(dataUri, 'trainers');
        setFormPhotoUrl(url);
      } catch {
        toast.error('Photo upload failed — photo will be stored locally');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
          photoUrl: formPhotoUrl,
          role: formRole,
          experience: formExperience,
          clientsCount: formClientsCount,
          shiftTiming: formShiftTiming,
          bio: formBio,
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
          photoUrl: formPhotoUrl,
          role: formRole,
          experience: formExperience,
          clientsCount: formClientsCount,
          shiftTiming: formShiftTiming,
          bio: formBio,
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
    setFormPhotoUrl(t.photoUrl || '');
    setFormRole(t.role || '');
    setFormExperience(t.experience || '');
    setFormClientsCount(t.clientsCount || '');
    setFormShiftTiming(t.shiftTiming || '');
    setFormBio(t.bio || '');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTrainer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormSpecialty('');
    setFormPhotoUrl('');
    setFormRole('');
    setFormExperience('');
    setFormClientsCount('');
    setFormShiftTiming('');
    setFormBio('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.map((t) => (
          <div
            key={t.id}
            className="glass-card border border-white/10 rounded-2xl p-5 space-y-4 hover:border-[#E51924]/40 transition-all shadow-xl relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E51924]/20 border border-[#E51924]/30 flex items-center justify-center font-black text-[#E51924] text-base">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
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
                  Rs.{t.salary.toLocaleString('en-PK')}
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
                onClick={() => setConfirmTarget(t)}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="trainer-modal-title">
          <div ref={modalRef} className="bg-[#0D0D0D] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative my-8">
            <button onClick={closeModal} aria-label="Close modal" className="absolute top-5 right-5 text-white/50 hover:text-white">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div>
              <h2 id="trainer-modal-title" className="text-lg font-black text-white">
                {editingTrainer ? `Edit Trainer: ${editingTrainer.id}` : 'Register New Coach'}
              </h2>
              <p className="text-xs text-white/50">Configure specialization, shift hours, and salary details.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="trainer-name" className="block text-xs font-semibold text-white/80 mb-1">Coach Full Name *</label>
                <input id="trainer-name" type="text" required placeholder="e.g. Quadir Khan" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="trainer-phone" className="block text-xs font-semibold text-white/80 mb-1">Phone *</label>
                  <input id="trainer-phone" type="tel" required placeholder="+92 300 1234567" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
                <div>
                  <label htmlFor="trainer-email" className="block text-xs font-semibold text-white/80 mb-1">Email Address</label>
                  <input id="trainer-email" type="email" placeholder="coach@armstrong.gym" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
              </div>

              <div>
                <label htmlFor="trainer-specialty" className="block text-xs font-semibold text-white/80 mb-1">Specialty / Certification</label>
                <input id="trainer-specialty" type="text" placeholder="e.g. Bodybuilding, Powerlifting, CrossFit" value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div>
                <label htmlFor="trainer-role" className="block text-xs font-semibold text-white/80 mb-1">
                  Role / Title <span className="text-white/30 font-normal">(shown on website)</span>
                </label>
                <input id="trainer-role" type="text" placeholder="e.g. Head Bodybuilding & Strength Coach" value={formRole} onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="trainer-experience" className="block text-xs font-semibold text-white/80 mb-1">
                    Experience <span className="text-white/30 font-normal">(badge)</span>
                  </label>
                  <input id="trainer-experience" type="text" placeholder="e.g. 10+ Years Experience" value={formExperience} onChange={(e) => setFormExperience(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
                <div>
                  <label htmlFor="trainer-clients" className="block text-xs font-semibold text-white/80 mb-1">
                    Clients Count <span className="text-white/30 font-normal">(badge)</span>
                  </label>
                  <input id="trainer-clients" type="text" placeholder="e.g. 150+ Clients Transformed" value={formClientsCount} onChange={(e) => setFormClientsCount(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
              </div>

              <div>
                <label htmlFor="trainer-shift-timing" className="block text-xs font-semibold text-white/80 mb-1">
                  Shift Timing <span className="text-white/30 font-normal">(website display)</span>
                </label>
                <input id="trainer-shift-timing" type="text" placeholder="e.g. Morning Shift: 6 AM - 12 PM" value={formShiftTiming} onChange={(e) => setFormShiftTiming(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
              </div>

              <div>
                <label htmlFor="trainer-bio" className="block text-xs font-semibold text-white/80 mb-1">
                  Bio <span className="text-white/30 font-normal">(website profile)</span>
                </label>
                <textarea id="trainer-bio" rows={2} placeholder="Short coach bio for the public website..." value={formBio} onChange={(e) => setFormBio(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="trainer-salary" className="block text-xs font-semibold text-white/80 mb-1">Monthly Salary (Rs.)</label>
                  <input id="trainer-salary" type="number" value={formSalary} onChange={(e) => setFormSalary(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]" />
                </div>
                <div>
                  <label htmlFor="trainer-shift" className="block text-xs font-semibold text-white/80 mb-1">Shift</label>
                  <select id="trainer-shift" value={formShift} onChange={(e) => setFormShift(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]">
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>
              </div>

              {/* Coach Photo */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Coach Photo</label>
                <input ref={photoGalleryRef} id="trainer-photo-gallery" type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
                <input ref={photoCameraRef} id="trainer-photo-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFileChange} />
                <div className="flex items-center gap-4">
                  <div onClick={() => photoGalleryRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-[#E51924]/60 cursor-pointer flex-shrink-0 transition-all group bg-white/5"
                    title="Click to upload photo" role="button" aria-label="Upload coach photo">
                    {formPhotoUrl ? (
                      <img src={formPhotoUrl} alt="Coach photo preview" className="w-full h-full object-cover" />
                    ) : (
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
                    <button type="button" onClick={() => photoGalleryRef.current?.click()}
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
                  {isUploadingPhoto ? 'Uploading photo…' : editingTrainer ? 'Save Changes' : 'Register Coach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Remove Trainer"
        message={`Remove ${confirmTarget?.name} (${confirmTarget?.id}) from the coaching staff? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!confirmTarget) return;
          await onDeleteTrainer(confirmTarget.id);
          toast.success(`${confirmTarget.name} removed`);
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};
