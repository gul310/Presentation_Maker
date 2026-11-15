import { useState } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  FileCheck,
  Loader2,
  ArrowRight,
  MessageSquare,
  ShieldAlert,
  Trash2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

import { uploadDocumentSource, generatePresentation } from '../services/presentationApi';
import type { DocumentContentResponse } from '../types/presentation';
import { GuestLimitModal } from '../components/GuestLimitModal';
import { SUPPORTED_LANGUAGES } from '../constants/languages';


interface CreatePageProps {
  onNavigate: (path: string) => void;
}

export function CreatePage({ onNavigate }: CreatePageProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'document'>('prompt');

  // Prompt Form State
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState<number>(6);
  const [language, setLanguage] = useState('English');
  const [audience, setAudience] = useState('General Professional');
  const [presentationType, setPresentationType] = useState('Informative');
  const [tone, setTone] = useState('Professional');

  // Document Upload State
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'extracted' | 'error'>('idle');
  const [extractedData, setExtractedData] = useState<DocumentContentResponse | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCustomPrompt, setDocCustomPrompt] = useState('');
  const [docSlideCount, setDocSlideCount] = useState<number>(6);
  const [docLanguage, setDocLanguage] = useState('English');
  const [docAudience, setDocAudience] = useState('General Professional');
  const [docPresentationType, setDocPresentationType] = useState('Informative');
  const [docTone, setDocTone] = useState('Professional');
  
  // Generation & Status State
  const [loading, setLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'preparing' | 'generating' | 'layouts' | 'saving' | 'completed' | 'failed'>('idle');
  const [progressMessage, setProgressMessage] = useState<string>('Preparing your presentation...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);

  const cleanFilenameToTitle = (filename: string): string => {
    let name = filename.replace(/\.[^/.]+$/, '').trim();
    // Strip technical tags and suffixes
    name = name.replace(/[-_](?:source|presentation|slides?|draft|final|v\d+|mvp|doc|report|version\d*)\b/gi, '');
    name = name.replace(/\b(?:source|presentation|slides?|draft|final|v\d+|mvp|doc|report|version\d*)[-_]/gi, '');
    name = name.replace(/[-_]+/g, ' ').trim();
    if (!name.includes(' ') && name.length > 6) {
      name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    const words = name.split(/\s+/);
    const minor = new Set(['in', 'on', 'of', 'and', 'the', 'for', 'with', 'at', 'to', 'by', 'a', 'an']);
    return words.map((w, i) => (i === 0 || !minor.has(w.toLowerCase())) ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w.toLowerCase()).join(' ') || 'Document Presentation';
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setDocFile(selectedFile);
    setDocTitle(cleanFilenameToTitle(selectedFile.name));
    setErrorMsg(null);
    handleDocumentUpload(selectedFile);
  };

  const handleDocumentUpload = async (selectedFile: File) => {
    setUploadState('uploading');
    setProgressMessage('Uploading document and extracting content...');
    setErrorMsg(null);
    try {
      const result = await uploadDocumentSource(selectedFile);
      setExtractedData(result);
      setDocFile(selectedFile);
      // Auto-populate detected intelligent title if available from document content
      if (result.detected_title && result.detected_title.trim().length >= 3) {
        setDocTitle(result.detected_title.trim());
      } else {
        setDocTitle(cleanFilenameToTitle(selectedFile.name));
      }
      if (result.page_or_slide_count && result.page_or_slide_count >= 3 && result.page_or_slide_count <= 30) {
        setDocSlideCount(result.page_or_slide_count);
      }
      setUploadState('extracted');
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message || 'Failed to extract text from document.');
    }
  };

  const handleRemoveDocument = () => {
    setExtractedData(null);
    setDocFile(null);
    setDocTitle('');
    setDocCustomPrompt('');
    setUploadState('idle');
    setErrorMsg(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleGenerateFromPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg('Please enter a topic or description for your presentation.');
      return;
    }

    setLoading(true);
    setGenerationStage('preparing');
    setProgressMessage('Preparing your presentation...');
    setErrorMsg(null);

    try {
      const presentation = await generatePresentation(
        {
          source_type: 'prompt',
          prompt: topic,
          source_name: topic.length > 60 ? topic.substring(0, 60) + '...' : topic,
          language,
          audience,
          presentation_type: presentationType,
          tone,
          slide_count: slideCount,
        },
        (stage, message) => {
          setGenerationStage(stage as any);
          setProgressMessage(message);
        }
      );

      setGenerationStage('saving');
      setProgressMessage('Finalizing your presentation...');
      onNavigate(`/presentation/${presentation.id}`);
    } catch (err: any) {
      setGenerationStage('idle');
      const errorData = err.data?.detail || err.data || {};
      const rawMsg = typeof errorData === 'string' ? errorData : (errorData.message || errorData.detail || err.message || 'Failed to generate presentation deck.');
      let friendlyMsg = rawMsg;
      if (rawMsg.includes('source_content')) {
        friendlyMsg = 'Please enter a presentation topic or prompt.';
      } else if (rawMsg.includes('timeout') || rawMsg.includes('120000ms')) {
        friendlyMsg = 'The AI generation request took longer than expected. Please click Retry to generate your presentation.';
      } else if (rawMsg.includes('ECONNREFUSED')) {
        friendlyMsg = 'Presentation generation service is temporarily reconnecting. Please click Retry.';
      }
      
      if (
        err.status === 403 && 
        (errorData.status_code === 'GUEST_GENERATION_LIMIT_REACHED' || 
         errorData.detail?.status_code === 'GUEST_GENERATION_LIMIT_REACHED' || 
         err.data?.status_code === 'GUEST_GENERATION_LIMIT_REACHED')
      ) {
        setShowGuestLimitModal(true);
      } else if (err.status === 502 || err.status === 503 || err.status === 504) {
        setErrorMsg('Presentation generation service is temporarily unavailable. Please click Retry.');
      } else {
        setErrorMsg(friendlyMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromDocument = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!extractedData || !extractedData.extracted_text_preview?.trim()) {
      setErrorMsg('Please upload and extract a valid document first.');
      return;
    }

    setLoading(true);
    setGenerationStage('preparing');
    setProgressMessage(docCustomPrompt.trim()
      ? 'Analyzing document with your custom focus instructions...'
      : 'Understanding document and planning presentation outline...');
    setErrorMsg(null);

    try {
      const docContent = extractedData.sections && extractedData.sections.length > 0
        ? extractedData.sections.map(s => `[${s.title}]\n${s.content}`).join('\n\n')
        : extractedData.extracted_text_preview;
      const promptContent = docContent.length > 20000 ? docContent.substring(0, 20000) + '...' : docContent;

      const presentation = await generatePresentation(
        {
          source_type: 'document',
          prompt: promptContent,
          source_content: promptContent,
          custom_prompt: docCustomPrompt.trim() || undefined,
          source_name: docTitle.trim() || extractedData.detected_title || cleanFilenameToTitle(extractedData.filename),
          title_hint: docTitle.trim() || extractedData.detected_title || cleanFilenameToTitle(extractedData.filename),
          language: docLanguage,
          audience: docAudience,
          presentation_type: docPresentationType,
          tone: docTone,
          slide_count: docSlideCount,
        },
        (stage, message) => {
          setGenerationStage(stage as any);
          setProgressMessage(message);
        }
      );

      setGenerationStage('saving');
      setProgressMessage('Preparing editable slides in Presentation Studio...');
      onNavigate(`/presentation/${presentation.id}`);
    } catch (err: any) {
      setGenerationStage('idle');
      const errorData = err.data?.detail || err.data || {};
      const rawMsg = typeof errorData === 'string' ? errorData : (errorData.message || errorData.detail || err.message || 'Failed to generate presentation from document.');
      let friendlyMsg = rawMsg;
      if (rawMsg.includes('source_content')) {
        friendlyMsg = 'Please upload a valid document with readable text.';
      } else if (rawMsg.includes('timeout') || rawMsg.includes('120000ms')) {
        friendlyMsg = 'The AI generation request took longer than expected. Please click Retry to generate your presentation.';
      } else if (rawMsg.includes('ECONNREFUSED')) {
        friendlyMsg = 'Presentation generation service is temporarily reconnecting. Please click Retry.';
      }

      if (
        err.status === 403 && 
        (errorData.status_code === 'GUEST_GENERATION_LIMIT_REACHED' || 
         errorData.detail?.status_code === 'GUEST_GENERATION_LIMIT_REACHED' || 
         err.data?.status_code === 'GUEST_GENERATION_LIMIT_REACHED')
      ) {
        setShowGuestLimitModal(true);
      } else if (err.status === 502 || err.status === 503 || err.status === 504) {
        setErrorMsg('Presentation generation service is temporarily unavailable. Please click Retry.');
      } else {
        setErrorMsg(friendlyMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#4A3A34] dark:text-[#FFFFFF] flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
          AI Presentation Generator
        </h1>
        <p className="text-[#6B4E3D] dark:text-[#FFFFFF] mt-2 text-sm max-w-xl mx-auto">
          Input your topic or upload a reference document (PDF, DOCX, PPTX). Presentation Maker will structure a full presentation deck with speaker notes and visual layouts in your chosen language.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 mb-8 max-w-md mx-auto">
        <button
          onClick={() => { setActiveTab('prompt'); setErrorMsg(null); }}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'prompt'
              ? 'border-[var(--color-primary)] dark:border-[#8C7D70] text-[var(--color-primary)] dark:text-[#FFFFFF] bg-[var(--color-primary-glow)]/10'
              : 'border-transparent text-[#77574A] dark:text-[#F5EEE8] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Create from Prompt
        </button>
        <button
          onClick={() => { setActiveTab('document'); setErrorMsg(null); }}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'document'
              ? 'border-[var(--color-primary)] dark:border-[#8C7D70] text-[var(--color-primary)] dark:text-[#FFFFFF] bg-[var(--color-primary-glow)]/10'
              : 'border-transparent text-[#77574A] dark:text-[#F5EEE8] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Create from Document
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <span className="font-bold block">Generation Notice</span>
              <span className="text-xs text-rose-800/90 dark:text-rose-200/90 leading-relaxed block mt-0.5">{errorMsg}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'prompt') handleGenerateFromPrompt();
              else handleGenerateFromDocument();
            }}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 shadow-sm"
          >
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* TAB 1: PROMPT FORM */}
      {activeTab === 'prompt' && (
        <form onSubmit={handleGenerateFromPrompt} className="rounded-3xl p-6 md:p-8 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] backdrop-blur-md shadow-xl dark:shadow-2xl space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-2">
              Topic or Presentation Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Artificial Intelligence in Healthcare: Applications, Challenges, and Future Roadmap..."
              className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-2xl px-4 py-3 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#F5EEE8]/50 focus:outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                Number of Slides
              </label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value={4} className="bg-[#F9F2E4] dark:bg-[#3E3731]">4 Slides (Quick Overview)</option>
                <option value={6} className="bg-[#F9F2E4] dark:bg-[#3E3731]">6 Slides (Standard Pitch)</option>
                <option value={8} className="bg-[#F9F2E4] dark:bg-[#3E3731]">8 Slides (Detailed Deck)</option>
                <option value={12} className="bg-[#F9F2E4] dark:bg-[#3E3731]">12 Slides (Deep Dive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                Presentation Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name} className="bg-[#F9F2E4] dark:bg-[#3E3731]">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Executives, Students, General Public"
                className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#F5EEE8]/50 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                Presentation Type
              </label>
              <select
                value={presentationType}
                onChange={(e) => setPresentationType(e.target.value)}
                className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="Informative" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Informative</option>
                <option value="Academic" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Academic</option>
                <option value="Pitch Deck" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Pitch Deck</option>
                <option value="Technical" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Technical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                Tone & Style
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="Professional" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Professional</option>
                <option value="Academic" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Academic</option>
                <option value="Persuasive" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Persuasive / Sales</option>
                <option value="Inspirational" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Inspirational</option>
              </select>
            </div>
          </div>

          {/* Real Backend Job Generation Stage Progress Indicator */}
          {loading && (
            <div className="p-4 rounded-2xl bg-[#EBD7BE]/30 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-xs text-[#4A3A34] dark:text-[#FFFFFF] flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)] flex-shrink-0" />
                <div>
                  <span className="font-bold block text-sm text-[#2D2320] dark:text-[#FFFFFF]">
                    {progressMessage}
                  </span>
                  <span className="text-[11px] text-[#77574A] dark:text-[#C5B7A9]">
                    {generationStage === 'preparing' && 'Analyzing requirements & structuring slide outline...'}
                    {generationStage === 'generating' && `Authoring ${slideCount} slides with speaker notes in ${language}...`}
                    {generationStage === 'layouts' && 'Selecting visual layouts, cards, milestones & metrics...'}
                    {generationStage === 'saving' && 'Saving presentation to MongoDB Atlas workspace...'}
                    {generationStage === 'idle' && 'Initializing presentation pipeline...'}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Job</span>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-8 rounded-xl font-bold text-sm text-[#FFFFFF] dark:text-[#FFFFFF] shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating AI Deck...
                </>
              ) : (
                <>
                  Generate AI Presentation Deck
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: DOCUMENT FORM */}
      {activeTab === 'document' && (
        <form onSubmit={handleGenerateFromDocument} className="rounded-3xl p-6 md:p-8 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FFFFFF]/90 dark:bg-[#3E3731] backdrop-blur-md shadow-xl dark:shadow-2xl space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-2 flex items-center justify-between">
              <span>Upload Source Document (PDF, DOCX, PPTX)</span>
              <span className="text-xs font-normal text-[#77574A] dark:text-[#E0D5CC]">Treated as factual information source</span>
            </label>

            {/* Hidden file input */}
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.docx,.pptx"
              className="hidden"
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            />

            {/* Dropzone / Upload state */}
            {uploadState === 'extracted' && extractedData ? (
              <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        {extractedData.filename.split('.').pop()?.toUpperCase() || 'DOC'}
                      </span>
                      <h4 className="font-bold text-sm text-[#4A3A34] dark:text-[#FFFFFF] break-all">
                        {extractedData.filename}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#77574A] dark:text-[#D5C7BC] flex-wrap">
                      <span>
                        Size: <strong className="text-[#4A3A34] dark:text-white">
                          {docFile ? (docFile.size < 1024 * 1024 ? `${(docFile.size / 1024).toFixed(1)} KB` : `${(docFile.size / (1024 * 1024)).toFixed(2)} MB`) : `${(extractedData.file_size_bytes / 1024).toFixed(1)} KB`}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Words: <strong className="text-[#4A3A34] dark:text-white">{extractedData.word_count.toLocaleString()}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Sections: <strong className="text-[#4A3A34] dark:text-white">{extractedData.page_or_slide_count}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clean text extracted
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="px-3 py-1.5 rounded-xl border border-[#D0AE92]/50 hover:bg-[#EBD7BE]/40 text-xs font-semibold text-[#5B4136] dark:text-[#F5EEE8] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveDocument}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#D0AE92]/60 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)] rounded-2xl p-8 text-center transition-all bg-[#F9F2E4]/40 dark:bg-[#2A2521]/60 cursor-pointer group"
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                {uploadState === 'uploading' ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-3" />
                    <p className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Extracting text and cleaning document structure...</p>
                    <p className="text-xs text-[#77574A] dark:text-[#F5EEE8] mt-1">Stripping headers, footers and page artifacts</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-12 h-12 rounded-full bg-[#EBD7BE]/50 dark:bg-[#4D443D] text-[var(--color-primary)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">
                      Drag & drop your document here, or <span className="text-[var(--color-primary)] underline">browse files</span>
                    </p>
                    <p className="text-xs text-[#77574A] dark:text-[#F5EEE8] mt-1">Supported formats: PDF, Word (DOCX), PowerPoint (PPTX) up to 20MB</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {extractedData && (
            <>
              {/* Presentation Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                  Presentation Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Capstone Project: Autonomous Agent Architecture"
                  className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              {/* Optional Custom Instructions / Focus Areas */}
              <div className="p-5 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 dark:bg-[#2A2521]/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#4A3A34] dark:text-[#FFFFFF] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                    Additional Instructions / Focus Areas (Optional)
                  </label>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                    Custom Prompt
                  </span>
                </div>
                <p className="text-xs text-[#77574A] dark:text-[#D5C7BC] leading-relaxed">
                  Tell AI how you want your presentation to be created from this document (e.g. &ldquo;Focus on chapter 3&rdquo;, &ldquo;Create an executive summary for investors&rdquo;, &ldquo;Explain the methodology section in detail&rdquo;, &ldquo;Make it suitable for high school students&rdquo;). Leave blank for a comprehensive overview.
                </p>
                <textarea
                  rows={4}
                  value={docCustomPrompt}
                  onChange={(e) => setDocCustomPrompt(e.target.value)}
                  placeholder="e.g. Create a professional MVP Capstone presentation from this document. Focus on the problem statement, proposed solution, target audience, project objectives, MVP features, architecture, technology stack and future scope. Extract relevant information and summarize it into clear, presentation-ready slides. Do not copy the entire document."
                  className="w-full bg-[#FFFFFF] dark:bg-[#1E1916] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl p-3.5 text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#A8988C] focus:outline-none focus:border-[var(--color-primary)] transition-all leading-relaxed"
                />
              </div>

              {/* Presentation Customization Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Number of Slides */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF]">
                      Target Slides
                    </label>
                    <span className="text-xs font-extrabold text-[var(--color-primary)]">
                      {docSlideCount} Slides
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    step="1"
                    value={docSlideCount}
                    onChange={(e) => setDocSlideCount(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--color-primary)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#77574A] dark:text-[#A8988C] mt-1">
                    <span>3 slides</span>
                    <span>10</span>
                    <span>20</span>
                    <span>30 slides</span>
                  </div>
                </div>

                {/* Presentation Language */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                    Presentation Language
                  </label>
                  <select
                    value={docLanguage}
                    onChange={(e) => setDocLanguage(e.target.value)}
                    className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.name} className="bg-[#F9F2E4] dark:bg-[#3E3731]">
                        {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                    Target Audience
                  </label>
                  <select
                    value={docAudience}
                    onChange={(e) => setDocAudience(e.target.value)}
                    className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="General Professional" className="bg-[#F9F2E4] dark:bg-[#3E3731]">General Professional</option>
                    <option value="Students & Academic" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Students & Academic</option>
                    <option value="Executives & Investors" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Executives & Investors</option>
                    <option value="Developers & Technical" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Developers & Technical</option>
                    <option value="Beginners & High School" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Beginners & High School</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Presentation Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                    Presentation Type
                  </label>
                  <select
                    value={docPresentationType}
                    onChange={(e) => setDocPresentationType(e.target.value)}
                    className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="Informative" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Informative / Overview</option>
                    <option value="Pitch Deck" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Pitch Deck (Problem, Solution, MVP)</option>
                    <option value="Educational" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Educational / Lecture</option>
                    <option value="Technical & Architecture" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Technical Architecture & Engineering</option>
                    <option value="Executive Briefing" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Executive Briefing & Strategy</option>
                  </select>
                </div>

                {/* Tone & Style */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                    Tone & Style
                  </label>
                  <select
                    value={docTone}
                    onChange={(e) => setDocTone(e.target.value)}
                    className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3 py-2 text-xs text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="Professional" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Professional & Polished</option>
                    <option value="Academic" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Academic & Rigorous</option>
                    <option value="Persuasive" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Persuasive & Compelling</option>
                    <option value="Inspirational" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Inspirational & Visionary</option>
                    <option value="Conversational" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Conversational & Accessible</option>
                  </select>
                </div>
              </div>

              {/* Text Extraction Preview Collapsible */}
              <details className="rounded-xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/30 bg-[#F9F2E4]/50 dark:bg-[#2A2521]/40 p-3 text-xs">
                <summary className="font-bold cursor-pointer text-[#5B4136] dark:text-[#E0D5CC] select-none flex items-center justify-between">
                  <span>View Extracted Source Preview ({extractedData.character_count.toLocaleString()} characters)</span>
                  <span className="text-[10px] text-[#77574A] dark:text-[#A8988C] font-normal">Click to toggle</span>
                </summary>
                <div className="mt-3 p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#1E1916] border border-[#D0AE92]/30 dark:border-[#8C7D70]/20 font-mono text-[11px] text-[#4A3A34] dark:text-[#D5C7BC] max-h-40 overflow-y-auto leading-relaxed">
                  {extractedData.extracted_text_preview}
                </div>
              </details>
            </>
          )}

          {/* Real Backend Job Progressive Stage Indicator */}
          {loading && (
            <div className="p-4 rounded-2xl bg-[#EBD7BE]/30 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-xs text-[#4A3A34] dark:text-[#FFFFFF] space-y-3 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)] flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-sm text-[#2D2320] dark:text-[#FFFFFF]">
                      {progressMessage}
                    </span>
                    <span className="text-[11px] text-[#77574A] dark:text-[#C5B7A9]">
                      {generationStage === 'preparing' && 'Understanding document content & planning slide outline...'}
                      {generationStage === 'generating' && `Synthesizing ${docSlideCount} slides with speaker notes in ${docLanguage}...`}
                      {generationStage === 'layouts' && 'Selecting visual layouts, cards, milestones & metrics...'}
                      {generationStage === 'saving' && 'Preparing editable presentation in Presentation Studio...'}
                      {generationStage === 'idle' && 'Initializing presentation pipeline...'}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Synthesis</span>
                </div>
              </div>

              {/* Progressive Stage Stepper */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 pt-1 text-[10px] text-center font-semibold">
                <div className={`p-1.5 rounded-lg border ${uploadState === 'extracted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  1. Uploaded
                </div>
                <div className={`p-1.5 rounded-lg border ${extractedData ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  2. Extracted
                </div>
                <div className={`p-1.5 rounded-lg border ${generationStage === 'preparing' || generationStage === 'generating' || generationStage === 'layouts' || generationStage === 'saving' ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  3. Understanding
                </div>
                <div className={`p-1.5 rounded-lg border ${generationStage === 'generating' || generationStage === 'layouts' || generationStage === 'saving' ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  4. Planning
                </div>
                <div className={`p-1.5 rounded-lg border ${generationStage === 'layouts' || generationStage === 'saving' ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  5. Generating
                </div>
                <div className={`p-1.5 rounded-lg border ${generationStage === 'saving' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-black/5 dark:bg-white/5 border-transparent text-[#77574A]'}`}>
                  6. Studio Ready
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30">
            <p className="text-xs text-[#77574A] dark:text-[#A8988C]">
              {extractedData ? (
                docCustomPrompt.trim() ? (
                  <span>AI will synthesize document using your <strong className="text-[#4A3A34] dark:text-white">custom focus instructions</strong></span>
                ) : (
                  <span>AI will synthesize document into <strong className="text-[#4A3A34] dark:text-white">{docSlideCount} structured slides</strong></span>
                )
              ) : (
                <span>Upload a document to unlock presentation generation</span>
              )}
            </p>

            <button
              type="submit"
              disabled={loading || uploadState !== 'extracted'}
              className="w-full sm:w-auto py-3 px-8 rounded-xl font-bold text-sm text-[#FFFFFF] dark:text-[#FFFFFF] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Presentation from Document...
                </>
              ) : (
                <>
                  Generate Presentation from Document
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {showGuestLimitModal && (
        <GuestLimitModal
          isOpen={showGuestLimitModal}
          onClose={() => setShowGuestLimitModal(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
