import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  Star,
  Eye,
  Copy,
  Search,
  MessageSquare,
  Globe,
  ArrowRight,
  Layers,
  BookOpen,
  CreditCard,
  Lock
} from "lucide-react";
import { communityApi } from "../services/communityApi";
import type { PublicPresentationItem } from "../types/community";
import { RatingReviewModal } from "../components/RatingReviewModal";
import { useAuth } from "../context/AuthContext";

interface DiscoveryPageProps {
  onNavigate: (path: string) => void;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"templates" | "community">("templates");

  // Community decks state
  const [items, setItems] = useState<PublicPresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"trending" | "top_rated" | "popular" | "most_used" | "latest">("trending");
  const [language, setLanguage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedForReview, setSelectedForReview] = useState<PublicPresentationItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCloningId, setIsCloningId] = useState<string | number | null>(null);

  // Freemium Templates state (Part 11)
  const [templates, setTemplates] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [accessFilter, setAccessFilter] = useState("ALL");
  const [purchaseModalTemplate, setPurchaseModalTemplate] = useState<any | null>(null);
  const [purchaseInstructions, setPurchaseInstructions] = useState<any | null>(null);
  const [tmplTrxRef, setTmplTrxRef] = useState<string>("");
  const [tmplReceiptUrl, setTmplReceiptUrl] = useState<string>("");
  const [tmplPayerName, setTmplPayerName] = useState<string>("");
  const [submittingTmpl, setSubmittingTmpl] = useState<boolean>(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getFreemiumTemplates({
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        access_type: accessFilter !== "ALL" ? accessFilter : undefined,
        search: searchQuery.trim() || undefined
      });
      setTemplates(res.templates || []);
    } catch (err: any) {
      console.error("Failed to load freemium templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicDecks = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getDiscover({
        sort,
        language: language !== "all" ? language : undefined,
        search: searchQuery.trim() || undefined,
      });
      setItems(res.items || []);
    } catch (err: any) {
      console.error("Failed to load discover decks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "templates") {
      fetchTemplates();
    } else {
      fetchPublicDecks();
    }
  }, [viewMode, sort, language, categoryFilter, accessFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === "templates") fetchTemplates();
    else fetchPublicDecks();
  };

  const handleUseFreemiumTemplate = async (tmpl: any) => {
    if (!user) {
      onNavigate("/login");
      return;
    }

    if (!tmpl.is_unlocked) {
      // Trigger NayaPay purchase modal
      try {
        setIsCloningId(tmpl.id);
        const res = await communityApi.requestTemplatePurchase(tmpl.id);
        setPurchaseModalTemplate(tmpl);
        setPurchaseInstructions(res.payment_instructions);
        setTmplTrxRef(res.transaction_ref);
        setTmplPayerName(user.name || "");
      } catch (err: any) {
        setActionMessage(err.message || "Failed to initiate template purchase.");
      } finally {
        setIsCloningId(null);
      }
      return;
    }

    try {
      setIsCloningId(tmpl.id);
      setActionMessage(null);
      const res = await communityApi.useFreemiumTemplate(tmpl.id);
      setActionMessage(`Template "${tmpl.title}" cloned successfully!`);
      setTimeout(() => {
        onNavigate(`/presentation/${res.presentation.id}`);
      }, 1000);
    } catch (err: any) {
      setActionMessage(err.message || "Failed to clone template.");
    } finally {
      setIsCloningId(null);
    }
  };

  const handleSubmitTemplatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseModalTemplate) return;
    try {
      setSubmittingTmpl(true);
      await communityApi.submitTemplatePayment(purchaseModalTemplate.id, {
        transaction_ref: tmplTrxRef,
        receipt_url: tmplReceiptUrl,
        payer_name: tmplPayerName
      });
      setPurchaseModalTemplate(null);
      setActionMessage("Payment submitted for Super Admin approval! Your template will unlock upon verification.");
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to submit template payment proof.");
    } finally {
      setSubmittingTmpl(false);
    }
  };

  const handleUseAsTemplate = async (item: PublicPresentationItem) => {
    if (!user) {
      onNavigate("/login");
      return;
    }

    try {
      setIsCloningId(item.id);
      setActionMessage(null);
      const res = await communityApi.useAsTemplate(item.id);
      setActionMessage(`Template "${item.title}" cloned successfully into your workspace!`);
      setTimeout(() => {
        onNavigate(`/presentation/${res.presentation.id}`);
      }, 1200);
    } catch (err: any) {
      setActionMessage(err.message || "Failed to clone template.");
    } finally {
      setIsCloningId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 border border-[#8C7D70]/40 bg-gradient-to-br from-[#3E3731] via-[#332D28] to-[#3E3731] shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Presentation Hub</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#FFFFFF] leading-tight">
            Discover & Learn from <span className="bg-gradient-to-r from-[#FFFFFF] via-[#A39487] to-[#8C7D70] bg-clip-text text-transparent">Real Presentations</span>
          </h1>
          <p className="text-sm md:text-base text-[#FFFFFF] max-w-2xl">
            Explore publicly shared presentations created by students, educators, and professionals. View slides, practice with community decks, submit ratings, and clone any deck as an editable template.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-[#FFFFFF] hover:text-[#FFFFFF]">
            &times;
          </button>
        </div>
      )}

      {/* Switcher: Freemium Templates (8 Categories) vs Community Shared Presentations */}
      <div className="flex items-center gap-3 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setViewMode("templates")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            viewMode === "templates"
              ? "bg-[#77574A] dark:bg-[#8C7D70] text-white shadow-md"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#D0AE92]/30"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Curated Freemium Templates (8 Categories)</span>
        </button>

        <button
          onClick={() => setViewMode("community")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            viewMode === "community"
              ? "bg-[#77574A] dark:bg-[#8C7D70] text-white shadow-md"
              : "bg-[#EBD7BE]/40 dark:bg-[#3E3731] text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#D0AE92]/30"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Community Shared Presentations</span>
        </button>
      </div>

      {/* TEMPLATES VIEW CONTROLS */}
      {viewMode === "templates" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#EBD7BE]/35 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="font-bold text-[#77574A] dark:text-[#EBD7BE] shrink-0 mr-1">Category:</span>
                {[
                  "ALL",
                  "Business & Corporate",
                  "Education & University",
                  "Technology & AI",
                  "Healthcare",
                  "Marketing",
                  "Research & Academic",
                  "Portfolio & Creative",
                  "Pitch Decks"
                ].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? "bg-[#77574A] text-white"
                        : "bg-[#F9F2E4] dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#D0AE92]/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="font-bold text-[#77574A] dark:text-[#EBD7BE] shrink-0 mr-1">Access:</span>
                {["ALL", "FREE", "PLAN_INCLUDED", "PREMIUM"].map(acc => (
                  <button
                    key={acc}
                    onClick={() => setAccessFilter(acc)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      accessFilter === acc
                        ? "bg-[#77574A] text-white"
                        : "bg-[#F9F2E4] dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#D0AE92]/30"
                    }`}
                  >
                    {acc.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-2 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-[#77574A] absolute left-2.5 top-2.5" />
            </form>
          </div>

          {/* Templates Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-72 rounded-2xl bg-[#3E3731]/40 border border-[#8C7D70]/40 animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl bg-[#3E3731]/20 border border-[#8C7D70]/40 max-w-xl mx-auto space-y-3">
              <Layers className="w-8 h-8 text-[var(--color-primary)] mx-auto" />
              <h3 className="text-base font-bold text-white">No Templates Found</h3>
              <p className="text-xs text-[#EBD7BE]">Try adjusting your category or access filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 hover:border-[#A8836C] transition-all overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-xl"
                >
                  <div>
                    <div className="relative aspect-video w-full bg-[#EBD7BE]/40 overflow-hidden">
                      <img
                        src={tmpl.cover_image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085"}
                        alt={tmpl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          tmpl.access_type === "FREE"
                            ? "bg-emerald-500 text-white"
                            : tmpl.access_type === "PLAN_INCLUDED"
                            ? "bg-blue-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}>
                          {tmpl.access_type === "PREMIUM" ? `PKR ${tmpl.price_pkr}` : tmpl.access_type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                          {tmpl.slide_count} Slides
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                        {tmpl.category}
                      </span>
                      <h3 className="text-base font-bold text-[#4A3A34] dark:text-white line-clamp-2">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-[#77574A] dark:text-[#EBD7BE] line-clamp-2">
                        {tmpl.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-[#77574A] pt-2 border-t border-[#D0AE92]/20">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{tmpl.average_rating || 5.0}</span>
                        </span>
                        <span>Used {tmpl.usage_count || 0} times</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button
                      onClick={() => handleUseFreemiumTemplate(tmpl)}
                      disabled={isCloningId === tmpl.id}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                        tmpl.is_unlocked
                          ? "bg-[#77574A] hover:bg-[#5D4338] text-white"
                          : "bg-purple-600 hover:bg-purple-500 text-white"
                      }`}
                    >
                      {isCloningId === tmpl.id ? (
                        <span>Processing...</span>
                      ) : tmpl.is_unlocked ? (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Use & Clone Template</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock Template (PKR {tmpl.price_pkr})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMUNITY VIEW (When viewMode === "community") */}
      {viewMode === "community" && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#EBD7BE]/35 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
            {/* Sort Tabs */}
            <div className="flex items-center overflow-x-auto space-x-1 pb-2 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSort("trending")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  sort === "trending"
                    ? "bg-[#77574A] dark:bg-[#8C7D70] text-[#FFFFFF] shadow-md"
                    : "text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#4D443D]"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trending</span>
              </button>

              <button
                onClick={() => setSort("top_rated")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  sort === "top_rated"
                    ? "bg-[#77574A] dark:bg-[#8C7D70] text-[#FFFFFF] shadow-md"
                    : "text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#4D443D]"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Rated</span>
              </button>

              <button
                onClick={() => setSort("popular")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                  sort === "popular"
                    ? "bg-[#77574A] dark:bg-[#8C7D70] text-[#FFFFFF] shadow-md"
                : "text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#4D443D]"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Most Viewed</span>
          </button>

          <button
            onClick={() => setSort("most_used")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              sort === "most_used"
                ? "bg-[#77574A] dark:bg-[#8C7D70] text-[#FFFFFF] shadow-md"
                : "text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#4D443D]"
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Most Used</span>
          </button>

          <button
            onClick={() => setSort("latest")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              sort === "latest"
                ? "bg-[#77574A] dark:bg-[#8C7D70] text-[#FFFFFF] shadow-md"
                : "text-[#77574A] dark:text-[#FFFFFF] hover:text-[#4A3A34] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#4D443D]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Latest</span>
          </button>
        </div>

        {/* Search & Language Filters */}
        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] focus:outline-none focus:border-[#77574A] dark:focus:border-white/40"
          >
            <option value="all" className="bg-white dark:bg-[#2A2521]">All Languages</option>
            <option value="English" className="bg-white dark:bg-[#2A2521]">English</option>
            <option value="Urdu" className="bg-white dark:bg-[#2A2521]">Urdu (اردو)</option>
            <option value="Spanish" className="bg-white dark:bg-[#2A2521]">Spanish</option>
            <option value="French" className="bg-white dark:bg-[#2A2521]">French</option>
            <option value="German" className="bg-white dark:bg-[#2A2521]">German</option>
            <option value="Chinese" className="bg-white dark:bg-[#2A2521]">Chinese</option>
            <option value="Arabic" className="bg-white dark:bg-[#2A2521]">Arabic</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presentations..."
              className="w-full pl-8 pr-3 py-2 bg-[#F9F2E4]/80 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-gray-500 focus:outline-none focus:border-[#77574A] dark:focus:border-white/40"
            />
            <Search className="w-3.5 h-3.5 text-[#77574A] dark:text-[#FFFFFF] absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Grid of Real Presentations */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-[#3E3731]/40 border border-[#8C7D70]/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Real Empty State: Zero dummy cards */
        <div className="text-center py-20 px-6 rounded-3xl bg-[#3E3731]/20 border border-[#8C7D70]/40 max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Globe className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#FFFFFF]">No Public Presentations Yet</h3>
          <p className="text-xs text-[#FFFFFF] leading-relaxed">
            There are currently no presentations shared publicly in this category. Be the first to create an AI presentation and toggle its visibility to &ldquo;Public&rdquo;!
          </p>
          <button
            onClick={() => onNavigate("/create")}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[#FFFFFF] text-xs font-semibold transition-all inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create & Share Deck</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 hover:border-[#A8836C] transition-all p-5 flex flex-col justify-between group shadow-lg hover:shadow-xl"
            >
              <div className="space-y-3">
                {/* Badges & Meta */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EBD7BE]/50 dark:bg-[#4D443D] text-[#77574A] dark:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40">
                    {item.presentation_type || "Presentation"}
                  </span>
                  <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{item.average_rating ? item.average_rating.toFixed(1) : "—"}</span>
                    <span className="text-[#77574A] dark:text-[#FFFFFF]/80 font-normal">({item.ratings_count || 0})</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                  {item.title || (item as any).topic || item.slides?.[0]?.title || "Community Presentation"}
                </h3>

                {/* Slide Preview Highlights */}
                {item.slides && item.slides.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#F9F2E4]/60 dark:bg-[#2A2521]/60 border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#77574A] dark:text-[#FFFFFF]/80 tracking-wider flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-[var(--color-primary)]" />
                      <span>Slide Preview</span>
                    </span>
                    <p className="text-xs text-[#4A3A34] dark:text-[#FFFFFF] truncate font-medium">
                      1. {item.slides[0]?.title}
                    </p>
                    {item.slides[1] && (
                      <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]/90 truncate">
                        2. {item.slides[1]?.title}
                      </p>
                    )}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center space-x-4 text-xs text-[#77574A] dark:text-[#FFFFFF] pt-1">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-[#A8836C] dark:text-[#FFFFFF]/80" />
                    <span>{item.slide_count} slides</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3.5 h-3.5 text-[#A8836C] dark:text-[#FFFFFF]/80" />
                    <span>{item.views_count || 0} views</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Copy className="w-3.5 h-3.5 text-[#A8836C] dark:text-[#FFFFFF]/80" />
                    <span>{item.template_use_count || 0} uses</span>
                  </span>
                </div>
              </div>

              {/* Creator info & Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#FFFFFF]">
                  <span className="font-semibold text-[#4A3A34] dark:text-[#FFFFFF]">By {item.author_name}</span>
                  <span className="text-[11px] text-[#77574A] dark:text-[#FFFFFF]/80 uppercase">{item.language}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUseAsTemplate(item)}
                    disabled={isCloningId === item.id}
                    className="px-3 py-2 rounded-xl bg-[#77574A] hover:bg-[#5D4338] text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-colors shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isCloningId === item.id ? "Copying..." : "Use Template"}</span>
                  </button>

                  <button
                    onClick={() => setSelectedForReview(item)}
                    className="px-3 py-2 rounded-xl bg-[#EBD7BE]/50 hover:bg-[#EBD7BE]/80 dark:bg-[#4D443D] dark:hover:bg-[#5A4F47] text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-semibold flex items-center justify-center space-x-1 transition-colors border border-[#D0AE92]/40 dark:border-[#8C7D70]/40"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Rate ({item.reviews_count || 0})</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigate(`/p/${item.id}`)}
                  className="w-full py-2 rounded-xl bg-white dark:bg-[#4D443D] hover:bg-[#F9F2E4] dark:hover:bg-[#5A4F47] text-[#4A3A34] dark:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors group/btn shadow-sm"
                >
                  <span>View Public Deck</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}

      {/* NayaPay Template Purchase Modal (Part 11) */}
      {purchaseModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#4A3A34] dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-500" />
                  Unlock Premium Template
                </h3>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-extrabold">
                  {purchaseModalTemplate.title} — PKR {purchaseModalTemplate.price_pkr}
                </span>
              </div>
              <button
                onClick={() => setPurchaseModalTemplate(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Official NayaPay Credentials Card */}
            <div className="p-4 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#77574A] dark:text-[#EBD7BE]">
                Official Platform Payment Receiver (NayaPay)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#77574A] block text-[10px]">Recipient Name:</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">Syeda Gul Andam Malik Kazmi</span>
                </div>
                <div>
                  <span className="text-[#77574A] block text-[10px]">Payment Number / Account:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">03339114569</span>
                </div>
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#EBD7BE] pt-1">
                {purchaseInstructions?.note || `Transfer PKR ${purchaseModalTemplate.price_pkr} via NayaPay or any Bank app, Raast, JazzCash, or Easypaisa to 03339114569. Enter ${tmplTrxRef} in the transfer reference note.`}
              </p>
            </div>

            <form onSubmit={handleSubmitTemplatePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Sender / Payer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={tmplPayerName}
                  onChange={e => setTmplPayerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="Your name as displayed on bank receipt"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Transaction Reference ID (Trx ID)
                </label>
                <input
                  type="text"
                  required
                  value={tmplTrxRef}
                  onChange={e => setTmplTrxRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white font-mono"
                  placeholder="e.g. NP-TMP-... or bank transaction ID"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Receipt Screenshot / Image URL
                </label>
                <input
                  type="url"
                  value={tmplReceiptUrl}
                  onChange={e => setTmplReceiptUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="https://... (link to uploaded receipt screenshot)"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#D0AE92]/30">
                <button
                  type="button"
                  onClick={() => setPurchaseModalTemplate(null)}
                  className="px-4 py-2 rounded-xl border border-[#D0AE92]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTmpl}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md transition-colors"
                >
                  {submittingTmpl ? "Submitting..." : "Submit Payment for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating & Review Modal */}
      {selectedForReview && (
        <RatingReviewModal
          presentationId={selectedForReview.id}
          presentationTitle={selectedForReview.title}
          currentAverageRating={selectedForReview.average_rating || 0}
          totalRatingsCount={selectedForReview.ratings_count || 0}
          onClose={() => setSelectedForReview(null)}
          onRatingSubmitted={(avg, count) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === selectedForReview.id
                  ? { ...it, average_rating: avg, ratings_count: count }
                  : it
              )
            );
          }}
        />
      )}
    </div>
  );
};
