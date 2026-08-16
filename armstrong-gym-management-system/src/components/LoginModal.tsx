import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from './Logo';

interface LoginModalProps {
  onLoginSuccess: (token: string, user: any) => void;
  onGoToPortfolio: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
  onGoToPortfolio,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        toast.success('Welcome back, Admin!');
        onLoginSuccess(data.token, data.user);
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      toast.error('Login error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="glass-card border border-white/15 rounded-3xl w-full max-w-md p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff3e3e]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center flex flex-col items-center justify-center space-y-3">
          <Logo size="lg" showText={true} />
          <p className="text-[10px] text-white/50 font-extrabold uppercase tracking-[0.2em] pt-1">
            ADMINISTRATOR PORTAL
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
              Admin Email / Username
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#ff3e3e] font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#ff3e3e] font-mono font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full bg-[#ff3e3e] hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-101 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>Unlock Admin Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-white/10 text-center">
          <button
            onClick={onGoToPortfolio}
            className="text-xs accent-text hover:underline inline-flex items-center gap-1 font-bold uppercase tracking-wider"
          >
            <span>Back to Public Website</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
