import React from 'react';
import { Lock, Sparkles, X, ShieldAlert } from 'lucide-react';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GuestLimitModal: React.FC<GuestLimitModalProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl glass-panel p-8 border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 bg-[#F9F2E4] dark:bg-[#3E3731] shadow-2xl overflow-hidden">
        {/* Glow accent background */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: 'var(--color-primary)' }}
        ></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#4D443D] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl mb-2"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--color-primary-glow)' }}
          >
            <ShieldAlert className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" /> Guest Limit Reached (2 / 2 Generations Used)
          </div>

          <h3 className="text-2xl font-extrabold tracking-tight text-[#2D2320] dark:text-[#FFFFFF]">
            You've used your 2 free presentation generations.
          </h3>

          <p className="text-[#77574A] dark:text-[#EAE0D5] text-sm leading-relaxed max-w-sm">
            Create a free Presentation Maker account to unlock the complete presentation experience.
          </p>

          {/* Features unlocked checklist */}
          <div className="w-full bg-[#EBD7BE]/40 dark:bg-[#2A2521] rounded-xl p-4 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-left space-y-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] my-2">
            <p className="font-bold text-[var(--color-primary)] dark:text-indigo-300 uppercase tracking-wider text-[10px]">Unlocked with Free Account:</p>
            <div className="grid grid-cols-2 gap-2 font-medium">
              <div className="flex items-center gap-2">✨ Unlimited Saved Presentations</div>
              <div className="flex items-center gap-2">🎙️ Speaker Notes & Speech Script</div>
              <div className="flex items-center gap-2">🧠 Teach Me AI Explanations</div>
              <div className="flex items-center gap-2">📊 Practice Mode & Speech Analysis</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
            <button
              onClick={() => {
                onClose();
                onNavigate('/signup');
              }}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl font-bold text-sm text-[#FFFFFF] shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Sparkles className="w-4 h-4" />
              Sign Up Free
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigate('/login');
              }}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl font-bold text-sm text-[#4A3A34] dark:text-[#FFFFFF] bg-[#EBD7BE]/60 dark:bg-[#4D443D] hover:bg-[#EBD7BE] dark:hover:bg-[#5A4F47] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 transition-all flex items-center justify-center cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
