import { useEffect, useState, useCallback } from 'react';
import { getPracticeReport, createPracticeSession } from '../services/practiceApi';
import type { PracticeReportResponse } from '../types/practice';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Loader2,
  BookOpen,
  BarChart2,
} from 'lucide-react';


interface PracticeReportPageProps {
  sessionId: string | number;
  onNavigate: (path: string) => void;
}

export function PracticeReportPage({ sessionId, onNavigate }: PracticeReportPageProps) {
  const [report, setReport] = useState<PracticeReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingNewPractice, setStartingNewPractice] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPracticeReport(sessionId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load practice performance report.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePracticeAgain = async () => {
    if (!report || !report.session) return;
    setStartingNewPractice(true);
    try {
      await createPracticeSession(report.session.presentation_id);
      onNavigate(`/presentation/${report.session.presentation_id}/practice`);
    } catch (err: any) {

      alert(err.message || 'Failed to start new practice session.');
    } finally {
      setStartingNewPractice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#FFFFFF]">Generating Practice Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#332D28] text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold mb-2">Report Not Found</h2>
        <p className="text-sm text-[#FFFFFF] mb-6">{error || 'Could not find practice session report'}</p>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const session = report.session || {} as any;
  const presentation_title = report.presentation_title || 'Presentation';
  const language = report.language || 'English';
  const metrics = report.metrics || { total_speaking_time_seconds: 0, total_words_spoken: 0, average_wpm: 0, completion_percentage: 0 };
  const evaluation = report.evaluation;
  const slide_results = report.slide_results || [];
  const comparison = report.comparison;

  return (
    <div className="min-h-screen bg-[#332D28] text-[#FFFFFF] p-4 md:p-10 max-w-6xl mx-auto space-y-8 select-none">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#8C7D70]/40 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="p-2 rounded-xl text-[#FFFFFF] hover:text-white bg-[#3E3731] border border-[#8C7D70]/40 hover:bg-[#4D443D] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Practice Evaluation Report
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{presentation_title}</h1>
            <p className="text-xs text-[#FFFFFF] mt-0.5">
              Language: {language} &bull; {session?.completed_slides || 0} of {session?.total_slides || 0} Slides Completed
            </p>
          </div>
        </div>

        <button
          onClick={handlePracticeAgain}
          disabled={startingNewPractice}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          {startingNewPractice ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Practice Again
        </button>
      </div>

      {/* OVERALL SCORE & DIMENSIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OVERALL SCORE BADGE */}
        <div className="bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
          <Award className="w-10 h-10 text-[var(--color-primary)] mb-3" />
          <span className="text-xs font-bold text-[#FFFFFF] uppercase tracking-widest">Overall Score</span>
          <div className="text-5xl font-extrabold text-white mt-2 mb-1">
            {evaluation?.overall_score ?? session?.overall_score ?? 0}
            <span className="text-lg text-[#FFFFFF]/80 font-normal"> / 100</span>
          </div>
          <p className="text-xs text-[#FFFFFF] mt-2 px-4">
            Based on actual speech transcripts, speaker notes alignment, and timing.
          </p>
        </div>

        {/* METRICS SUMMARY GRID */}
        <div className="md:col-span-2 bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <h3 className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" /> Measured Performance Metrics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl">
              <span className="text-xs text-[#FFFFFF] block">Speaking Time</span>
              <span className="text-lg font-bold text-white mt-1 block">
                {Math.floor((metrics?.total_speaking_time_seconds || 0) / 60)}m {(metrics?.total_speaking_time_seconds || 0) % 60}s
              </span>
            </div>
            <div className="p-4 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl">
              <span className="text-xs text-[#FFFFFF] block">Words Spoken</span>
              <span className="text-lg font-bold text-white mt-1 block">{metrics?.total_words_spoken || 0}</span>
            </div>
            <div className="p-4 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl">
              <span className="text-xs text-[#FFFFFF] block">Avg Speed</span>
              <span className="text-lg font-bold text-white mt-1 block">
                {metrics?.average_wpm ? `${metrics.average_wpm} WPM` : 'N/A'}
              </span>
            </div>
            <div className="p-4 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl">
              <span className="text-xs text-[#FFFFFF] block">Completion</span>
              <span className="text-lg font-bold text-white mt-1 block">{metrics?.completion_percentage || 0}%</span>
            </div>
          </div>

          {/* PROGRESS COMPARISON BANNER */}
          {comparison && comparison.previous_score !== undefined && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong className="text-indigo-200">Progress vs Previous Session:</strong> Score{' '}
                  <span className={(comparison.score_delta ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {(comparison.score_delta ?? 0) >= 0 ? `+${comparison.score_delta}` : comparison.score_delta} pts
                  </span>{' '}
                  (Previous: {comparison.previous_score})
                </span>
              </div>
              {comparison.wpm_delta !== undefined && comparison.wpm_delta !== null && (
                <span className="text-[#FFFFFF]">
                  WPM Delta: {(comparison.wpm_delta >= 0 ? '+' : '') + comparison.wpm_delta} WPM
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DIMENSION BREAKDOWN & FEEDBACK */}
      {evaluation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STRENGTHS */}
          <div className="bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Your Strengths
            </h3>
            <ul 
              dir={language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
              className="space-y-3"
            >
              {(evaluation.strengths || []).map((str, i) => (
                <li key={i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-100 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AREAS FOR IMPROVEMENT */}
          <div className="bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Needs Improvement
            </h3>
            <ul 
              dir={language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
              className="space-y-3"
            >
              {(evaluation.weaknesses || []).map((wk, i) => (
                <li key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-100 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SLIDE-BY-SLIDE BREAKDOWN */}
      <div className="bg-[#3E3731] border border-[#8C7D70]/40 rounded-3xl p-6 md:p-8 space-y-6">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--color-primary)]" /> Slide-by-Slide Performance Breakdown
        </h3>

        <div className="space-y-4">
          {slide_results.map((sr, idx) => (
            <div key={sr.id || idx} className="p-5 bg-[#3E3731] border border-[#8C7D70]/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Slide {idx + 1}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#FFFFFF]">{sr.duration_seconds}s</span>
                  <span className="text-[#FFFFFF]">{sr.words_spoken} words ({sr.words_per_minute || 0} WPM)</span>
                  {sr.score !== undefined && sr.score !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      {sr.score} / 100
                    </span>
                  )}
                </div>
              </div>

              {/* USER TRANSCRIPT */}
              <div className="p-3 bg-[#3E3731]/80 rounded-xl border border-[#8C7D70]/40 text-xs">
                <span className="text-[#FFFFFF] font-semibold block mb-1">User Spoken Transcript:</span>
                <p 
                  dir={language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
                  className="text-[#FFFFFF] italic"
                >
                  {sr.transcript || '(No speech captured for this slide)'}
                </p>
              </div>

              {/* FEEDBACK DETAILS */}
              {sr.feedback && (
                <div 
                  dir={language.toLowerCase() === 'urdu' ? 'rtl' : 'ltr'}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1"
                >
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-200">
                    <strong className="block text-emerald-400 mb-0.5">What Went Well:</strong>
                    {sr.feedback.what_went_well}
                  </div>
                  <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-amber-200">
                    <strong className="block text-amber-400 mb-0.5">What to Improve:</strong>
                    {sr.feedback.what_to_improve}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
