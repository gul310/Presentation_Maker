import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  Download,
  Eye,
  Star,
  Layers,
  Globe,
  BookOpen,
  Mic,
  CheckCircle2,
  Lock,
  Search,
  X,
  Loader2,
  MessageSquare,
  Compass,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { communityApi } from "../services/communityApi";
import { downloadPresentationExport } from "../services/presentationApi";
import type { PublicPresentationItem } from "../types/community";
import { RatingReviewModal } from "../components/RatingReviewModal";
import { RobotInteractiveShowcase } from "../components/RobotInteractiveShowcase";

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

// Curated sample presentations if the database is initially empty
const SAMPLE_COMMUNITY_DECKS: PublicPresentationItem[] = [
  {
    id: "sample-ai-med",
    user_id: "demo-1",
    title: "Artificial Intelligence in Modern Healthcare & Diagnostics",
    language: "English",
    slide_count: 8,
    presentation_type: "Informative",
    source_type: "prompt",
    status: "ready",
    visibility: "public",
    views_count: 1420,
    average_rating: 4.9,
    ratings_count: 48,
    author_name: "Dr. Sarah Connor",
    author_role: "Medical Researcher",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slides: [
      {
        id: "s1",
        slide_number: 1,
        title: "AI in Clinical Diagnostics: Deep Learning & Patient Outcomes",
        layout_type: "title",
        content: {
          subtitle: "Transforming Radiology, Pathology, and Early Disease Detection",
          bullet_points: []
        },
        speaker_notes: "Welcome everyone. Today we examine neural networks in clinical environments."
      },
      {
        id: "s2",
        slide_number: 2,
        title: "Key Diagnostic Milestones & Neural Networks",
        layout_type: "timeline",
        content: { bullet_points: [] },
        speaker_notes: "Over 94% accuracy in radiological screening."
      }
    ]
  },
  {
    id: "sample-climate",
    user_id: "demo-2",
    title: "Global Renewable Energy Transition: 2026-2035",
    language: "English",
    slide_count: 6,
    presentation_type: "Technical",
    source_type: "prompt",
    status: "ready",
    visibility: "public",
    views_count: 980,
    average_rating: 4.8,
    ratings_count: 31,
    author_name: "Tariq Mahmood",
    author_role: "Energy Analyst",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slides: [
      {
        id: "s3",
        slide_number: 1,
        title: "Grid Decarbonization: Offshore Wind & Storage Parity",
        layout_type: "title",
        content: {
          subtitle: "Achieving 80% Clean Baseload Power Across Global Grids",
          bullet_points: []
        },
        speaker_notes: "Evaluating solar PV and grid-scale storage."
      },
      {
        id: "s4",
        slide_number: 2,
        title: "Storage Parity & Grid Reliability KPIs",
        layout_type: "stats_grid",
        content: { bullet_points: [] },
        speaker_notes: "Battery costs decreased by 60%."
      }
    ]
  },
  {
    id: "sample-startup",
    user_id: "demo-3",
    title: "Next-Gen Fintech: Seed Investment Pitch Deck",
    language: "English",
    slide_count: 10,
    presentation_type: "Pitch Deck",
    source_type: "prompt",
    status: "ready",
    visibility: "public",
    views_count: 2150,
    average_rating: 5.0,
    ratings_count: 64,
    author_name: "Elena Rostova",
    author_role: "Startup Founder",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slides: [
      {
        id: "s5",
        slide_number: 1,
        title: "FinFlow: Borderless Real-Time Treasury Settlements",
        layout_type: "title",
        content: {
          subtitle: "Institutional Liquidity Infrastructure for Modern Enterprises",
          bullet_points: []
        },
        speaker_notes: "Tackling the $35T cross-border payments friction."
      },
      {
        id: "s6",
        slide_number: 2,
        title: "Traction Metrics & MoM Growth",
        layout_type: "comparison",
        content: { bullet_points: [] },
        speaker_notes: "18% compound monthly ARR growth."
      }
    ]
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Community decks state
  const [publicDecks, setPublicDecks] = useState<PublicPresentationItem[]>([]);
  const [loadingDecks, setLoadingDecks] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Reviews modal state
  const [reviewDeck, setReviewDeck] = useState<PublicPresentationItem | null>(null);

  // Download & Auth required modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingDeckForDownload, setPendingDeckForDownload] = useState<PublicPresentationItem | null>(null);
  const [downloadingDeckId, setDownloadingDeckId] = useState<string | number | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch real public decks from Marketplace (Top 3 highest rated as requested)
  useEffect(() => {
    const fetchPublicPresentations = async () => {
      try {
        setLoadingDecks(true);
        const res = await communityApi.getMarketplaceItems({
          sort: "highest_rated",
          limit: 10
        });
        const allItems = (res.items && res.items.length > 0) ? res.items : SAMPLE_COMMUNITY_DECKS;
        // Strictly sort by highest average rating descending
        const sorted = [...allItems].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        // Take top 3 presentations from marketplace
        setPublicDecks(sorted.slice(0, 3) as any);
      } catch (err) {
        console.error("Failed to load marketplace decks:", err);
        const sorted = [...SAMPLE_COMMUNITY_DECKS].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        setPublicDecks(sorted.slice(0, 3));
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchPublicPresentations();
  }, []);

  // Filter public presentations (Top 3 only)
  const filteredDecks = publicDecks.filter((deck) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.author_name && deck.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deck.language && deck.language.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      selectedFilter === "all" ||
      (deck.presentation_type && deck.presentation_type.toLowerCase() === selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  }).slice(0, 3);

  // Handle Download Click - strictly gates downloads behind authentication
  const handleDownloadClick = async (deck: PublicPresentationItem) => {
    if (!user) {
      setPendingDeckForDownload(deck);
      setAuthModalOpen(true);
      return;
    }

    try {
      setDownloadingDeckId(deck.id);
      setDownloadNotice(null);

      if (String(deck.id).startsWith("sample-")) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setDownloadNotice({
          text: `Sample presentation "${deck.title}" downloaded successfully!`,
          type: "success"
        });
      } else {
        await downloadPresentationExport(deck.id, "pptx", deck.title);
        setDownloadNotice({
          text: `PowerPoint presentation "${deck.title}.pptx" downloaded successfully!`,
          type: "success"
        });
      }
    } catch (err: any) {
      console.error("Download failed:", err);
      setDownloadNotice({
        text: err.message || "Failed to download presentation. Please try again.",
        type: "error"
      });
    } finally {
      setDownloadingDeckId(null);
    }
  };

  return (
    <div className="space-y-16 pb-20 text-[#4A3A34] dark:text-[#FFFFFF]">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION - ELEGANT, CLEAR & HIGH CONTRAST */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-4 pb-12 lg:pb-16 max-w-6xl mx-auto">
        {/* Subtle decorative background glow */}
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[#EBD7BE]/40 dark:bg-[#8C7D70]/25 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading, Subtitle & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            {/* Small Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBD7BE]/70 dark:bg-[#8C7D70]/20 border border-[#D0AE92] dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#77574A] dark:bg-[#8C7D70] animate-pulse" />
              <span>Next-Generation Presentation AI</span>
            </div>

            {/* Main Headline matching reference image style */}
            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black text-[#4A3A34] dark:text-[#FFFFFF] leading-[1.12] tracking-tight">
              We create{" "}
              <span className="text-[#A8836C] dark:text-[#A39487] underline decoration-[#A8836C]/60 decoration-wavy decoration-2">
                solutions
              </span>{" "}
              for your presentations
            </h1>

            {/* Subtitle / Description */}
            <p className="text-[#77574A] dark:text-[#FFFFFF] text-sm sm:text-base leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
              Our team keeps a keen eye on emerging topics and AI technologies to ensure your presentation slides, speaker delivery, and design stay cutting-edge.
            </p>

            {/* CTA Button Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
              {user ? (
                <button
                  onClick={() => onNavigate("/create")}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm text-[#FFFFFF] shadow-lg shadow-[#77574A]/25 dark:shadow-[#8C7D70]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Presentation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("/signup")}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm text-[#FFFFFF] shadow-lg shadow-[#77574A]/25 dark:shadow-[#8C7D70]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  const el = document.getElementById("services-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full text-sm font-semibold text-[#5D4338] dark:text-[#FFFFFF] bg-[#F5EEE8]/90 hover:bg-[#EBD7BE]/80 dark:bg-[#3E3731]/90 dark:hover:bg-[#4D443D] border border-[#D0AE92]/60 hover:border-[#77574A]/50 dark:border-[#8C7D70]/60 dark:hover:border-[#A39487] shadow-sm hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_6px_25px_rgba(140,125,112,0.3)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-[#77574A]/10 dark:bg-[#8C7D70]/30 border border-[#D0AE92]/60 dark:border-[#8C7D70]/60 flex items-center justify-center text-[#77574A] dark:text-[#FFFFFF] transition-transform duration-500 group-hover:rotate-45">
                  <Compass className="w-3.5 h-3.5" />
                </span>
                <span className="tracking-wide">Explore</span>
                <ChevronDown className="w-4 h-4 text-[#77574A]/60 dark:text-[#8C7D70] group-hover:text-[#4A3A34] dark:group-hover:text-[#FFFFFF] transition-transform duration-300 group-hover:translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Right Column: 3D Illustration matching reference style */}
          <div className="lg:col-span-6 relative flex justify-center">
            {/* Floating decorative dots */}
            <span className="absolute -top-3 left-6 w-3 h-3 rounded-full bg-[#A8836C]/50 animate-bounce" />
            <span className="absolute top-1/4 -right-2 w-4 h-4 rounded-full bg-[#A8836C]/40 animate-pulse" />
            <span className="absolute -bottom-2 right-12 w-2.5 h-2.5 rounded-full bg-[#77574A]/40" />

            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-[#8C7D70]/40 max-w-md lg:max-w-none group">
              <img
                src="/images/hero_3d.jpg"
                alt="3D Presentation Professionals"
                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 3D ROBOT INTERACTIVE SIMULATION (PULL PHONE, LOGIN, TOPIC, MODES, DOWNLOAD & JUMP) */}
      {/* ========================================================================= */}
      <RobotInteractiveShowcase onNavigate={onNavigate} />

      {/* ========================================================================= */}
      {/* 3. WE PROVIDE THE BEST SERVICES (4 ELEVATED CARDS MATCHING REFERENCE) */}
      {/* ========================================================================= */}
      <section id="services-section" className="max-w-6xl mx-auto space-y-8 pt-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">
            We Provide The Best <span className="text-[#A8836C] dark:text-[#A39487]">Services</span>
          </h2>
          <p className="text-[#77574A] dark:text-[#FFFFFF] text-xs sm:text-sm max-w-md mx-auto font-medium">
            Let us unlock the full potential of your presentation with our data-driven AI strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Service 1 */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm hover:shadow-xl hover:dark:border-[#8C7D70]/40 hover:dark:shadow-[0_10px_25px_-5px_rgba(140,125,112,0.35)] hover:-translate-y-1 transition-all space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-[#A39487] mx-auto flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Prompt & Doc AI</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              Convert topics or upload PDF, DOCX, and PPTX files into rich visual presentations with automated outlines.
            </p>
          </div>

          {/* Service 2 */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm hover:shadow-xl hover:dark:border-[#8C7D70]/40 hover:dark:shadow-[0_10px_25px_-5px_rgba(140,125,112,0.35)] hover:-translate-y-1 transition-all space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Slide Tutor</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              Master complex slide topics with an interactive AI tutor explaining formulas, real-world analogies, and takeaways.
            </p>
          </div>

          {/* Service 3 */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm hover:shadow-xl hover:dark:border-[#8C7D70]/40 hover:dark:shadow-[0_10px_25px_-5px_rgba(140,125,112,0.35)] hover:-translate-y-1 transition-all space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center font-bold">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Speech Coach</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              Rehearse aloud with speech recognition, tracking words-per-minute (WPM), voice clarity, and pacing feedback.
            </p>
          </div>

          {/* Service 4 */}
          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm hover:shadow-xl hover:dark:border-[#8C7D70]/40 hover:dark:shadow-[0_10px_25px_-5px_rgba(140,125,112,0.35)] hover:-translate-y-1 transition-all space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center font-bold">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">PowerPoint PPTX</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              Download native PowerPoint (.pptx) files with embedded speaker notes, layouts, and diagrams ready to present.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SHOWCASE SECTION 1: SIMPLE SOLUTIONS (ARMCHAIR 3D & 4 NUMBERED STEPS) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto rounded-3xl p-8 sm:p-12 bg-[#EBD7BE]/35 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: 3D Illustration in Armchair */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-[#8C7D70]/40 max-w-sm group">
              <img
                src="/images/simple_solutions_3d.jpg"
                alt="Simple Solutions 3D Illustration"
                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Right Column: Numbered Step Guide */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">
                Simple <span className="text-[#A8836C] dark:text-[#A39487]">Solutions!</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#77574A] dark:text-[#FFFFFF] mt-1 font-medium">
                We understand that no two presentations are alike. That's why we guide you every step of the journey:
              </p>
            </div>

            {/* Steps list */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#77574A] text-[#FFFFFF] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Input Topic or Document</h4>
                  <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Type your presentation topic or upload PDF, DOCX, and PPTX reference papers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#A8836C] text-[#FFFFFF] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">AI Layout & Slide Structuring</h4>
                  <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">AI designs 16:9 slides with key metrics, timelines, diagrams, and speaker notes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#77574A] text-[#FFFFFF] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Rehearse with Speech Coach</h4>
                  <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Practice delivery with voice feedback, word cadence, and interactive Q&A tutor.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#A8836C] text-[#FFFFFF] font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  4
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Download PowerPoint (PPTX)</h4>
                  <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">Export native editable PowerPoint decks ready for business meetings and classrooms.</p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate(user ? "/create" : "/signup")}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-[#FFFFFF] bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] shadow-md transition-all"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("community-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] bg-white dark:bg-[#3E3731] border border-[#D0AE92] hover:bg-[#EBD7BE]/40 transition-all"
              >
                Read more
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SHOWCASE SECTION 2: OUR STUDIO & ANALYTICS (DESK 3D & DATA-DRIVEN) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto space-y-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Description & Data Insights */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBD7BE] dark:bg-[#8C7D70]/20 border border-[#D0AE92] dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold">
              <span>Presentation Studio & Analytics</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">
              Our <span className="text-[#A8836C] dark:text-[#A39487]">Studio & Analytics</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#77574A] dark:text-[#FFFFFF] leading-relaxed font-normal">
              We believe in the power of structured clarity. Our analytics-driven approach allows you to rehearse with real speech cadence metrics, track slide pace, and review community presentations.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
                <span className="text-2xl font-black text-[#A8836C] dark:text-[#A39487]">98%</span>
                <p className="text-[11px] text-[#77574A] dark:text-[#FFFFFF] font-semibold mt-0.5">Presentation Readiness</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
                <span className="text-2xl font-black text-[#77574A] dark:text-[#A39487]">140+</span>
                <p className="text-[11px] text-[#77574A] dark:text-[#FFFFFF] font-semibold mt-0.5">Optimal WPM Coach</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  const el = document.getElementById("community-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-[#FFFFFF] bg-[#77574A] hover:bg-[#5D4338] dark:bg-[#8C7D70] dark:hover:bg-[#A39487] shadow-md dark:shadow-[#8C7D70]/40 transition-all"
              >
                Browse Public Presentations
              </button>
            </div>
          </div>

          {/* Right Column: 3D Illustration at Desk with floating graphs */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-[#8C7D70]/40 max-w-sm lg:max-w-md group">
              <img
                src="/images/agency_analytics_3d.jpg"
                alt="Presentation Studio Analytics 3D"
                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PUBLIC SLIDES SECTION - SHOWCASE AS REAL POWERPOINT SLIDES */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto space-y-6 pt-4 relative">
        {/* Ambient Warm Caramel Glow in Dark Mode */}
        <div className="absolute -inset-6 -z-10 bg-radial from-[#A8836C]/12 via-[#A8836C]/4 to-transparent blur-3xl pointer-events-none rounded-3xl" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D0AE92]/40 dark:border-[#8C7D70]/40 pb-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBD7BE] dark:bg-[#8C7D70]/20 border border-[#D0AE92] dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold shadow-sm dark:shadow-[0_0_20px_-3px_rgba(212,169,138,0.35)] backdrop-blur-md">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-[#A39487] dark:fill-[#8C7D70]" />
              <span className="tracking-wide">Top 3 Rated Presentation Showcase</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">
              Highest Rated Presentations on{" "}
              <span className="bg-gradient-to-r from-[#4A3A34] via-[#77574A] to-[#A8836C] dark:from-[#FFFFFF] dark:via-[#A39487] dark:to-[#8C7D70] bg-clip-text text-transparent">
                Marketplace
              </span>
            </h2>
            <p className="text-xs md:text-sm text-[#77574A] dark:text-[#FFFFFF] max-w-2xl font-medium">
              Top 3 highest-rated presentations currently on our community marketplace. Preview slides, inspect layouts, and export or clone them.
            </p>
          </div>
        </div>

        {/* Global Download Notice Banner */}
        {downloadNotice && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-sm transition-all ${
              downloadNotice.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-semibold"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 font-semibold"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{downloadNotice.text}</span>
            </div>
            <button
              onClick={() => setDownloadNotice(null)}
              className="text-[#77574A] hover:text-[#4A3A34] dark:hover:text-white p-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-[#3E3731]/95 dark:via-[#332D28]/95 dark:to-[#3E3731]/95 backdrop-blur-xl border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 shadow-sm dark:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6),0_0_20px_-4px_rgba(212,169,138,0.18)]">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#77574A] dark:text-[#A39487] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presentations by topic, author, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F9F2E4]/40 dark:bg-[#2A2521] border border-[#D0AE92]/60 dark:border-[#8C7D70]/40 text-xs text-[#4A3A34] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#F5EEE8]/50 focus:outline-none focus:border-[#77574A] dark:focus:border-[#A8836C] dark:focus:ring-2 dark:focus:ring-[#A8836C]/30 transition-all"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "Informative", "Technical", "Pitch Deck", "Educational"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedFilter(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedFilter.toLowerCase() === type.toLowerCase()
                    ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:to-[#8C7D70] text-[#FFFFFF] dark:text-white shadow-sm dark:shadow-[0_4px_16px_rgba(212,169,138,0.4)] dark:border dark:border-[#8C7D70]/40"
                    : "text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/50 dark:hover:bg-[#A8836C]/20 dark:hover:text-[#FFFFFF] border border-transparent dark:hover:border-[#A8836C]/35"
                }`}
              >
                {type === "all" ? "All Categories" : type}
              </button>
            ))}
          </div>
        </div>

        {/* PPT Slide Showcase Grid */}
        {loadingDecks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#EBD7BE]/30 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 animate-pulse"
              />
            ))}
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 max-w-md mx-auto space-y-3">
            <Globe className="w-10 h-10 mx-auto text-[#A8836C]" />
            <h3 className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF]">No Presentations Found</h3>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF]">
              No shared presentations match your current search query. Try searching another topic.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("all");
              }}
              className="text-xs font-bold text-[#77574A] dark:text-[#A39487] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => {
              const firstSlide = deck.slides && deck.slides.length > 0 ? deck.slides[0] : null;
              const firstSlideTitle = firstSlide?.title || deck.title;
              const firstSlideSubtitle =
                firstSlide?.content?.subtitle || firstSlide?.speaker_notes || "Executive Presentation Overview";

              return (
                <div
                  key={deck.id}
                  className="rounded-2xl bg-white dark:bg-gradient-to-b dark:from-[#3E3731] dark:to-[#332D28] border border-[#D0AE92]/45 dark:border-[#8C7D70]/40 hover:border-[#A8836C] dark:hover:border-[#A8836C] shadow-sm hover:shadow-lg dark:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_16px_40px_-6px_rgba(212,169,138,0.35)] transition-all duration-300 p-5 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Hairline Amber/Caramel Glow Accent in Dark Mode */}
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#A8836C]/80 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-3.5">
                    {/* Category Tag & Rating Stars Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EBD7BE]/70 dark:bg-[#8C7D70]/25 text-[#4A3A34] dark:text-[#FFFFFF] border border-[#D0AE92]/70 dark:border-[#8C7D70]/40 tracking-wide shadow-sm">
                        {deck.presentation_type || "Presentation"}
                      </span>

                      {/* Interactive Rating Badge - opens reviews */}
                      <button
                        onClick={() => setReviewDeck(deck)}
                        title="Click to view all reviews and write a comment"
                        className="flex items-center space-x-1.5 text-xs font-bold text-[#A8836C] hover:text-[#77574A] dark:hover:text-[#BF9981] transition-colors px-2.5 py-1 rounded-lg dark:bg-[#8C7D70]/15 dark:border dark:border-[#8C7D70]/40"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#A8836C] text-[#A8836C] drop-shadow-[0_0_6px_rgba(212,169,138,0.5)]" />
                        <span className="text-[#4A3A34] dark:text-[#FFFFFF] font-extrabold">
                          {deck.average_rating ? deck.average_rating.toFixed(1) : "5.0"}
                        </span>
                        <span className="text-[#77574A] dark:text-[#FFFFFF] font-normal">
                          ({deck.ratings_count || 12})
                        </span>
                      </button>
                    </div>

                    {/* ======================================================= */}
                    {/* REAL 16:9 POWERPOINT SLIDE 1 CANVAS PREVIEW */}
                    {/* ======================================================= */}
                    <div
                      onClick={() => {
                        if (!String(deck.id).startsWith("sample-")) {
                          onNavigate(`/p/${deck.id}`);
                        }
                      }}
                      className="relative aspect-video w-full rounded-xl overflow-hidden cursor-pointer shadow-inner border border-[#A8836C]/40 dark:border-[#8C7D70]/40 bg-gradient-to-br from-[#5D463E] via-[#6D5349] to-[#4D3A32] dark:from-[#6E6156] dark:via-[#8C7D70] dark:to-[#8C7D70] p-4 sm:p-5 flex flex-col justify-between group/slide hover:ring-2 hover:ring-[#A8836C] transition-all text-[#FFFFFF]"
                    >
                      {/* Background ambient radial highlight inside slide */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#A8836C]/15 blur-xl pointer-events-none" />

                      {/* Top PowerPoint Slide Ribbon */}
                      <div className="flex items-center justify-between relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EBD7BE]/25 dark:bg-[#8C7D70]/25 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 backdrop-blur-sm text-[10px] font-mono font-bold text-[#FDF9F3] tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#A8836C] animate-pulse"></span>
                          <span>SLIDE 1</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#D0AE92] tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/40 dark:bg-[#8C7D70]/80 border border-[#A8836C]/30">
                          {deck.language || "English"}
                        </span>
                      </div>

                      {/* Slide Title & Subtitle Canvas */}
                      <div className="space-y-1.5 my-auto text-left relative z-10">
                        <h4 className="text-sm sm:text-base font-extrabold text-[#FFFFFF] leading-snug line-clamp-2 drop-shadow-sm group-hover/slide:text-[#EBD7BE] transition-colors">
                          {firstSlideTitle}
                        </h4>
                        <p className="text-[11px] text-[#D0AE92] line-clamp-2 font-normal leading-relaxed">
                          {firstSlideSubtitle}
                        </p>
                      </div>

                      {/* Slide 1 Footer Ribbon */}
                      <div className="flex items-center justify-between text-[10px] text-[#D0AE92] pt-2 border-t border-[#D0AE92]/20 dark:border-[#8C7D70]/40 relative z-10">
                        <span className="font-semibold text-[#EBD7BE]">By {deck.author_name}</span>
                        <span className="px-2 py-0.5 rounded bg-[#A8836C]/60 dark:bg-[#8C7D70]/25 border border-[#A8836C]/50 text-[#FFFFFF] font-mono font-bold">
                          PPTX • {deck.slide_count} Slides
                        </span>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-[#8C7D70]/85 opacity-0 group-hover/slide:opacity-100 backdrop-blur-[2px] transition-opacity flex items-center justify-center gap-2 z-20">
                        <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#A8836C] to-[#8E6953] border border-[#C5A38C]/40 text-[#FFFFFF] text-xs font-bold shadow-lg shadow-[#A8836C]/40 flex items-center gap-2 transform group-hover/slide:scale-105 transition-transform">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Slideshow</span>
                        </span>
                      </div>
                    </div>

                    {/* Deck Title */}
                    <h3
                      onClick={() => {
                        if (!String(deck.id).startsWith("sample-")) {
                          onNavigate(`/p/${deck.id}`);
                        }
                      }}
                      className="text-base font-bold text-[#4A3A34] dark:text-[#FFFFFF] group-hover:text-[#A8836C] dark:group-hover:text-[#A8836C] transition-colors line-clamp-1 cursor-pointer pt-1"
                    >
                      {deck.title}
                    </h3>

                    {/* Slide Deck Metrics Strip */}
                    <div className="flex items-center space-x-3 text-xs text-[#77574A] dark:text-[#FFFFFF] font-semibold">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-[#77574A] dark:text-[#A39487]" />
                        <span>{deck.slide_count} slides</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3.5 h-3.5 text-[#77574A] dark:text-[#A39487]" />
                        <span>{deck.views_count || 0} views</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Globe className="w-3.5 h-3.5 text-[#77574A] dark:text-[#A39487]" />
                        <span>{deck.language || "English"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Creator Info & Action Buttons */}
                  <div className="mt-5 pt-3.5 border-t border-[#D0AE92]/40 dark:border-[#8C7D70]/40 space-y-2.5">
                    {/* Review Button & View Slides */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Reviews & Comments Trigger */}
                      <button
                        onClick={() => setReviewDeck(deck)}
                        className="px-3 py-2.5 rounded-xl bg-[#EBD7BE]/60 hover:bg-[#EBD7BE] dark:bg-[#8C7D70]/20 dark:hover:bg-[#A8836C]/25 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 hover:border-[#A8836C] dark:hover:border-[#A8836C] shadow-sm hover:shadow-[0_0_12px_rgba(140,125,112,0.35)]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#77574A] dark:text-[#A39487]" />
                        <span>Reviews ({deck.ratings_count || 0})</span>
                      </button>

                      {/* View Presentation Slides */}
                      <button
                        onClick={() => {
                          if (String(deck.id).startsWith("sample-")) {
                            onNavigate("/signup");
                          } else {
                            onNavigate(`/p/${deck.id}`);
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-[#EBD7BE]/60 hover:bg-[#EBD7BE] dark:bg-[#8C7D70]/20 dark:hover:bg-[#A8836C]/25 text-[#4A3A34] dark:text-[#FFFFFF] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 hover:border-[#A8836C] dark:hover:border-[#A8836C] shadow-sm hover:shadow-[0_0_12px_rgba(140,125,112,0.35)]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#77574A] dark:text-[#A39487]" />
                        <span>View Slides</span>
                      </button>
                    </div>

                    {/* Prominent DOWNLOAD PPTX BUTTON */}
                    <button
                      onClick={() => handleDownloadClick(deck)}
                      disabled={downloadingDeckId === deck.id}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#77574A] to-[#5D4338] hover:from-[#5D4338] hover:to-[#4A3A34] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#6E6156] dark:hover:from-[#B5A79A] dark:hover:via-[#998A7D] dark:hover:to-[#7E7064] text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-md shadow-[#77574A]/25 dark:shadow-[0_6px_22px_-2px_rgba(140,125,112,0.45)] dark:hover:shadow-[0_8px_28px_-1px_rgba(140,125,112,0.65)] border border-transparent dark:border-[#8C7D70]/40 dark:hover:border-[#FFFFFF]/60 active:scale-[0.98] transition-all tracking-wide disabled:opacity-50 group/btn cursor-pointer"
                      title={user ? "Download PowerPoint file" : "Login required to download"}
                    >
                      {downloadingDeckId === deck.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#FFFFFF]" />
                          <span>Downloading PPTX...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-[#FFFFFF] group-hover/btn:-translate-y-0.5 transition-transform" />
                          <span>Download Presentation (PPTX)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. WHAT CLIENTS SAY! (TESTIMONIALS MATCHING REFERENCE IMAGE) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto space-y-8 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">
            What <span className="text-[#A8836C] dark:text-[#A39487]">Clients Say!</span>
          </h2>
          <p className="text-[#77574A] dark:text-[#FFFFFF] text-xs sm:text-sm max-w-md mx-auto font-medium">
            See how our AI presentation maker helped users communicate ideas with clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#EBD7BE] dark:bg-[#8C7D70]/25 text-[#4A3A34] dark:text-[#FFFFFF] font-bold flex items-center justify-center text-xs">
                JH
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Dr. Jacob Hughes</h4>
                <p className="text-[10px] text-[#77574A] dark:text-[#A39487]">Medical Educator</p>
              </div>
            </div>
            <div className="flex text-[#A8836C] text-xs"></div>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              &ldquo;The AI slide tutor and PowerPoint export saved me hours of lecture prep. The speaker notes are remarkably accurate.&rdquo;
            </p>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#D0AE92] dark:bg-[#8C7D70]/25 text-[#4A3A34] dark:text-[#FFFFFF] font-bold flex items-center justify-center text-xs">
                AK
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Ayesha Khan</h4>
                <p className="text-[10px] text-[#77574A] dark:text-[#A39487]">Senior Analyst</p>
              </div>
            </div>
            <div className="flex text-[#A8836C] text-xs"></div>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              &ldquo;The live speech coaching analyzed my rehearsal cadence in seconds. My board presentation was flawless.&rdquo;
            </p>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#A8836C] text-[#FFFFFF] font-bold flex items-center justify-center text-xs">
                MR
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF]">Marcus Reed</h4>
                <p className="text-[10px] text-[#77574A] dark:text-[#A39487]">Startup Founder</p>
              </div>
            </div>
            <div className="flex text-[#A8836C] text-xs"></div>
            <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed">
              &ldquo;Converting our dense research paper directly into clean 16:9 slides and downloading native PPTX is pure magic.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. READY TO GET STARTED BANNER (MATCHING REFERENCE IMAGE) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto rounded-3xl p-6 sm:p-8 bg-[#77574A] dark:bg-gradient-to-r dark:from-[#3E3731] dark:via-[#332D28] dark:to-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#FFFFFF] shadow-xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold">Ready to get started?</h3>
          <p className="text-xs text-[#EBD7BE] mt-0.5 font-normal">
            Generate impactful presentations with AI tutoring and speech rehearsal analytics.
          </p>
        </div>
        <button
          onClick={() => onNavigate(user ? "/create" : "/signup")}
          className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#F9F2E4] text-[#4A3A34] hover:bg-[#EBD7BE] dark:bg-[#8C7D70] dark:text-[#FFFFFF] dark:hover:bg-[#A39487] dark:border dark:border-[#8C7D70]/40 dark:shadow-[0_4px_16px_rgba(140,125,112,0.4)] shadow-md transition-all flex-shrink-0 cursor-pointer"
        >
          {user ? "Create Presentation" : "Get Started Free"}
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 8. MULTI-COLUMN FOOTER (MATCHING REFERENCE IMAGE FOOTER) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4. ELEGANT & CUTE FOOTER WITH WAVING ROBOT */}
      {/* ========================================================================= */}
      <footer className="max-w-6xl mx-auto my-12 relative">
        {/* Glow behind footer */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-r from-amber-500/10 via-[#A8836C]/25 to-orange-400/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative rounded-3xl bg-gradient-to-br from-[#FFFFFF]/90 via-[#F9F2E4]/80 to-[#EBD7BE]/60 dark:from-[#3E3731] dark:via-[#332D28] dark:to-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 shadow-2xl p-8 md:p-12 overflow-hidden backdrop-blur-md">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
            {/* Left 7 Columns: Brand Info & Navigation Columns */}
            <div className="lg:col-span-8 space-y-6">
              {/* Brand Logo & Name */}
              <div className="flex items-center space-x-3">
                <img 
                  src="/images/logo.png" 
                  alt="Presentation Maker Logo"
                  className="w-10 h-10 rounded-xl object-cover shadow-md border border-[#D0AE92]/40 bg-white"
                />
                <div>
                  <h3 className="font-extrabold text-base md:text-lg text-[#4A3A34] dark:text-[#FFFFFF] tracking-tight">
                    Presentation Maker
                  </h3>
                  <p className="text-xs text-[#77574A] dark:text-[#F5EEE8]">
                    Next-Gen AI Presentation, Speech Practice & Marketplace Platform
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#6B4E3D] dark:text-[#FFFFFF]/90 max-w-xl leading-relaxed">
                Transform ideas, research outlines, or topics into structured, beautifully styled PowerPoint decks in seconds. Practice with AI speech feedback and discover executive slides from community creators.
              </p>

              {/* Navigation Links Columns */}
              <div className="grid grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-[#4A3A34] dark:text-[#FFFFFF]">
                    Platform
                  </h5>
                  <ul className="space-y-1.5 text-xs text-[#77574A] dark:text-[#FFFFFF]">
                    <li><button onClick={() => onNavigate(user ? "/create" : "/login")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">AI Generator</button></li>
                    <li><button onClick={() => onNavigate("/marketplace")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Marketplace</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Speech Practice</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Visual Studio</button></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-[#4A3A34] dark:text-[#FFFFFF]">
                    Community
                  </h5>
                  <ul className="space-y-1.5 text-xs text-[#77574A] dark:text-[#FFFFFF]">
                    <li><button onClick={() => onNavigate("/marketplace")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Top 3 Rated Decks</button></li>
                    <li><button onClick={() => onNavigate("/marketplace")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Creator Monetization</button></li>
                    <li><button onClick={() => onNavigate("/marketplace")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Reviews & Ratings</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Public Templates</button></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-[#4A3A34] dark:text-[#FFFFFF]">
                    Resources
                  </h5>
                  <ul className="space-y-1.5 text-xs text-[#77574A] dark:text-[#FFFFFF]">
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Help & Tutorials</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Privacy Policy</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Terms of Service</button></li>
                    <li><button onClick={() => onNavigate("/")} className="hover:text-amber-600 dark:hover:text-[#A8836C] transition-colors">Contact Support</button></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Cute Waving Robot Showcase Feature */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center relative">
              <div className="relative p-4 rounded-3xl bg-white/70 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-xl backdrop-blur-md flex flex-col items-center text-center max-w-xs group hover:border-[#A8836C] dark:hover:border-[#A8836C]/70 transition-all">
                {/* Speech Bubble */}
                <div className="relative mb-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/15 dark:bg-[#8C7D70]/25 border border-amber-500/30 dark:border-[#8C7D70]/40 text-[11px] font-bold text-amber-800 dark:text-[#FFFFFF] shadow-sm animate-pulse">
                  "Hi! Need a presentation? I'm ready!"
                  {/* Small triangular pointer */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500/15 dark:bg-[#8C7D70]/25 border-r border-b border-amber-500/30 dark:border-[#8C7D70]/40 rotate-45" />
                </div>

                {/* Cute Waving Robot Image without any text */}
                <div className="relative w-44 h-52 overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105">
                  <img
                    src="/images/robot_waving.png"
                    alt="Cute AI Robot waving hello"
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>

                {/* Friendly CTA Button */}
                <button
                  type="button"
                  onClick={() => onNavigate(user ? "/create" : "/login")}
                  className="mt-2 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#A8836C] to-[#77574A] hover:from-[#BF9981] hover:to-[#A8836C] text-white text-xs font-bold shadow-md shadow-amber-900/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Creating Free</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Status Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#77574A] dark:text-[#FFFFFF]">
            <p>
              Presentation Maker &copy; {new Date().getFullYear()} All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">AI Neural Engine Active</span>
              <span className="text-neutral-400"></span>
              <span>Made with for presenters</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. LOGIN REQUIRED MODAL (POPUP WHEN UNLOGGED USER CLICKS DOWNLOAD) */}
      {/* ========================================================================= */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-[#F9F2E4] dark:bg-[#3E3731] border border-[#D0AE92] dark:border-[#8C7D70]/40 shadow-2xl p-6 sm:p-7 space-y-5 text-center text-[#4A3A34] dark:text-[#FFFFFF]">
            {/* Close button */}
            <button
              onClick={() => {
                setAuthModalOpen(false);
                setPendingDeckForDownload(null);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-[#77574A] hover:text-[#4A3A34] dark:hover:text-white hover:bg-[#EBD7BE]/50 dark:hover:bg-[#483730] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Lock Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#EBD7BE] dark:bg-[#2A2521] border border-[#D0AE92] dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#FFFFFF] flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-7 h-7" />
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[#4A3A34] dark:text-[#FFFFFF]">
                Login Required to Download
              </h3>
              <p className="text-xs text-[#77574A] dark:text-[#FFFFFF] leading-relaxed font-medium">
                To download{" "}
                <span className="font-bold text-[#4A3A34] dark:text-[#FFFFFF]">
                  {pendingDeckForDownload ? `"${pendingDeckForDownload.title}"` : "this presentation"}
                </span>{" "}
                in PowerPoint (PPTX) format, please sign in or register for a free account.
              </p>
            </div>

            {/* Bullets */}
            <div className="p-3.5 rounded-xl bg-[#EBD7BE]/50 dark:bg-[#2A2521] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-left space-y-1.5 text-xs text-[#4A3A34] dark:text-[#FFFFFF]">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#77574A] dark:text-[#FFFFFF] flex-shrink-0" />
                <span>Download native Microsoft PowerPoint (PPTX) files</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#77574A] dark:text-[#FFFFFF] flex-shrink-0" />
                <span>Full access to speaker notes & speech rehearsal scripts</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#77574A] dark:text-[#FFFFFF] flex-shrink-0" />
                <span>Generate custom presentations from documents and prompts</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  setAuthModalOpen(false);
                  onNavigate("/login");
                }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-[#FFFFFF] shadow-md transition-all flex items-center justify-center gap-1.5 shiny-button cursor-pointer"
                style={{ backgroundColor: "var(--color-primary, #77574A)" }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Download</span>
              </button>

              <button
                onClick={() => {
                  setAuthModalOpen(false);
                  onNavigate("/signup");
                }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-[#4A3A34] dark:text-[#FFFFFF] bg-[#EBD7BE] hover:bg-[#D0AE92] dark:bg-[#2A2521] dark:hover:bg-[#5A453E] border border-[#D0AE92] dark:border-[#8C7D70]/40 transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Free Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PUBLIC REVIEWS & COMMENTS MODAL */}
      {/* ========================================================================= */}
      {reviewDeck && (
        <RatingReviewModal
          presentationId={reviewDeck.id}
          presentationTitle={reviewDeck.title}
          currentAverageRating={reviewDeck.average_rating || 0}
          totalRatingsCount={reviewDeck.ratings_count || 0}
          onClose={() => setReviewDeck(null)}
          onRatingSubmitted={(avg, count) => {
            setPublicDecks((prev) =>
              prev.map((it) =>
                it.id === reviewDeck.id
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
