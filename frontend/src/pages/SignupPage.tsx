import { useState } from 'react';
import type { UserRole } from '../types/auth';
import { AlertCircle, ArrowRight, User as UserIcon, Mail, Lock, Globe, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


interface SignupPageProps {
  onNavigate: (path: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('student');
  const [country, setCountry] = useState<string>('Global');
  const [interfaceLang, setInterfaceLang] = useState<string>('English');
  const [presentationLang, setPresentationLang] = useState<string>('English');

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
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        name,
        email,
        password,
        role,
        country,
        interface_language: interfaceLang,
        presentation_language: presentationLang,
      });
      onNavigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8">
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
        <h2 className="text-2xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">Create Presentation Maker Account</h2>
        <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Unlock unlimited presentations, speech scripts, and practice feedback</p>
      </div>

      {error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Full Name *</label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Sarah Connor"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Email Address *</label>
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

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Password *</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF] absolute left-3.5 top-3.5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        {/* Grid for Role & Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Primary Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher / Educator</option>
              <option value="researcher">Researcher</option>
              <option value="professional">Professional / Executive</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Country</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF] absolute left-3.5 top-3" />
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Grid for Interface & Presentation Languages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Interface Language</label>
            <select
              value={interfaceLang}
              onChange={(e) => setInterfaceLang(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu (اردو)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Chinese">Chinese (中文)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">Default Presentation Lang</label>
            <select
              value={presentationLang}
              onChange={(e) => setPresentationLang(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40 transition-colors"
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu (اردو)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Chinese">Chinese (中文)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-[#FFFFFF] bg-[#77574A] hover:bg-[#5D4338] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] dark:text-white dark:shadow-[0_4px_20px_rgba(140,125,112,0.4)] shadow-lg shadow-[#77574A]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          <span>{loading ? 'Creating Account...' : 'Complete Free Registration'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
        <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('/login')}
            className="font-bold text-[#4A3A34] dark:text-[#FFFFFF] hover:underline ml-1"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  </div>
  );
};
