import { useState } from 'react';
import { Sparkles, FileText, Upload, FileCheck, Loader2, ArrowRight, MessageSquare, ShieldAlert } from 'lucide-react';

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
  const [docTitle, setDocTitle] = useState('');
  
  // Generation & Status State
  const [loading, setLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'preparing' | 'generating' | 'layouts' | 'saving' | 'completed' | 'failed'>('idle');
  const [progressMessage, setProgressMessage] = useState<string>('Preparing your presentation...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setDocTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setErrorMsg(null);
    handleDocumentUpload(selectedFile);
  };

  const handleDocumentUpload = async (selectedFile: File) => {
    setUploadState('uploading');
    setErrorMsg(null);
    try {
      const result = await uploadDocumentSource(selectedFile);
      setExtractedData(result);
      setUploadState('extracted');
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message || 'Failed to extract text from document.');
    }
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
    setProgressMessage('Preparing your presentation...');
    setErrorMsg(null);

    try {
      const docContent = extractedData.sections && extractedData.sections.length > 0
        ? extractedData.sections.map(s => `[${s.title}]\n${s.content}`).join('\n\n')
        : extractedData.extracted_text_preview;
      const promptContent = docContent.length > 15000 ? docContent.substring(0, 15000) + '...' : docContent;

      const presentation = await generatePresentation(
        {
          source_type: 'document',
          prompt: promptContent,
          source_content: promptContent,
          source_name: docTitle.trim() || extractedData.filename,
          language,
          audience,
          presentation_type: presentationType,
          tone,
          slide_count: Math.min(30, Math.max(3, extractedData.page_or_slide_count || slideCount)),
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
            <label className="block text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF] mb-2">
              Upload Source Document (PDF, DOCX, PPTX)
            </label>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[#D0AE92]/60 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)] rounded-2xl p-8 text-center transition-all bg-[#F9F2E4]/40 dark:bg-[#2A2521]/60 cursor-pointer"
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.docx,.pptx"
                className="hidden"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              />
              {uploadState === 'uploading' ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-3" />
                  <p className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Extracting text from document...</p>
                  <p className="text-xs text-[#77574A] dark:text-[#F5EEE8] mt-1">Preserving page and section structure</p>
                </div>
              ) : uploadState === 'extracted' && extractedData ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{extractedData.filename}</p>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    Successfully extracted {extractedData.word_count.toLocaleString()} words across {extractedData.page_or_slide_count} pages/slides
                  </p>
                  <span className="mt-3 text-xs text-[#77574A] dark:text-[#FFFFFF] underline hover:text-[#4A3A34] dark:hover:text-[#FFFFFF]">
                    Click to replace document
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#EBD7BE]/50 dark:bg-[#4D443D] text-[var(--color-primary)] flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">
                    Drag & drop document here, or <span className="text-[var(--color-primary)] underline">browse</span>
                  </p>
                  <p className="text-xs text-[#77574A] dark:text-[#F5EEE8] mt-1">Supported formats: PDF, DOCX, PPTX (up to 20MB)</p>
                </div>
              )}
            </div>
          </div>

          {extractedData && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                  Presentation Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Text Extraction Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#77574A] dark:text-[#FFFFFF] mb-2">
                  Grounded Source Content ({extractedData.character_count.toLocaleString()} chars)
                </label>
                <div className="bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl p-4 text-xs font-mono text-[#4A3A34] dark:text-[#FFFFFF] max-h-36 overflow-y-auto leading-relaxed">
                  {extractedData.extracted_text_preview}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Tone & Style
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-4 py-2.5 text-sm text-[#4A3A34] dark:text-[#FFFFFF] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="Professional" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Professional</option>
                    <option value="Academic" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Academic</option>
                    <option value="Persuasive" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Persuasive</option>
                    <option value="Casual" className="bg-[#F9F2E4] dark:bg-[#3E3731]">Casual</option>
                  </select>
                </div>
              </div>
            </>
          )}

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
                    {generationStage === 'preparing' && 'Parsing document & structuring outline...'}
                    {generationStage === 'generating' && 'Authoring structured slides with grounded facts...'}
                    {generationStage === 'layouts' && 'Formatting visual layouts, steps & tables...'}
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
              disabled={loading || uploadState !== 'extracted'}
              className="py-3 px-8 rounded-xl font-bold text-sm text-[#FFFFFF] dark:text-[#FFFFFF] shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 shiny-button cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Deck from Document...
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
