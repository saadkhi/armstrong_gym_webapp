import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, RefreshCw, Shield,
  Smartphone, Globe, MapPin, Phone, Clock, BarChart3,
  PlusCircle, Trash2, ChevronDown, ChevronUp, Instagram, Facebook,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PlanItem } from './Portfolio';

interface SettingsModalProps {
  settings: any;
  onSaveSettings: (settings: any) => Promise<void>;
  onTriggerCron: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const BADGE_PRESETS = [
  { label: 'Flexible',          value: 'bg-white/10 text-white border-white/20' },
  { label: 'Most Popular (Red)',value: 'bg-[#E51924] text-white border-red-500/50 shadow-lg shadow-red-500/20' },
  { label: 'Save % (Green)',    value: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'Best Value (Amber)',value: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Student (Cyan)',    value: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { label: 'VIP (Red)',         value: 'bg-[#E51924] text-white border-red-500/40' },
];

const EMPTY_PLAN: PlanItem = {
  name: '', price: 'Rs. 0', period: '/ month',
  badge: 'FLEXIBLE', badgeColor: BADGE_PRESETS[0].value,
  description: '', features: [''], popular: false,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings, onSaveSettings, onTriggerCron,
}) => {
  // ── Gateway / Technical ─────────────────────────────────────────────────
  const [gymName,             setGymName]             = useState('');
  const [twilioAccountSid,    setTwilioAccountSid]    = useState('');
  const [twilioAuthToken,     setTwilioAuthToken]     = useState('');
  const [twilioWhatsappFrom,  setTwilioWhatsappFrom]  = useState('');
  const [cronSecret,          setCronSecret]          = useState('');

  // ── Contact & Location ──────────────────────────────────────────────────
  const [gymPhone,            setGymPhone]            = useState('');
  const [gymAddress,          setGymAddress]          = useState('');
  const [gymMapsUrl,          setGymMapsUrl]          = useState('');
  const [gymInstagramUrl,     setGymInstagramUrl]     = useState('');
  const [gymFacebookUrl,      setGymFacebookUrl]      = useState('');
  const [gymWhatsappBooking,  setGymWhatsappBooking]  = useState('');

  // ── Opening Hours ────────────────────────────────────────────────────────
  const [gymTimingsWeekday,   setGymTimingsWeekday]   = useState('');
  const [gymTimingsSunday,    setGymTimingsSunday]    = useState('');

  // ── Hero Stats Bar ───────────────────────────────────────────────────────
  const [statMembers,         setStatMembers]         = useState('');
  const [statCoaches,         setStatCoaches]         = useState('');
  const [statFloorSize,       setStatFloorSize]       = useState('');
  const [statSuccessRate,     setStatSuccessRate]     = useState('');
  const [heroTagline,         setHeroTagline]         = useState('');

  // ── Plans ────────────────────────────────────────────────────────────────
  const [plans, setPlans]                             = useState<PlanItem[]>([]);
  const [expandedPlanIdx, setExpandedPlanIdx]         = useState<number | null>(null);

  // ── Active section tab ───────────────────────────────────────────────────
  const [activeSection, setActiveSection]             = useState<'gateway' | 'website' | 'plans' | 'cron'>('website');

  useEffect(() => {
    if (!settings) return;
    setGymName(settings.gymName             || '');
    setTwilioAccountSid(settings.twilioAccountSid  || '');
    setTwilioAuthToken(settings.twilioAuthToken   || '');
    setTwilioWhatsappFrom(settings.twilioWhatsappFrom || '');
    setCronSecret(settings.cronSecret          || '');
    setGymPhone(settings.gymPhone            || '0332 2464479');
    setGymAddress(settings.gymAddress          || '');
    setGymMapsUrl(settings.gymMapsUrl          || '');
    setGymInstagramUrl(settings.gymInstagramUrl     || '');
    setGymFacebookUrl(settings.gymFacebookUrl      || '');
    setGymWhatsappBooking(settings.gymWhatsappBooking  || '923322464479');
    setGymTimingsWeekday(settings.gymTimingsWeekday   || 'Mon – Sat: 6:00 AM – 11:00 PM');
    setGymTimingsSunday(settings.gymTimingsSunday    || 'Sunday: 8:00 AM – 8:00 PM');
    setStatMembers(settings.statMembers         || '500+');
    setStatCoaches(settings.statCoaches         || '10+');
    setStatFloorSize(settings.statFloorSize       || '5,000');
    setStatSuccessRate(settings.statSuccessRate     || '98%');
    setHeroTagline(settings.heroTagline         || '');
    try {
      const parsed: PlanItem[] = JSON.parse(settings.plansJson || '[]');
      setPlans(Array.isArray(parsed) ? parsed : []);
    } catch { setPlans([]); }
  }, [settings]);

  // ── Save handlers ────────────────────────────────────────────────────────
  const saveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({ gymName, twilioAccountSid, twilioAuthToken, twilioWhatsappFrom, cronSecret });
    toast.success('Gateway settings saved!');
  };

  const saveWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      gymPhone, gymAddress, gymMapsUrl, gymInstagramUrl,
      gymFacebookUrl, gymWhatsappBooking,
      gymTimingsWeekday, gymTimingsSunday,
      statMembers, statCoaches, statFloorSize, statSuccessRate, heroTagline,
    });
    toast.success('Website content saved!');
  };

  const savePlans = async () => {
    if (plans.some(p => !p.name.trim())) {
      toast.error('All plans must have a name');
      return;
    }
    await onSaveSettings({ plansJson: JSON.stringify(plans) });
    toast.success('Membership plans saved!');
  };

  // ── Plan helpers ─────────────────────────────────────────────────────────
  const addPlan = () => {
    setPlans(prev => [...prev, { ...EMPTY_PLAN, features: [''] }]);
    setExpandedPlanIdx(plans.length);
  };

  const removePlan = (idx: number) => setPlans(prev => prev.filter((_, i) => i !== idx));

  const updatePlan = (idx: number, key: keyof PlanItem, val: any) =>
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));

  const updateFeature = (planIdx: number, featIdx: number, val: string) =>
    setPlans(prev => prev.map((p, i) =>
      i === planIdx ? { ...p, features: p.features.map((f, fi) => fi === featIdx ? val : f) } : p
    ));

  const addFeature   = (planIdx: number) =>
    setPlans(prev => prev.map((p, i) => i === planIdx ? { ...p, features: [...p.features, ''] } : p));

  const removeFeature = (planIdx: number, featIdx: number) =>
    setPlans(prev => prev.map((p, i) =>
      i === planIdx ? { ...p, features: p.features.filter((_, fi) => fi !== featIdx) } : p
    ));

  // ── Styles ───────────────────────────────────────────────────────────────
  const inp  = 'w-full px-3.5 py-2 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]';
  const mono = inp + ' font-mono';
  const lbl  = 'block text-xs font-semibold text-white/70 mb-1';
  const section = (id: typeof activeSection) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSection === id ? 'bg-[#E51924] text-white' : 'text-white/60 hover:text-white glass-card border border-white/10'}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#E51924]" aria-hidden="true" />
            System Settings & Website Content
          </h1>
          <p className="text-xs text-white/40">Manage gym info, membership packages, API keys and automation</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
        {([
          { id: 'website', label: 'Website Content', icon: Globe },
          { id: 'plans',   label: 'Packages',        icon: BarChart3 },
          { id: 'gateway', label: 'API & Gateway',   icon: Smartphone },
          { id: 'cron',    label: 'Cron',            icon: RefreshCw },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={activeSection === id}
            onClick={() => setActiveSection(id)} className={section(id)}>
            <Icon className="w-3 h-3 inline mr-1.5" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {/* ── WEBSITE CONTENT SECTION ────────────────────────────────────────── */}
      {activeSection === 'website' && (
        <form onSubmit={saveWebsite} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#E51924]" aria-hidden="true" />Contact & Location
              </h2>
              <div>
                <label htmlFor="s-phone" className={lbl}>Front Desk Phone</label>
                <input id="s-phone" type="text" value={gymPhone} onChange={e => setGymPhone(e.target.value)} className={mono} placeholder="0332 2464479" />
              </div>
              <div>
                <label htmlFor="s-address" className={lbl}>Full Address</label>
                <textarea id="s-address" rows={2} value={gymAddress} onChange={e => setGymAddress(e.target.value)} className={inp + ' resize-none'} placeholder="Rimjhim Tower, Safoor, Karachi..." />
              </div>
              <div>
                <label htmlFor="s-maps" className={lbl}>Google Maps Link</label>
                <input id="s-maps" type="url" value={gymMapsUrl} onChange={e => setGymMapsUrl(e.target.value)} className={mono} placeholder="https://maps.app.goo.gl/..." />
              </div>
              <div>
                <label htmlFor="s-whatsapp" className={lbl}>WhatsApp Booking Number (digits only)</label>
                <input id="s-whatsapp" type="text" value={gymWhatsappBooking} onChange={e => setGymWhatsappBooking(e.target.value.replace(/\D/g,''))} className={mono} placeholder="923322464479" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s-ig" className={lbl}><Instagram className="w-3 h-3 inline mr-1" aria-hidden="true" />Instagram URL</label>
                  <input id="s-ig" type="url" value={gymInstagramUrl} onChange={e => setGymInstagramUrl(e.target.value)} className={mono} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label htmlFor="s-fb" className={lbl}><Facebook className="w-3 h-3 inline mr-1" aria-hidden="true" />Facebook URL</label>
                  <input id="s-fb" type="url" value={gymFacebookUrl} onChange={e => setGymFacebookUrl(e.target.value)} className={mono} placeholder="https://facebook.com/..." />
                </div>
              </div>
            </div>

            {/* Hero + Stats + Hours */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#E51924]" aria-hidden="true" />Hero Section & Stats
              </h2>
              <div>
                <label htmlFor="s-tagline" className={lbl}>Hero Tagline / Description</label>
                <textarea id="s-tagline" rows={3} value={heroTagline} onChange={e => setHeroTagline(e.target.value)} className={inp + ' resize-none'} placeholder="Karachi's fitness sanctuary..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="s-sm" className={lbl}>Active Members stat</label>
                  <input id="s-sm" type="text" value={statMembers} onChange={e => setStatMembers(e.target.value)} className={inp} placeholder="500+" />
                </div>
                <div>
                  <label htmlFor="s-sc" className={lbl}>Coaches stat</label>
                  <input id="s-sc" type="text" value={statCoaches} onChange={e => setStatCoaches(e.target.value)} className={inp} placeholder="10+" />
                </div>
                <div>
                  <label htmlFor="s-sf" className={lbl}>Floor Size stat</label>
                  <input id="s-sf" type="text" value={statFloorSize} onChange={e => setStatFloorSize(e.target.value)} className={inp} placeholder="5,000" />
                </div>
                <div>
                  <label htmlFor="s-ss" className={lbl}>Success Rate stat</label>
                  <input id="s-ss" type="text" value={statSuccessRate} onChange={e => setStatSuccessRate(e.target.value)} className={inp} placeholder="98%" />
                </div>
              </div>
              <div className="border-t border-white/8 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />Opening Hours
                </h3>
                <div>
                  <label htmlFor="s-tw" className={lbl}>Weekdays</label>
                  <input id="s-tw" type="text" value={gymTimingsWeekday} onChange={e => setGymTimingsWeekday(e.target.value)} className={inp} placeholder="Mon – Sat: 6:00 AM – 11:00 PM" />
                </div>
                <div>
                  <label htmlFor="s-ts" className={lbl}>Sunday</label>
                  <input id="s-ts" type="text" value={gymTimingsSunday} onChange={e => setGymTimingsSunday(e.target.value)} className={inp} placeholder="Sunday: 8:00 AM – 8:00 PM" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" aria-hidden="true" />Save Website Content
          </button>
        </form>
      )}

      {/* ── MEMBERSHIP PLANS SECTION ───────────────────────────────────────── */}
      {activeSection === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/50">
              Add, edit or remove membership packages shown on the public website.
              Changes are live immediately after saving.
            </p>
            <button onClick={addPlan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />Add Plan
            </button>
          </div>

          {plans.length === 0 && (
            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center text-white/40 text-xs">
              No plans yet — click "Add Plan" to create your first membership package.
            </div>
          )}

          {plans.map((plan, idx) => (
            <div key={idx} className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
              {/* Plan header row */}
              <div className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
                onClick={() => setExpandedPlanIdx(expandedPlanIdx === idx ? null : idx)}>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${plan.badgeColor}`}>
                    {plan.badge || 'PLAN'}
                  </span>
                  <span className="text-sm font-bold text-white">{plan.name || 'Unnamed Plan'}</span>
                  <span className="text-xs text-emerald-400 font-mono">{plan.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={e => { e.stopPropagation(); removePlan(idx); }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    aria-label={`Remove ${plan.name}`}>
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  {expandedPlanIdx === idx
                    ? <ChevronUp className="w-4 h-4 text-white/40" aria-hidden="true" />
                    : <ChevronDown className="w-4 h-4 text-white/40" aria-hidden="true" />}
                </div>
              </div>

              {expandedPlanIdx === idx && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`pname-${idx}`} className={lbl}>Plan Name *</label>
                      <input id={`pname-${idx}`} type="text" value={plan.name}
                        onChange={e => updatePlan(idx, 'name', e.target.value)} className={inp} placeholder="Monthly Starter" />
                    </div>
                    <div>
                      <label htmlFor={`pprice-${idx}`} className={lbl}>Price</label>
                      <input id={`pprice-${idx}`} type="text" value={plan.price}
                        onChange={e => updatePlan(idx, 'price', e.target.value)} className={mono} placeholder="Rs. 2,500" />
                    </div>
                    <div>
                      <label htmlFor={`pperiod-${idx}`} className={lbl}>Period</label>
                      <input id={`pperiod-${idx}`} type="text" value={plan.period}
                        onChange={e => updatePlan(idx, 'period', e.target.value)} className={inp} placeholder="/ month" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`pbadge-${idx}`} className={lbl}>Badge Label</label>
                      <input id={`pbadge-${idx}`} type="text" value={plan.badge}
                        onChange={e => updatePlan(idx, 'badge', e.target.value)} className={inp} placeholder="MOST POPULAR" />
                    </div>
                    <div>
                      <label htmlFor={`pbadgecolor-${idx}`} className={lbl}>Badge Style</label>
                      <select id={`pbadgecolor-${idx}`} value={plan.badgeColor}
                        onChange={e => updatePlan(idx, 'badgeColor', e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-[#0D0D0D] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]">
                        {BADGE_PRESETS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`pdesc-${idx}`} className={lbl}>Description</label>
                    <input id={`pdesc-${idx}`} type="text" value={plan.description}
                      onChange={e => updatePlan(idx, 'description', e.target.value)} className={inp}
                      placeholder="Short description of this plan..." />
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id={`ppop-${idx}`} checked={plan.popular}
                      onChange={e => updatePlan(idx, 'popular', e.target.checked)}
                      className="w-4 h-4 accent-red-500" />
                    <label htmlFor={`ppop-${idx}`} className="text-xs text-white/70 font-semibold cursor-pointer">
                      Mark as Most Popular (highlighted card)
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={lbl}>Features / Inclusions</label>
                      <button type="button" onClick={() => addFeature(idx)}
                        className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" aria-hidden="true" />Add Feature
                      </button>
                    </div>
                    {plan.features.map((feat, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <input type="text" value={feat}
                          onChange={e => updateFeature(idx, fi, e.target.value)}
                          className={inp + ' flex-1'} placeholder={`Feature ${fi + 1}`} />
                        {plan.features.length > 1 && (
                          <button type="button" onClick={() => removeFeature(idx, fi)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            aria-label="Remove feature">
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {plans.length > 0 && (
            <button onClick={savePlans}
              className="px-6 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center gap-2">
              <Save className="w-4 h-4" aria-hidden="true" />Save All Plans ({plans.length})
            </button>
          )}
        </div>
      )}

      {/* ── GATEWAY / TECHNICAL SECTION ────────────────────────────────────── */}
      {activeSection === 'gateway' && (
        <form onSubmit={saveGateway} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3">
            API & Gateway Configurations
          </h2>
          <div>
            <label htmlFor="g-name" className={lbl}>Gym Facility Name</label>
            <input id="g-name" type="text" value={gymName} onChange={e => setGymName(e.target.value)} className={inp} />
          </div>
          <div className="border-t border-white/8 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />Twilio WhatsApp API
            </h3>
            <div>
              <label htmlFor="g-sid" className={lbl}>TWILIO_ACCOUNT_SID</label>
              <input id="g-sid" type="text" placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" value={twilioAccountSid} onChange={e => setTwilioAccountSid(e.target.value)} className={mono} />
            </div>
            <div>
              <label htmlFor="g-token" className={lbl}>TWILIO_AUTH_TOKEN</label>
              <input id="g-token" type="password" placeholder="••••••••••••••••" value={twilioAuthToken} onChange={e => setTwilioAuthToken(e.target.value)} className={mono} />
            </div>
            <div>
              <label htmlFor="g-from" className={lbl}>TWILIO_WHATSAPP_FROM</label>
              <input id="g-from" type="text" value={twilioWhatsappFrom} onChange={e => setTwilioWhatsappFrom(e.target.value)} className={mono} />
            </div>
          </div>
          <div className="border-t border-white/8 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />CRON Authorization Token
            </h3>
            <div>
              <label htmlFor="g-cron" className={lbl}>CRON_SECRET</label>
              <input id="g-cron" type="text" value={cronSecret} onChange={e => setCronSecret(e.target.value)} className={mono} />
            </div>
          </div>
          <button type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" aria-hidden="true" />Save API Configuration
          </button>
        </form>
      )}

      {/* ── CRON SECTION ────────────────────────────────────────────────────── */}
      {activeSection === 'cron' && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-cyan-400" aria-hidden="true" />Cron Automation Tester
          </h2>
          <p className="text-xs text-white/40 leading-relaxed">Vercel runs this cron automatically at 09:00 UTC daily:</p>
          <div className="bg-[#0A0A0A] p-3 rounded-xl border border-white/8 font-mono text-[11px] text-cyan-400 overflow-x-auto">
            POST /api/cron/fee-reminders
          </div>
          <ul className="text-xs text-white/60 space-y-1.5 list-disc pl-4">
            <li>Scans all members for upcoming expiry dates</li>
            <li>Updates statuses: Active / Expiring / Expired</li>
            <li>Generates WhatsApp fee reminders for pending balances</li>
            <li>Appends entries to Reminder Logs</li>
          </ul>
          <button
            onClick={async () => {
              try { await onTriggerCron(); toast.success('Cron executed!'); }
              catch (err: any) { toast.error(err.message); }
            }}
            className="w-full py-3 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-black text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />Test Manual Cron Execution Now
          </button>
        </div>
      )}
    </div>
  );
};
