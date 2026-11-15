import React, { useState } from "react";
import { X, Globe, Lock, Copy, Check, ShoppingBag, Sparkles } from "lucide-react";
import { communityApi } from "../services/communityApi";

interface ShareModalProps {
  presentationId: string | number;
  initialVisibility?: "private" | "public";
  isTemplate?: boolean;
  onClose: () => void;
  onVisibilityChange?: (visibility: "private" | "public") => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  presentationId,
  initialVisibility = "private",
  onClose,
  onVisibilityChange,
}) => {
  const [visibility, setVisibility] = useState<"private" | "public">(initialVisibility);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marketplacePrice, setMarketplacePrice] = useState<string>("0");
  const [isPublishingMarketplace, setIsPublishingMarketplace] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const shareUrl = `${window.location.origin}/p/${presentationId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatusMessage("Failed to copy URL to clipboard.");
    }
  };

  const handleToggleVisibility = async (newVisibility: "private" | "public") => {
    try {
      setSaving(true);
      await communityApi.setVisibility(presentationId, newVisibility);
      setVisibility(newVisibility);
      if (onVisibilityChange) onVisibilityChange(newVisibility);
      setStatusMessage(
        newVisibility === "public"
          ? "Presentation is now Public and instantly visible on the Marketplace & Discover feed!"
          : "Presentation is now Private. It has been removed from the Marketplace."
      );
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to update sharing visibility.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPublishingMarketplace(true);
      const price = parseFloat(marketplacePrice) || 0;
      const res = await communityApi.publishToMarketplace(presentationId, price);
      setVisibility("public");
      setStatusMessage(res.message || "Successfully listed on the Marketplace!");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to publish to marketplace.");
    } finally {
      setIsPublishingMarketplace(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#F9F2E4] dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-[#2D2320] dark:text-[#FFFFFF]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#2D2320] dark:text-[#FFFFFF]">Share & Visibility Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#EBD7BE]/50 dark:hover:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-[#77574A] dark:text-[#FFFFFF] hover:opacity-80 ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Visibility Toggle Options */}
        <div className="mt-5 space-y-3">
          <label className="text-xs font-semibold text-[#77574A] dark:text-[#D1C7BD] uppercase tracking-wider">Access Control</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleToggleVisibility("private")}
              disabled={saving}
              className={`p-3.5 rounded-xl border flex flex-col items-start text-left transition-all ${
                visibility === "private"
                  ? "bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "bg-white/80 dark:bg-[#3E3731] border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] hover:border-indigo-400"
              }`}
            >
              <div className="flex items-center space-x-2 font-medium text-sm text-[#2D2320] dark:text-[#FFFFFF] mb-1">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Private</span>
              </div>
              <span className="text-xs text-[#77574A] dark:text-[#C5B7A9]">Only you can view and edit this deck.</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility("public")}
              disabled={saving}
              className={`p-3.5 rounded-xl border flex flex-col items-start text-left transition-all ${
                visibility === "public"
                  ? "bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "bg-white/80 dark:bg-[#3E3731] border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] hover:border-indigo-400"
              }`}
            >
              <div className="flex items-center space-x-2 font-medium text-sm text-[#2D2320] dark:text-[#FFFFFF] mb-1">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>Public</span>
              </div>
              <span className="text-xs text-[#77574A] dark:text-[#C5B7A9]">Discoverable on the Public page with ratings & reviews.</span>
            </button>
          </div>
        </div>

        {/* Public Sharing Link */}
        {visibility === "public" && (
          <div className="mt-5 space-y-2">
            <label className="text-xs font-semibold text-[#77574A] dark:text-[#D1C7BD] uppercase tracking-wider">Public Share Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-white dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl px-3.5 py-2 text-xs text-[#2D2320] dark:text-[#FFFFFF] font-mono select-all focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#77574A] dark:text-[#B8A89A]">
              Anyone with this link can view the slides, rate, review, and reuse as a template without modifying your original deck.
            </p>
          </div>
        )}

        {/* Marketplace Listing Section */}
        <div className="mt-5 pt-4 border-t border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-[#77574A] dark:text-[#D1C7BD] uppercase tracking-wider">Sell on Marketplace</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              85% Creator Payout
            </span>
          </div>
          <form onSubmit={handlePublishMarketplace} className="flex items-center space-x-2 mt-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-sm text-[#77574A] dark:text-[#C5B7A9]">$</span>
              <input
                type="number"
                min="0"
                step="0.99"
                value={marketplacePrice}
                onChange={(e) => setMarketplacePrice(e.target.value)}
                placeholder="0.00 (Free template)"
                className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#2D2320] dark:text-[#FFFFFF] focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPublishingMarketplace}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isPublishingMarketplace ? "Publishing..." : "List for Sale"}</span>
            </button>
          </form>
          <p className="text-[11px] text-[#77574A] dark:text-[#B8A89A] mt-1.5">
            Set $0.00 for free community template, or any price to earn real sales earnings.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#EBD7BE]/60 dark:bg-[#4D443D] hover:bg-[#EBD7BE] dark:hover:bg-[#5A4F47] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
