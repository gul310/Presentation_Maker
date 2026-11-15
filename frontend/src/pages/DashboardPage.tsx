import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPresentations, deletePresentation, duplicatePresentation, renamePresentation } from '../services/presentationApi';
import type { Presentation } from '../types/presentation';
import { 
  Sparkles, 
  FolderKanban, 
  Mic, 
  ShieldCheck,
  ShoppingBag,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Search,
  Copy,
  Edit3,
  Filter,
  ArrowUpDown,
  Share2,
  Globe,
  Lock,
} from 'lucide-react';

import { ShareModal } from '../components/ShareModal';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

import { getPracticeHistory } from '../services/practiceApi';
import type { PracticeHistoryItem } from '../types/practice';


export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [practiceLoading, setPracticeLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sharingDeck, setSharingDeck] = useState<Presentation | null>(null);

  const fetchPresentations = async () => {
    setLoading(true);
    try {
      const data = await listPresentations();
      setPresentations(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load presentations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPracticeHistory = async () => {
    setPracticeLoading(true);
    try {
      const data = await getPracticeHistory();
      setPracticeHistory(data);
    } catch (err) {
      console.warn('Failed to fetch practice history:', err);
    } finally {
      setPracticeLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'prompt' | 'document'>('all');

  const handleDuplicate = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const cloned = await duplicatePresentation(id);
      setPresentations([cloned, ...presentations]);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate presentation.');
    }
  };

  const handleRename = async (p: Presentation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = window.prompt('Enter new presentation title:', p.title);
    if (!newTitle || newTitle.trim() === p.title) return;
    try {
      const updated = await renamePresentation(p.id, newTitle.trim());
      setPresentations(presentations.map((item) => (item.id === p.id ? updated : item)));
    } catch (err: any) {
      alert(err.message || 'Failed to rename presentation.');
    }
  };

  const filteredPresentations = presentations
    .filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = sourceFilter === 'all' || p.source_type === sourceFilter;
      return matchesSearch && matchesSource;
    })
    .sort((a, b) => {
      if (sortOption === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOption === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOption === 'alphabetical') return a.title.localeCompare(b.title);
      return 0;
    });

  useEffect(() => {
    setPresentations([]);
    setPracticeHistory([]);
    if (user) {
      fetchPresentations();
      fetchPracticeHistory();
    }
  }, [user?.id, user?.email]);



  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this presentation?')) return;
    try {
      await deletePresentation(id);
      setPresentations(presentations.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete presentation.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-gradient-to-br from-[#EBD7BE]/60 via-[#F9F2E4] to-[#EBD7BE]/30 dark:from-[#3E3731] dark:via-[#332D28] dark:to-[#3E3731] shadow-xl backdrop-blur-md">
        <div 
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: 'var(--color-primary)' }}
        ></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#77574A]/10 dark:bg-[#8C7D70]/25 border border-[#77574A]/25 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Authenticated Member Workspace
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">
              Welcome back, {user?.name || 'Presenter'}!
            </h1>
            <p className="text-[#6B4E3D] dark:text-[#F5EEE8] text-sm max-w-xl">
              Role: <span className="text-[#4A3A34] dark:text-[#FFFFFF] font-bold uppercase">{user?.role}</span> &bull; Country: <span className="font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">{user?.country}</span> &bull; Interface: <span className="font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">{user?.interface_language}</span>
            </p>
          </div>

          <button
            onClick={() => onNavigate('/create')}
            className="px-6 py-3.5 rounded-xl font-bold text-sm text-[#FFFFFF] dark:text-[#FFFFFF] shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shiny-button"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Presentation</span>
          </button>
        </div>
      </div>

      {/* Presentation Library Section */}
      <div className="rounded-3xl p-6 md:p-8 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] backdrop-blur-md shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/30 pb-4 gap-4">
          <h2 className="text-xl font-bold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[var(--color-primary)]" />
            My Presentation Library ({filteredPresentations.length})
          </h2>

          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#77574A] dark:text-[#F5EEE8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#F5EEE8]/50 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-2.5 py-1 text-xs text-[#4A3A34] dark:text-[#FFFFFF]">
              <Filter className="w-3.5 h-3.5 text-[#77574A] dark:text-[#F5EEE8]" />
              <select
                value={sourceFilter}
                onChange={(e: any) => setSourceFilter(e.target.value)}
                className="bg-transparent text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#F9F2E4] dark:bg-[#3E3731]">All Sources</option>
                <option value="prompt" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Prompts</option>
                <option value="document" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Documents</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-2.5 py-1 text-xs text-[#4A3A34] dark:text-[#FFFFFF]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#77574A] dark:text-[#F5EEE8]" />
              <select
                value={sortOption}
                onChange={(e: any) => setSortOption(e.target.value)}
                className="bg-transparent text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Newest First</option>
                <option value="oldest" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Oldest First</option>
                <option value="alphabetical" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-3" />
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Loading your presentation library...</p>
          </div>
        ) : filteredPresentations.length === 0 ? (
          <div className="py-12 text-center bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-dashed border-[#D0AE92]/60 dark:border-[#8C7D70]/40 rounded-2xl p-6">
            <FileText className="w-10 h-10 text-[#A8836C] dark:text-[#8C7D70] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">No Presentations Found</h3>
            <p className="text-xs text-[#77574A] dark:text-[#F5EEE8] mt-1 mb-4">
              {searchQuery ? 'No presentations match your search filter.' : 'Create your first presentation from a prompt or uploaded document.'}
            </p>
            <button
              onClick={() => onNavigate('/create')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] dark:text-[#FFFFFF] shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 shiny-button"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Sparkles className="w-4 h-4" /> Create Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPresentations.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate(`/presentation/${p.id}`)}
                className="rounded-2xl p-5 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#3E3731] hover:border-[#77574A] dark:hover:border-[#8C7D70]/80 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#77574A]/10 dark:bg-[#8C7D70]/25 text-[#77574A] dark:text-[#FFFFFF] border border-[#77574A]/20 dark:border-[#8C7D70]/40">
                      {p.source_type}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                      p.visibility === 'public'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#EBD7BE]/40 dark:bg-[#332D28] text-[#77574A] dark:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40'
                    }`}>
                      {p.visibility === 'public' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      <span>{p.visibility === 'public' ? 'Public' : 'Private'}</span>
                    </span>
                  </div>
                  
                  {/* CARD ACTION BUTTONS */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingDeck(p);
                      }}
                      className="p-1.5 text-[#77574A] hover:text-[#4A3A34] dark:text-[#F5EEE8] dark:hover:text-[#FFFFFF] transition-all rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#4D443D]"
                      title="Share / Public Settings"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleRename(p, e)}
                      className="p-1.5 text-[#77574A] hover:text-[#4A3A34] dark:text-[#F5EEE8] dark:hover:text-[#FFFFFF] transition-all rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#4D443D]"
                      title="Rename Presentation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(p.id, e)}
                      className="p-1.5 text-[#77574A] hover:text-[#4A3A34] dark:text-[#F5EEE8] dark:hover:text-[#FFFFFF] transition-all rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#4D443D]"
                      title="Duplicate Presentation"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 transition-all rounded-lg hover:bg-rose-500/10"
                      title="Delete Presentation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 mb-2">
                  {p.title}
                </h3>

                <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mb-4">
                  {p.slide_count} Slides &bull; {p.language} &bull; {p.tone || 'Professional'}
                </p>

                <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#F5EEE8] pt-3 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="font-bold text-[var(--color-primary)] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open Studio <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Core Flow Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Presentation */}
        <div 
          onClick={() => onNavigate('/create')}
          className="rounded-3xl p-6 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] hover:border-[#77574A] dark:hover:border-[#8C7D70]/80 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[#FFFFFF] dark:text-[#FFFFFF] shadow-md transition-transform group-hover:scale-110 shiny-pill"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              AI Generation
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-1 group-hover:text-[var(--color-primary)] transition-colors">
            Create Presentation
          </h3>
          <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mb-4 leading-relaxed">
            Generate customized slide decks from prompts or uploaded PDF/DOCX/PPTX documents.
          </p>
          <span className="text-xs font-bold text-[var(--color-primary)] inline-flex items-center gap-1">
            Start Generation &rarr;
          </span>
        </div>

        {/* Marketplace & Monetization */}
        <div 
          onClick={() => onNavigate('/marketplace')}
          className="rounded-3xl p-6 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] hover:border-[#77574A] dark:hover:border-[#8C7D70]/80 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110 bg-amber-600">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
              Marketplace
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-1 group-hover:text-[var(--color-primary)] transition-colors">
            Marketplace & Seller Hub
          </h3>
          <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mb-4 leading-relaxed">
            Sell presentations in PKR, manage sales orders, and browse curated community decks.
          </p>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            Open Marketplace &rarr;
          </span>
        </div>

        {/* Super Admin Panel (if admin) or Practice Mode shortcut */}
        {(user?.role === 'admin' || (user as any)?.is_admin) ? (
          <div 
            onClick={() => onNavigate('/admin')}
            className="rounded-3xl p-6 border border-amber-500/40 bg-gradient-to-br from-[#2D2320] to-[#3E322D] text-white hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500 text-white shadow-md transition-transform group-hover:scale-110">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                Admin Control
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
              Super Admin Panel
            </h3>
            <p className="text-xs text-[#EBD7BE]/80 mb-4 leading-relaxed">
              MongoDB telemetry, listing approvals, 5% commission verification, and live microservice health.
            </p>
            <span className="text-xs font-bold text-amber-300 inline-flex items-center gap-1">
              Access Admin &rarr;
            </span>
          </div>
        ) : (
          <div 
            onClick={() => {
              if (presentations.length > 0) {
                onNavigate(`/presentation/${presentations[0].id}/practice`);
              } else {
                onNavigate('/create');
              }
            }}
            className="rounded-3xl p-6 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] hover:border-[#77574A] dark:hover:border-[#8C7D70]/80 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-600 text-white shadow-md transition-transform group-hover:scale-110">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold">
                Practice
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-1 group-hover:text-[var(--color-primary)] transition-colors">
              Speech & Rehearsal Coach
            </h3>
            <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mb-4 leading-relaxed">
              Rehearse slides with real-time speech evaluation, pacing feedback, and AI scoring.
            </p>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
              Start Practice &rarr;
            </span>
          </div>
        )}
      </div>

        {/* Practice History Section */}
        <div className="rounded-3xl p-6 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] space-y-4">
          <div className="flex items-center justify-between border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/30 pb-4">
            <h2 className="text-lg font-bold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center gap-2">
              <Mic className="w-5 h-5 text-[var(--color-primary)]" />
              Practice History & Evaluation Records ({practiceHistory.length})
            </h2>
          </div>

          {practiceLoading ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin mb-2" />
              <p className="text-xs text-[#77574A] dark:text-[#F5EEE8]">Loading practice history...</p>
            </div>
          ) : practiceHistory.length === 0 ? (
            <div className="py-8 text-center bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-dashed border-[#D0AE92]/60 dark:border-[#8C7D70]/40 rounded-2xl p-6">
              <Mic className="w-8 h-8 text-[#A8836C] dark:text-[#8C7D70] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">No Practice Sessions Recorded Yet</h3>
              <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mt-1">
                Select any presentation from your library and click "Practice Mode" to record a live practice session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {practiceHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate(`/practice/${item.id}/report`)}
                  className="rounded-2xl p-4 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#3E3731] hover:border-[#77574A] dark:hover:border-[#8C7D70]/80 transition-all duration-200 cursor-pointer group hover:-translate-y-1 relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#77574A]/10 dark:bg-[#8C7D70]/25 text-[#77574A] dark:text-[#FFFFFF] border border-[#77574A]/20 dark:border-[#8C7D70]/40">
                      {item.language}
                    </span>
                    {item.overall_score !== undefined && item.overall_score !== null && (
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        {item.overall_score} / 100
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 mb-2">
                    {item.presentation_title}
                  </h3>

                  <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8] mb-3">
                    {item.completed_slides} of {item.total_slides} Slides &bull; {Math.floor(item.duration_seconds / 60)}m {item.duration_seconds % 60}s
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#F5EEE8] pt-2 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30">
                    <span>{new Date(item.started_at).toLocaleDateString()}</span>
                    <span className="font-bold text-[var(--color-primary)] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Report <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {sharingDeck && (
        <ShareModal
          presentationId={sharingDeck.id}
          initialVisibility={sharingDeck.visibility || 'private'}
          isTemplate={sharingDeck.is_template || false}
          onClose={() => setSharingDeck(null)}
          onVisibilityChange={(newVis) => {
            setPresentations((prev) =>
              prev.map((d) => (d.id === sharingDeck.id ? { ...d, visibility: newVis } : d))
            );
          }}
        />
      )}
    </div>
  );
};

