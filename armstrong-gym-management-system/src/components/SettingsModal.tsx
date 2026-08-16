import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Key,
  RefreshCw,
  CheckCircle2,
  Shield,
  Smartphone,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  settings: any;
  onSaveSettings: (settings: any) => Promise<void>;
  onTriggerCron: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onTriggerCron,
}) => {
  const [gymName, setGymName] = useState(settings?.gymName || 'Armstrong Gym & Fitness Club');
  const [twilioAccountSid, setTwilioAccountSid] = useState(settings?.twilioAccountSid || '');
  const [twilioAuthToken, setTwilioAuthToken] = useState(settings?.twilioAuthToken || '');
  const [twilioWhatsappFrom, setTwilioWhatsappFrom] = useState(
    settings?.twilioWhatsappFrom || 'whatsapp:+14155238886'
  );
  const [cronSecret, setCronSecret] = useState(settings?.cronSecret || '');

  useEffect(() => {
    if (settings) {
      if (settings.gymName) setGymName(settings.gymName);
      if (settings.twilioAccountSid) setTwilioAccountSid(settings.twilioAccountSid);
      if (settings.twilioAuthToken) setTwilioAuthToken(settings.twilioAuthToken);
      if (settings.twilioWhatsappFrom) setTwilioWhatsappFrom(settings.twilioWhatsappFrom);
      if (settings.cronSecret) setCronSecret(settings.cronSecret);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveSettings({
        gymName,
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsappFrom,
        cronSecret,
      });
      toast.success('System Settings Saved!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    }
  };

  const inputCls = 'w-full px-3.5 py-2 text-xs bg-white/5 text-white font-mono rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924]';
  const labelCls = 'block text-xs font-semibold text-white/70 mb-1';

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#E51924]" />
          <span>System Settings & API Credentials</span>
        </h1>
        <p className="text-xs text-white/40">Configure gym name, Twilio WhatsApp gateway & cron authorization token</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings form */}
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4 shadow-2xl">
          <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3">General & Gateway Configurations</h2>

          <div>
            <label className={labelCls}>Gym Facility Name</label>
            <input type="text" value={gymName} onChange={(e) => setGymName(e.target.value)} className={inputCls} />
          </div>

          <div className="pt-2 border-t border-white/8 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /><span>Twilio WhatsApp API</span>
            </h3>
            <div>
              <label className={labelCls}>TWILIO_ACCOUNT_SID</label>
              <input type="text" placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TWILIO_AUTH_TOKEN</label>
              <input type="password" placeholder="••••••••••••••••" value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TWILIO_WHATSAPP_FROM</label>
              <input type="text" value={twilioWhatsappFrom} onChange={(e) => setTwilioWhatsappFrom(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="pt-2 border-t border-white/8 space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /><span>CRON Authorization Token</span>
            </h3>
            <div>
              <label className={labelCls}>CRON_SECRET</label>
              <input type="text" value={cronSecret} onChange={(e) => setCronSecret(e.target.value)} className={inputCls} />
            </div>
          </div>

          <button type="submit" className="w-full py-2.5 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-extrabold text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /><span>Save All Configurations</span>
          </button>
        </form>

        {/* Cron card */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold text-white border-b border-white/8 pb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" /><span>Cron Automation Tester</span>
            </h2>
            <p className="text-xs text-white/40 leading-relaxed">On Vercel, use a cron service to call:</p>
            <div className="bg-[#0A0A0A] p-3 rounded-xl border border-white/8 font-mono text-[11px] text-cyan-400 overflow-x-auto">
              POST /api/cron/fee-reminders?secret={'{'}cronSecret{'}'}
            </div>
            <ul className="text-xs text-white/60 space-y-1.5 list-disc pl-4 pt-2">
              <li>Scans all members for upcoming expiry dates</li>
              <li>Updates statuses: Active / Expiring / Expired</li>
              <li>Generates WhatsApp fee reminders for pending balances</li>
              <li>Appends audit entries to Reminder Logs</li>
            </ul>
          </div>
          <button
            onClick={async () => { try { await onTriggerCron(); toast.success('Cron executed!'); } catch (err: any) { toast.error(err.message); } }}
            className="w-full py-3 rounded-xl bg-[#E51924] hover:bg-red-600 text-white font-black text-xs shadow-lg shadow-[#E51924]/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.5]" /><span>Test Manual Cron Execution Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
