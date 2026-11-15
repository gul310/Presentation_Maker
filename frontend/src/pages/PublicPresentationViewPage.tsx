import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Star,
  Eye,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { communityApi } from "../services/communityApi";
import type { PublicPresentationItem } from "../types/community";
import type { PresentationDetail } from "../types/presentation";
import { RatingReviewModal } from "../components/RatingReviewModal";
import { VisualSlideRenderer } from "../components/VisualSlideRenderer";
import { useAuth } from "../context/AuthContext";
import { isRtlLanguage } from "../constants/languages";
import { useZoomImmunity } from "../hooks/useZoomImmunity";

interface PublicPresentationViewPageProps {
  presentationId: string | number;
  onNavigate: (path: string) => void;
}

export const PublicPresentationViewPage: React.FC<PublicPresentationViewPageProps> = ({
  presentationId,
  onNavigate,
}) => {
  const { stageRef, anchorStyle, blockStyle } = useZoomImmunity({
    standardWidth: 896,
    standardHeight: 504,
  });
  const { user } = useAuth();
  const [deck, setDeck] = useState<(PublicPresentationItem & PresentationDetail) | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        setLoading(true);
        const data = await communityApi.getPublicPresentation(presentationId);
        setDeck(data);
      } catch (err: any) {
        setError(err.message || "Failed to load public presentation.");
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [presentationId]);

  const handleUseTemplate = async () => {
    if (!user) {
      onNavigate("/login");
      return;
    }
    try {
      setIsCloning(true);
      const res = await communityApi.useAsTemplate(presentationId);
      setCloneSuccess("Successfully cloned to your library!");
      setTimeout(() => {
        onNavigate(`/presentation/${res.presentation.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to clone template.");
    } finally {
      setIsCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-gray-400 animate-pulse">
        Loading public presentation deck...
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="text-rose-500 dark:text-rose-400 font-bold text-lg">Presentation Unavailable</div>
        <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">{error || "This presentation is private or has been removed."}</p>
        <button
          onClick={() => onNavigate("/")}
          className="px-4 py-2 rounded-xl bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] text-[#FFFFFF] text-xs font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const slides = deck.slides || [];
  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate("/")}
          className="flex items-center space-x-2 text-xs font-semibold text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] dark:hover:text-[#FFFFFF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRatingModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#EBD7BE]/50 hover:bg-[#EBD7BE]/80 dark:bg-[#4D443D] dark:hover:bg-[#4A3A34] text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center space-x-1.5 transition-colors border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>Rate & Review ({deck.ratings_count || 0})</span>
          </button>

          <button
            onClick={handleUseTemplate}
            disabled={isCloning}
            className="px-4 py-2 rounded-xl bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] text-[#FFFFFF] text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-[#77574A]/20"
          >
            <Copy className="w-4 h-4" />
            <span>{isCloning ? "Copying..." : "Use as Template"}</span>
          </button>
        </div>
      </div>

      {cloneSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{cloneSuccess} Redirecting to your Studio...</span>
        </div>
      )}

      {/* Deck Metadata Header */}
      <div className="p-6 rounded-3xl glass-panel border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EBD7BE]/60 dark:bg-[#4D443D] text-[#4A3A34] dark:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
            {deck.presentation_type || "Presentation"}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Language: {deck.preferred_language || deck.language}
          </span>
          <span className="text-xs text-[#77574A] dark:text-[#FFFFFF] flex items-center space-x-1 ml-auto">
            <Eye className="w-3.5 h-3.5" />
            <span>{deck.views_count || 0} views</span>
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-[#4A3A34] dark:text-[#FFFFFF]">{deck.title}</h1>

        <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#FFFFFF] pt-2 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
          <span>Created by <strong className="text-[#4A3A34] dark:text-[#FFFFFF]">{deck.author_name}</strong></span>
          <div className="flex items-center space-x-1 text-amber-500 font-bold">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>{deck.average_rating ? deck.average_rating.toFixed(1) : "—"}</span>
            <span className="text-[#77574A] dark:text-[#FFFFFF] font-normal">({deck.ratings_count || 0} reviews)</span>
          </div>
        </div>
      </div>

      {/* Slide Presentation Showcase Canvas */}
      {currentSlide ? (
        <div className="space-y-4">
          <div 
            ref={stageRef}
            className="flex items-center justify-center p-2 overflow-auto"
          >
            <div
              className="presentation-block-anchor flex items-center justify-center shrink-0"
              style={anchorStyle}
            >
              <div 
                dir={isRtlLanguage(deck.preferred_language || deck.language) ? 'rtl' : 'ltr'}
                className={`rounded-3xl overflow-hidden bg-[#FFFFFF] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 p-6 md:p-8 flex flex-col justify-between shadow-2xl transition-colors ${isRtlLanguage(deck.preferred_language || deck.language) ? 'font-urdu' : ''}`}
                style={blockStyle}
              >
                {/* Slide Core Content */}
                <VisualSlideRenderer
                  slide={currentSlide}
                  presentationTitle={deck.title}
                  language={deck.preferred_language || deck.language}
                  isUrdu={isRtlLanguage(deck.preferred_language || deck.language)}
                />

                {/* Speaker Notes Context if available */}
                {currentSlide.speaker_notes && (
                  <div className="mt-4 pt-3 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-xs text-[#77574A] dark:text-[#FFFFFF] italic shrink-0">
                    <strong>Speaker Guide: </strong> {currentSlide.speaker_notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slide Navigation Controls */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 rounded-xl bg-[#EBD7BE]/50 hover:bg-[#EBD7BE]/80 dark:bg-[#4D443D] dark:hover:bg-[#4A3A34] disabled:opacity-40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center space-x-1.5 transition-colors border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Slide</span>
            </button>

            <span className="text-xs font-bold text-[#77574A] dark:text-[#FFFFFF] font-mono">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="px-4 py-2 rounded-xl bg-[#EBD7BE]/50 hover:bg-[#EBD7BE]/80 dark:bg-[#4D443D] dark:hover:bg-[#4A3A34] disabled:opacity-40 text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center space-x-1.5 transition-colors border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
            >
              <span>Next Slide</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-[#77574A] dark:text-[#FFFFFF]">No slides found in this presentation.</div>
      )}

      {/* Call to action template reuse banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#EBD7BE]/60 via-[#F9F2E4] to-[#D0AE92]/40 dark:from-[#3E3731] dark:via-[#332D28] dark:to-[#3E3731]">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF] flex items-center justify-center md:justify-start space-x-2">
            <Sparkles className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF]" />
            <span>Inspired by this presentation?</span>
          </h3>
          <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
            Click &ldquo;Use as Template&rdquo; to create a personal editable copy in your account without altering the original.
          </p>
        </div>
        <button
          onClick={handleUseTemplate}
          disabled={isCloning}
          className="px-5 py-2.5 rounded-xl bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] text-[#FFFFFF] text-xs font-bold flex items-center space-x-2 flex-shrink-0 transition-all shadow-md shadow-[#77574A]/20"
        >
          <Copy className="w-4 h-4" />
          <span>{isCloning ? "Cloning Deck..." : "Clone as Template"}</span>
        </button>
      </div>

      {/* Rating & Review Modal */}
      {showRatingModal && (
        <RatingReviewModal
          presentationId={deck.id}
          presentationTitle={deck.title}
          currentAverageRating={deck.average_rating || 0}
          totalRatingsCount={deck.ratings_count || 0}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={(avg, count) => {
            setDeck((prev) => (prev ? { ...prev, average_rating: avg, ratings_count: count } : null));
          }}
        />
      )}
    </div>
  );
};
