import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onNavigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      {/* Back button */}
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#3E3731] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-white transition-all shadow-sm mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Previous Page</span>
      </button>

      <div className="p-8 rounded-3xl glass-panel border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <img 
            src="/images/logo.png" 
            alt="Presentation Maker Logo"
            className="w-14 h-14 rounded-2xl mx-auto object-cover shadow-lg border border-[#D0AE92]/40 bg-white"
          />
        <h2 className="text-2xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">Welcome Back</h2>
        <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Log in to access your presentations and practice dashboard</p>
      </div>

      {error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF] absolute left-3.5 top-3.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah.connor@university.edu"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF] absolute left-3.5 top-3.5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm text-[#FFFFFF] bg-[#77574A] hover:bg-[#5D4338] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] dark:text-white dark:shadow-[0_4px_20px_rgba(140,125,112,0.4)] shadow-lg shadow-[#77574A]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
        <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('/signup')}
            className="font-bold text-[#4A3A34] dark:text-[#FFFFFF] hover:underline ml-1"
          >
            Create one free
          </button>
        </p>
      </div>
    </div>
  </div>
  );
};
