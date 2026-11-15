import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onNavigate }) => {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      onNavigate('/login');
    }
  }, [loading, user, onNavigate]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-400">Verifying security credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Authentication Required</h2>
        <p className="text-slate-600 dark:text-gray-400 text-sm max-w-md mb-6">
          Please log in to your Presentation Maker account to access your personal dashboard, presentation library, and settings.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/login')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Login to Account
          </button>
          <button
            onClick={() => onNavigate('/signup')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 transition-all"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
