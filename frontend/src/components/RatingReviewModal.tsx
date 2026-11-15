import React, { useState, useEffect } from "react";
import { X, Star, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { communityApi } from "../services/communityApi";
import type { ReviewItem } from "../types/community";
import { useAuth } from "../context/AuthContext";

interface RatingReviewModalProps {
  presentationId: string | number;
  presentationTitle: string;
  currentAverageRating?: number;
  totalRatingsCount?: number;
  onClose: () => void;
  onRatingSubmitted?: (avg: number, count: number) => void;
}

export const RatingReviewModal: React.FC<RatingReviewModalProps> = ({
  presentationId,
  presentationTitle,
  currentAverageRating = 0,
  totalRatingsCount = 0,
  onClose,
  onRatingSubmitted,
}) => {
  const { user } = useAuth();
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [userExistingRating, setUserExistingRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingReviews(true);
        const [reviewsData, myRatingData] = await Promise.allSettled([
          communityApi.getReviews(presentationId),
          user ? communityApi.getMyRating(presentationId) : Promise.resolve(null),
        ]);

        if (reviewsData.status === "fulfilled") {
          setReviews(reviewsData.value);
        }

        if (myRatingData.status === "fulfilled" && myRatingData.value) {
          if (myRatingData.value.rated && myRatingData.value.score) {
            setUserExistingRating(myRatingData.value.score);
            setSelectedScore(myRatingData.value.score);
          }
        }
      } catch (err) {
        console.error("Failed to load rating & reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchData();
  }, [presentationId, user]);

  const handleRate = async (score: number) => {
    if (!user) {
      setMessage({ type: "error", text: "Please log in to submit a rating." });
      return;
    }

    try {
      setIsSubmittingRating(true);
      setMessage(null);
      const res = await communityApi.ratePresentation(presentationId, score);
      setSelectedScore(score);
      setUserExistingRating(score);
      setMessage({ type: "success", text: `Your ${score}-star rating has been recorded!` });
      if (onRatingSubmitted) {
        onRatingSubmitted(res.average_rating, res.ratings_count);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit rating." });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: "error", text: "Please log in to submit a review." });
      return;
    }

    if (!reviewComment.trim()) {
      setMessage({ type: "error", text: "Please write a comment before submitting." });
      return;
    }

    try {
      setIsSubmittingReview(true);
      setMessage(null);
      const newReview = await communityApi.submitReview(presentationId, selectedScore, reviewComment);
      setReviews([newReview, ...reviews]);
      setReviewComment("");
      setMessage({ type: "success", text: "Your review has been published!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit review." });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#322520]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#F9F2E4] dark:bg-gradient-to-b dark:from-[#3E3731] dark:to-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative text-[#4A3A34] dark:text-[#FFFFFF] my-8">
        {/* Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#A8836C]/80 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
          <div>
            <h3 className="text-xl font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Ratings & Reviews</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] truncate max-w-sm mt-0.5">{presentationTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EBD7BE]/50 dark:hover:bg-[#A8836C]/20 text-[#77574A] hover:text-[#4A3A34] dark:text-[#FFFFFF] dark:hover:text-[#FFFFFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Alert Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-[#77574A] dark:text-[#FFFFFF] hover:opacity-100 ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Aggregate Score Header */}
        <div className="mt-5 p-4 rounded-2xl bg-[#EBD7BE]/30 dark:bg-[#3E3731] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="text-3xl font-black text-[#A8836C] dark:text-[#A39487] drop-shadow-[0_0_12px_rgba(212,169,138,0.4)]">
              {currentAverageRating > 0 ? currentAverageRating.toFixed(1) : "—"}
            </div>
            <div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(currentAverageRating)
                        ? "text-[#A8836C] fill-[#A8836C]"
                        : "text-[#D0AE92]/50 dark:text-[#77574A]/60"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] mt-1 font-medium">
                {totalRatingsCount} {totalRatingsCount === 1 ? "rating" : "ratings"} from real users
              </p>
            </div>
          </div>

          {userExistingRating && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center justify-end space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>You Rated</span>
              </span>
              <span className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{userExistingRating} Stars</span>
            </div>
          )}
        </div>

        {/* Submit Interactive Star Rating */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] uppercase tracking-wider">
            {userExistingRating ? "Update Your Star Rating" : "Rate this Presentation"}
          </label>
          <div className="flex items-center space-x-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (hoveredScore ?? selectedScore) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredScore(star)}
                  onMouseLeave={() => setHoveredScore(null)}
                  onClick={() => handleRate(star)}
                  disabled={isSubmittingRating}
                  className="p-1 rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#A8836C]/20 transition-transform active:scale-95 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 transition-all ${
                      isFilled ? "text-[#A8836C] fill-[#A8836C] scale-110 drop-shadow-[0_0_8px_rgba(212,169,138,0.5)]" : "text-[#D0AE92]/50 dark:text-[#77574A] hover:text-[#A8836C]"
                    }`}
                  />
                </button>
              );
            })}
            <span className="text-xs font-semibold text-[#4A3A34] dark:text-[#FFFFFF] ml-2">
              {hoveredScore || selectedScore} / 5 Stars
            </span>
          </div>
        </div>

        {/* Submit Review Form */}
        <form onSubmit={handleReviewSubmit} className="mt-5 space-y-3">
          <label className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] uppercase tracking-wider">
            Write a Comment / Review
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share constructive feedback or what you found helpful about this slide deck..."
              className="w-full bg-[#FDFBF7] dark:bg-[#2A2521] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-xl p-3 text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/50 dark:placeholder-[#B8ABA0] focus:outline-none focus:border-[#77574A] dark:focus:border-[#A8836C] dark:focus:ring-2 dark:focus:ring-[#A8836C]/30 transition-all"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingReview || !reviewComment.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#77574A] to-[#5D4338] hover:from-[#5D4338] hover:to-[#4A3A34] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] dark:hover:from-[#BF9981] dark:hover:to-[#A8836C] disabled:opacity-50 text-[#FFFFFF] text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-[#77574A]/20 dark:shadow-[0_4px_16px_rgba(212,169,138,0.35)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingReview ? "Posting..." : "Submit Review"}</span>
            </button>
          </div>
        </form>

        {/* Real User Reviews List */}
        <div className="mt-6 pt-4 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[#77574A] dark:text-[#A39487]" />
              <span>Public Community Reviews ({reviews.length})</span>
            </div>
          </div>

          {loadingReviews ? (
            <div className="py-6 text-center text-xs text-[#77574A] dark:text-[#FFFFFF] animate-pulse">
              Loading verified reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#77574A] dark:text-[#FFFFFF] bg-[#EBD7BE]/20 dark:bg-[#2A2521]/60 rounded-xl border border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
              No reviews yet. Be the first to share your thoughts on this presentation!
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-3.5 rounded-xl bg-[#EBD7BE]/25 dark:bg-[#3E3731] border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF]">{rev.user_name || "Community Member"}</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= rev.rating ? "text-[#A8836C] fill-[#A8836C]" : "text-[#D0AE92]/50 dark:text-[#77574A]/60"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#4A3A34] dark:text-[#FFFFFF] leading-relaxed">{rev.comment}</p>
                  <span className="text-[10px] text-[#77574A]/70 dark:text-[#FFFFFF]/70 block">
                    {new Date(rev.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
