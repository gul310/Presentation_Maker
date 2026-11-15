import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Star,
  Layers,
  DollarSign,
  PlusCircle,
  X,
  Eye,
  MessageSquare,
  CheckCircle,
  Download,
  Settings,
  CreditCard
} from "lucide-react";
import { communityApi } from "../services/communityApi";
import { listPresentations } from "../services/presentationApi";
import type { MarketplaceItem, ReviewItem } from "../types/community";
import type { Presentation } from "../types/presentation";
import { useAuth } from "../context/AuthContext";

interface MarketplacePageProps {
  onNavigate: (path: string) => void;
}

type MarketplaceTab = "browse" | "seller_hub" | "purchases";

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("browse");

  // Browse State
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"highest_rated" | "sales" | "newest">("highest_rated");

  // Sell Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellMode, setSellMode] = useState<"ai_deck" | "upload_pptx">("ai_deck");
  const [userDecks, setUserDecks] = useState<Presentation[]>([]);
  const [selectedDeckToSell, setSelectedDeckToSell] = useState<string>("");
  const [listingTitle, setListingTitle] = useState("");
  const [listingShortDesc, setListingShortDesc] = useState("");
  const [listingDetailedDesc, setListingDetailedDesc] = useState("");
  const [listingCategory, setListingCategory] = useState("Education");
  const [listingTags, setListingTags] = useState("");
  const [listingPricePkr, setListingPricePkr] = useState("1000");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  // Buy Modal State
  const [selectedBuyItem, setSelectedBuyItem] = useState<any | null>(null);
  const [buyerPaymentMethod, setBuyerPaymentMethod] = useState("Easypaisa");
  const [buyerTxRef, setBuyerTxRef] = useState("");
  const [buyerProofNotes, setBuyerProofNotes] = useState("");
  const [isProcessingBuy, setIsProcessingBuy] = useState(false);
  const [activeOrderCreated, setActiveOrderCreated] = useState<any | null>(null);

  // Seller Hub State
  const [sellerData, setSellerData] = useState<any | null>(null);
  const [, setLoadingSellerHub] = useState(false);
  const [sellerPaymentMethod, setSellerPaymentMethod] = useState("Easypaisa");
  const [sellerAccountTitle, setSellerAccountTitle] = useState("");
  const [sellerAccountNumber, setSellerAccountNumber] = useState("");
  const [sellerBankName, setSellerBankName] = useState("");
  const [sellerInstructions, setSellerInstructions] = useState("");
  const [savingPaymentDetails, setSavingPaymentDetails] = useState(false);

  // Commission Submission Modal
  const [selectedCommissionOrder, setSelectedCommissionOrder] = useState<any | null>(null);
  const [commissionTxRef, setCommissionTxRef] = useState("");
  const [commissionReceiptFile, setCommissionReceiptFile] = useState<File | null>(null);
  const [isSubmittingCommission, setIsSubmittingCommission] = useState(false);

  // Buyer Dashboard State
  const [buyerData, setBuyerData] = useState<any | null>(null);
  const [, setLoadingBuyerHub] = useState(false);

  // Slide Viewer Modal State
  const [viewingDeck, setViewingDeck] = useState<MarketplaceItem | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Rating & Review Modal State
  const [reviewDeck, setReviewDeck] = useState<MarketplaceItem | null>(null);
  const [deckReviews, setDeckReviews] = useState<ReviewItem[]>([]);
  const [, setLoadingReviews] = useState<boolean>(false);
  const [userRatingScore, setUserRatingScore] = useState<number>(5);
  const [hoverRatingScore, setHoverRatingScore] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await communityApi.getMarketplaceItems({
        search: searchQuery.trim() || undefined,
        sort: sortBy
      });
      setItems(res.items || []);
    } catch (err) {
      console.error("Failed to load marketplace items:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerHub = async () => {
    if (!user) return;
    try {
      setLoadingSellerHub(true);
      const data = await communityApi.getSellerDashboard();
      setSellerData(data);
      if (data.seller_payment_info) {
        setSellerPaymentMethod(data.seller_payment_info.payment_method || "Easypaisa");
        setSellerAccountTitle(data.seller_payment_info.account_title || user.name);
        setSellerAccountNumber(data.seller_payment_info.account_number || "");
        setSellerBankName(data.seller_payment_info.bank_name || "");
        setSellerInstructions(data.seller_payment_info.instructions || "");
      }
    } catch (err: any) {
      console.error("Failed to load seller dashboard:", err);
    } finally {
      setLoadingSellerHub(false);
    }
  };

  const fetchBuyerHub = async () => {
    if (!user) return;
    try {
      setLoadingBuyerHub(true);
      const data = await communityApi.getBuyerDashboard();
      setBuyerData(data);
    } catch (err: any) {
      console.error("Failed to load buyer dashboard:", err);
    } finally {
      setLoadingBuyerHub(false);
    }
  };

  useEffect(() => {
    if (activeTab === "browse") {
      fetchItems();
    } else if (activeTab === "seller_hub") {
      fetchSellerHub();
    } else if (activeTab === "purchases") {
      fetchBuyerHub();
    }
  }, [activeTab, sortBy]);

  // Load reviews when opening review modal
  const openReviewModal = async (item: MarketplaceItem) => {
    setReviewDeck(item);
    setUserRatingScore(Math.round(item.average_rating || 5));
    setReviewComment("");
    try {
      setLoadingReviews(true);
      const reviews = await communityApi.getReviews(item.id);
      setDeckReviews(reviews || []);
    } catch {
      setDeckReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Submit Rating & Comment
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigate("/login");
      return;
    }
    if (!reviewDeck) return;
    if (!reviewComment.trim()) {
      setMessage({ type: "error", text: "Please enter a review comment." });
      return;
    }

    try {
      setIsSubmittingReview(true);
      await communityApi.ratePresentation(reviewDeck.id, userRatingScore);
      const newReview = await communityApi.submitReview(reviewDeck.id, userRatingScore, reviewComment.trim());
      setDeckReviews([newReview, ...deckReviews]);
      setMessage({ type: "success", text: "Your review and rating have been recorded!" });
      setReviewComment("");
      fetchItems();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit review." });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Open List for Sale Modal
  const openSellModal = async () => {
    if (!user) {
      onNavigate("/login");
      return;
    }
    try {
      const decks = await listPresentations();
      setUserDecks(decks);
      if (decks.length > 0) {
        setSelectedDeckToSell(decks[0].id.toString());
        setListingTitle(decks[0].title);
        setListingShortDesc(`Professional presentation deck on ${decks[0].title}`);
      }
      setShowSellModal(true);
    } catch (err) {
      console.error("Failed to load user presentations:", err);
      setShowSellModal(true);
    }
  };

  // Submit Seller Listing (Part 8)
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingTitle.trim() || !listingShortDesc.trim()) {
      setMessage({ type: "error", text: "Title and description are required." });
      return;
    }
    if (!ownershipConfirmed) {
      setMessage({ type: "error", text: "You must confirm ownership to sell this presentation." });
      return;
    }

    try {
      setIsSubmittingListing(true);
      let filePath: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let fileSizeBytes: number | undefined = undefined;
      let fileType: string = "ai_deck";

      if (sellMode === "upload_pptx") {
        if (!uploadedFile) {
          setMessage({ type: "error", text: "Please upload a PPT or PPTX presentation file." });
          setIsSubmittingListing(false);
          return;
        }
        const uploadRes = await communityApi.uploadPresentationFile(uploadedFile);
        filePath = uploadRes.file_path;
        fileName = uploadRes.file_name;
        fileSizeBytes = uploadRes.file_size_bytes;
        fileType = uploadRes.file_type;
      }

      await communityApi.createListing({
        presentation_id: sellMode === "ai_deck" ? selectedDeckToSell : undefined,
        title: listingTitle.trim(),
        short_description: listingShortDesc.trim(),
        detailed_description: listingDetailedDesc.trim(),
        category: listingCategory,
        tags: listingTags.split(",").map(t => t.trim()).filter(Boolean),
        price_pkr: Math.max(1, Number(listingPricePkr) || 1000),
        file_path: filePath,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        file_type: fileType,
        ownership_confirmed: true
      });

      setMessage({
        type: "success",
        text: "Presentation listing submitted for PENDING_REVIEW! Administrators will review and activate it shortly."
      });
      setShowSellModal(false);
      if (activeTab === "seller_hub") fetchSellerHub();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create listing." });
    } finally {
      setIsSubmittingListing(false);
    }
  };

  // Initiate Purchase (Part 9)
  const handleInitiateBuy = async (item: any) => {
    if (!user) {
      onNavigate("/login");
      return;
    }
    setSelectedBuyItem(item);
    setActiveOrderCreated(null);
    setBuyerTxRef("");
    setBuyerProofNotes("");
  };

  // Confirm Purchase Request
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyItem) return;

    try {
      setIsProcessingBuy(true);
      const buyRes = await communityApi.buyMarketplaceItem(selectedBuyItem.id || selectedBuyItem.listing_id);
      setActiveOrderCreated(buyRes);

      // Record buyer transaction reference if provided
      if (buyerTxRef.trim()) {
        await communityApi.confirmBuyerPayment((buyRes as any).order_id || buyRes.transaction_id || "", {
          payment_method: buyerPaymentMethod,
          transaction_ref: buyerTxRef.trim(),
          notes: buyerProofNotes.trim()
        });
      }

      setMessage({
        type: "success",
        text: `Purchase order initiated! Please transfer PKR ${selectedBuyItem.price_pkr || selectedBuyItem.price} directly to the seller.`
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to initiate purchase." });
    } finally {
      setIsProcessingBuy(false);
    }
  };

  // Seller Confirms Sale (Part 9)
  const handleSellerConfirmSale = async (orderId: string) => {
    if (!window.confirm("Confirm that you have received full payment in your account? This will unlock the presentation for the buyer.")) return;
    try {
      await communityApi.confirmSellerSale(orderId);
      setMessage({
        type: "success",
        text: "Sale confirmed! Buyer can now download the presentation. Please submit the 5% platform commission."
      });
      fetchSellerHub();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to confirm sale." });
    }
  };

  // Seller Submits 5% Commission (Part 9)
  const handleSubmitCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommissionOrder) return;
    if (!commissionTxRef.trim() && !commissionReceiptFile) {
      setMessage({ type: "error", text: "Please enter transaction reference or upload receipt screenshot." });
      return;
    }

    try {
      setIsSubmittingCommission(true);
      let receiptUrl: string | undefined = undefined;

      if (commissionReceiptFile) {
        const uploadRes = await communityApi.uploadReceipt(commissionReceiptFile);
        receiptUrl = uploadRes.receipt_url;
      }

      await communityApi.submitCommission(selectedCommissionOrder.id, {
        transaction_ref: commissionTxRef.trim() || undefined,
        receipt_url: receiptUrl
      });

      setMessage({
        type: "success",
        text: "5% platform commission submitted for verification! Administrators will verify receipt shortly."
      });
      setSelectedCommissionOrder(null);
      fetchSellerHub();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit commission." });
    } finally {
      setIsSubmittingCommission(false);
    }
  };

  // Save Seller Receiving Details
  const handleSaveSellerDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPaymentDetails(true);
      await communityApi.updateSellerPaymentDetails({
        payment_method: sellerPaymentMethod,
        account_title: sellerAccountTitle,
        account_number: sellerAccountNumber,
        bank_name: sellerBankName,
        instructions: sellerInstructions
      });
      setMessage({ type: "success", text: "Your receiving payment details have been saved!" });
      fetchSellerHub();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save payment details." });
    } finally {
      setSavingPaymentDetails(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCat = categoryFilter === "All" || (item as any).category === categoryFilter;
    return matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Marketplace Header Hero */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#4A3A34] via-[#5C4841] to-[#4A3A34] text-white shadow-xl border border-[#D0AE92]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            Open Presentation Marketplace & Seller Exchange
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Buy, Sell & Monetize High-Impact Presentations
          </h1>
          <p className="text-xs text-[#EBD7BE]/90 max-w-xl">
            Monetize AI-crafted presentations or upload external PPT/PPTX slide decks in PKR. Direct buyer-to-seller payments with a transparent 5% platform commission model.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openSellModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            Sell Presentation
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 pb-2">
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "browse"
              ? "bg-[#77574A] text-white shadow-sm"
              : "text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#EBD7BE]/30"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Marketplace
        </button>

        {user && (
          <>
            <button
              onClick={() => setActiveTab("seller_hub")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "seller_hub"
                  ? "bg-[#77574A] text-white shadow-sm"
                  : "text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#EBD7BE]/30"
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Seller Hub & Sales
            </button>

            <button
              onClick={() => setActiveTab("purchases")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "purchases"
                  ? "bg-[#77574A] text-white shadow-sm"
                  : "text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#EBD7BE]/30"
              }`}
            >
              <Download className="w-4 h-4 text-blue-500" />
              My Purchases
            </button>
          </>
        )}
      </div>

      {/* =========================================================================
          TAB 1: BROWSE MARKETPLACE
         ========================================================================= */}
      {activeTab === "browse" && (
        <div className="space-y-6">
          {/* Search, Filter & Sorting Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/80 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#77574A]" />
              <input
                type="text"
                placeholder="Search presentations in PKR..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchItems()}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {["All", "Education", "Business", "Technology", "Healthcare", "Civics", "Creative"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    categoryFilter === cat
                      ? "bg-[#77574A] text-white"
                      : "bg-[#FFFFFF]/60 dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] border border-[#D0AE92]/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs text-[#77574A] dark:text-[#EBD7BE] w-full md:w-auto"
            >
              <option value="highest_rated">Highest Rated</option>
              <option value="sales">Top Sales</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
              Loading marketplace presentations...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
              No presentations found matching your search. Be the first to list one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-white/90 dark:bg-[#3E3731] hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  {/* Card Header & Preview */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#77574A]/10 text-[#77574A] dark:text-[#EBD7BE] border border-[#77574A]/20">
                        {(item as any).category || "Curated"}
                      </span>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          PKR {((item as any).price_pkr || item.price || 1000).toLocaleString()}
                        </span>
                        <div className="text-[9px] text-[#77574A] dark:text-[#EBD7BE]">
                          Direct seller payment
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-[#4A3A34] dark:text-white group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8]/80 line-clamp-2">
                      {(item as any).short_description || `Complete presentation deck with ${item.slides_count || 6} slides.`}
                    </p>

                    <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#EBD7BE] pt-2 border-t border-[#D0AE92]/20">
                      <span>Seller: <strong>{item.seller_name}</strong></span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>{(item.average_rating || 5).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-4 bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingDeck(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D0AE92]/40 hover:border-[#77574A] text-xs font-bold text-[#77574A] dark:text-[#EBD7BE] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <button
                      onClick={() => openReviewModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D0AE92]/40 hover:border-[#77574A] text-xs font-bold text-[#77574A] dark:text-[#EBD7BE] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Review
                    </button>

                    <button
                      onClick={() => handleInitiateBuy(item)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white text-xs font-bold shadow-md transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: SELLER HUB & SALES (Part 10)
         ========================================================================= */}
      {activeTab === "seller_hub" && sellerData && (
        <div className="space-y-6">
          {/* Financials Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-1">
              <span className="text-xs text-[#77574A] dark:text-[#EBD7BE]">Gross Sales (PKR)</span>
              <div className="text-xl font-extrabold text-[#4A3A34] dark:text-white">
                PKR {sellerData.financials?.gross_sales_pkr?.toLocaleString() || 0}
              </div>
              <p className="text-[10px] text-[#77574A]">
                {sellerData.financials?.confirmed_sales_count || 0} confirmed orders
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-1">
              <span className="text-xs text-[#77574A] dark:text-[#EBD7BE]">5% Commission Due</span>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                PKR {sellerData.financials?.platform_commission_pkr?.toLocaleString() || 0}
              </div>
              <p className="text-[10px] text-[#77574A]">5% platform fee obligation</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-1">
              <span className="text-xs text-[#77574A] dark:text-[#EBD7BE]">Net Seller Proceeds</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                PKR {sellerData.financials?.net_seller_earnings_pkr?.toLocaleString() || 0}
              </div>
              <p className="text-[10px] text-[#77574A]">95% net seller earnings</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-1">
              <span className="text-xs text-[#77574A] dark:text-[#EBD7BE]">Outstanding Commission</span>
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                PKR {sellerData.financials?.outstanding_commission_pkr?.toLocaleString() || 0}
              </div>
              <p className="text-[10px] text-[#77574A]">Pending remittance</p>
            </div>
          </div>

          {/* Sales Orders Requiring Seller Confirmation */}
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Incoming Sales Orders ({sellerData.orders?.length || 0})
            </h3>

            {sellerData.orders?.length === 0 ? (
              <p className="text-xs text-[#77574A] py-6 text-center">No orders received yet.</p>
            ) : (
              <div className="space-y-3">
                {sellerData.orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl border border-[#D0AE92]/30 dark:border-[#8C7D70]/30 bg-[#FDFBF7] dark:bg-[#332D28]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          o.sale_status === "SALE_CONFIRMED"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/20 text-amber-700"
                        }`}>
                          {o.sale_status}
                        </span>
                        <span className="font-extrabold text-xs text-[#4A3A34] dark:text-white">
                          PKR {o.sale_price_pkr.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#77574A]">
                          (5% Comm: PKR {o.platform_commission_pkr})
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#4A3A34] dark:text-white">{o.title}</h4>
                      <div className="text-[11px] text-[#77574A]">
                        Buyer: <strong>{o.buyer_name}</strong> &bull; Method: {o.buyer_payment_method}
                        {o.buyer_transaction_ref && <span> &bull; Tx Ref: <code className="font-mono">{o.buyer_transaction_ref}</code></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {o.sale_status === "SALE_PENDING" && (
                        <button
                          onClick={() => handleSellerConfirmSale(o.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                        >
                          Confirm Payment Received
                        </button>
                      )}

                      {o.sale_status === "SALE_CONFIRMED" && o.commission_status !== "COMMISSION_PAID" && (
                        <button
                          onClick={() => {
                            setSelectedCommissionOrder(o);
                            setCommissionTxRef("");
                            setCommissionReceiptFile(null);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
                        >
                          Submit 5% Commission
                        </button>
                      )}

                      {o.commission_status === "COMMISSION_PAID" && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Commission Paid
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Listings List */}
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-primary)]" />
              My Marketplace Listings ({sellerData.listings?.length || 0})
            </h3>

            {sellerData.listings?.length === 0 ? (
              <p className="text-xs text-[#77574A] py-6 text-center">You haven't listed any presentations for sale yet.</p>
            ) : (
              <div className="space-y-3">
                {sellerData.listings.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl border border-[#D0AE92]/30 dark:border-[#8C7D70]/30 bg-[#FDFBF7] dark:bg-[#332D28]/60 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : l.status === "PENDING_REVIEW"
                            ? "bg-amber-500/20 text-amber-700"
                            : "bg-rose-500/10 text-rose-700"
                        }`}>
                          {l.status}
                        </span>
                        <span className="text-xs font-bold text-[#4A3A34] dark:text-white">{l.title}</span>
                      </div>
                      <p className="text-xs text-[#77574A] mt-1">{l.short_description}</p>
                      {l.rejection_reason && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">
                          Rejection Reason: {l.rejection_reason}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-xs text-emerald-600">
                        PKR {l.price_pkr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Receiving Payment Info Settings Form */}
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--color-primary)]" />
              Configure Receiving Payment Account (For Buyers to Pay You)
            </h3>

            <form onSubmit={handleSaveSellerDetails} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Payment Method
                </label>
                <select
                  value={sellerPaymentMethod}
                  onChange={e => setSellerPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                >
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Account Title (Full Name)
                </label>
                <input
                  type="text"
                  value={sellerAccountTitle}
                  onChange={e => setSellerAccountTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Account Number / Mobile Wallet Number / IBAN
                </label>
                <input
                  type="text"
                  value={sellerAccountNumber}
                  onChange={e => setSellerAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-mono"
                  required
                />
              </div>

              {sellerPaymentMethod === "Bank Transfer" && (
                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={sellerBankName}
                    onChange={e => setSellerBankName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Payment Instructions for Buyer
                </label>
                <input
                  type="text"
                  value={sellerInstructions}
                  onChange={e => setSellerInstructions(e.target.value)}
                  placeholder="e.g. Please transfer amount and mention Order title in transfer remark."
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={savingPaymentDetails}
                className="px-5 py-2 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white font-bold shadow-md"
              >
                {savingPaymentDetails ? "Saving..." : "Save Receiving Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MY PURCHASES (Part 11)
         ========================================================================= */}
      {activeTab === "purchases" && buyerData && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
            Purchased Presentations Library ({buyerData.orders?.length || 0})
          </h2>

          {buyerData.orders?.length === 0 ? (
            <p className="text-xs text-[#77574A] py-12 text-center">
              You haven't purchased any presentations yet. Explore the marketplace to find high-impact presentations!
            </p>
          ) : (
            <div className="space-y-4">
              {buyerData.orders.map((o: any) => (
                <div
                  key={o.id}
                  className="p-5 rounded-2xl border border-[#D0AE92]/30 dark:border-[#8C7D70]/30 bg-[#FDFBF7] dark:bg-[#332D28]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.sale_status === "SALE_CONFIRMED"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      }`}>
                        {o.sale_status}
                      </span>
                      <span className="font-extrabold text-xs text-emerald-600">
                        PKR {o.sale_price_pkr.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#4A3A34] dark:text-white">
                      {o.title}
                    </h4>

                    <div className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                      Seller: <strong>{o.seller_name}</strong> ({o.seller_email})
                    </div>

                    {/* If sale pending, show seller's payment details */}
                    {o.sale_status === "SALE_PENDING" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-[#4A3A34] dark:text-[#EBD7BE] space-y-1">
                        <div className="font-bold text-amber-700 dark:text-amber-400">
                          Transfer PKR {o.sale_price_pkr} to Seller:
                        </div>
                        <div>Method: <strong>{o.seller_payment_info?.payment_method || "Direct Transfer"}</strong></div>
                        <div>Account Title: <strong>{o.seller_payment_info?.account_title || o.seller_name}</strong></div>
                        <div>Account / Number: <strong className="font-mono">{o.seller_payment_info?.account_number || "Contact Seller"}</strong></div>
                        {o.seller_payment_info?.instructions && (
                          <div className="text-[11px] italic">Note: {o.seller_payment_info.instructions}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {o.sale_status === "SALE_CONFIRMED" ? (
                      <a
                        href={`/api/marketplace/orders/${o.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download PPTX
                      </a>
                    ) : (
                      <button
                        onClick={async () => {
                          const ref = window.prompt("Enter your transaction reference / payment receipt ID:");
                          if (!ref) return;
                          await communityApi.confirmBuyerPayment(o.id, {
                            payment_method: o.seller_payment_info?.payment_method || "Easypaisa",
                            transaction_ref: ref.trim()
                          });
                          fetchBuyerHub();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#77574A] text-white text-xs font-bold"
                      >
                        Update Payment Ref
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        const reason = window.prompt("Enter reason for dispute (e.g. payment sent but seller did not confirm):");
                        if (!reason) return;
                        await communityApi.disputeOrder(o.id, reason);
                        fetchBuyerHub();
                      }}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 text-xs font-bold hover:bg-rose-500/10"
                    >
                      Dispute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: SELL PRESENTATION (Part 8)
         ========================================================================= */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-4">
              <h3 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[var(--color-primary)]" />
                List Presentation for Sale in Marketplace
              </h3>
              <button onClick={() => setShowSellModal(false)} className="p-1 rounded-lg text-[#77574A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector: AI Deck vs Upload External PPTX */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSellMode("ai_deck")}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                  sellMode === "ai_deck"
                    ? "bg-[#77574A] text-white border-transparent shadow-md"
                    : "border-[#D0AE92]/40 text-[#77574A] dark:text-[#EBD7BE]"
                }`}
              >
                Sell AI Presentation
              </button>
              <button
                type="button"
                onClick={() => setSellMode("upload_pptx")}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                  sellMode === "upload_pptx"
                    ? "bg-[#77574A] text-white border-transparent shadow-md"
                    : "border-[#D0AE92]/40 text-[#77574A] dark:text-[#EBD7BE]"
                }`}
              >
                Upload External PPT / PPTX
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4 text-xs">
              {sellMode === "ai_deck" ? (
                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Select Presentation from Your Library
                  </label>
                  <select
                    value={selectedDeckToSell}
                    onChange={e => {
                      setSelectedDeckToSell(e.target.value);
                      const sel = userDecks.find(d => d.id.toString() === e.target.value);
                      if (sel) {
                        setListingTitle(sel.title);
                        setListingShortDesc(`Professional presentation on ${sel.title}`);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  >
                    {userDecks.map(d => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.title} ({d.slides?.length || d.slide_count} slides)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Upload Presentation File (PPTX or PPT, max 50MB)
                  </label>
                  <input
                    type="file"
                    accept=".pptx,.ppt"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setUploadedFile(f);
                        if (!listingTitle) setListingTitle(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                    required
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Presentation Title
                </label>
                <input
                  type="text"
                  value={listingTitle}
                  onChange={e => setListingTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={listingShortDesc}
                  onChange={e => setListingShortDesc(e.target.value)}
                  placeholder="Key highlight or summary of topics covered"
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Detailed Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={listingDetailedDesc}
                  onChange={e => setListingDetailedDesc(e.target.value)}
                  placeholder="Detailed breakdown of slides, key takeaways, and audience"
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Category
                  </label>
                  <select
                    value={listingCategory}
                    onChange={e => setListingCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  >
                    <option value="Education">Education</option>
                    <option value="Business">Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Civics">Civics</option>
                    <option value="Creative">Creative</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Selling Price in PKR
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={listingPricePkr}
                    onChange={e => setListingPricePkr(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-bold text-emerald-600"
                    required
                  />
                  <span className="text-[10px] text-[#77574A] mt-0.5 block">
                    You keep 95% (PKR {Math.round(Number(listingPricePkr) * 0.95)}), platform commission 5% (PKR {Math.round(Number(listingPricePkr) * 0.05)})
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={listingTags}
                  onChange={e => setListingTags(e.target.value)}
                  placeholder="e.g. AI, Healthcare, Slides, Medical"
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                />
              </div>

              {/* Ownership Confirmation Checkbox (Part 8 requirement) */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-ownership"
                  checked={ownershipConfirmed}
                  onChange={e => setOwnershipConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-[#77574A]"
                  required
                />
                <label htmlFor="confirm-ownership" className="text-xs text-[#4A3A34] dark:text-[#EBD7BE]">
                  <strong>Ownership Confirmation:</strong> I confirm that I created or legally own this presentation and its contents, and agree to the 5% platform commission terms.
                </label>
              </div>

              <div className="text-[11px] text-[#77574A] dark:text-[#EBD7BE] italic">
                * Note: Every new listing enters <strong>PENDING_REVIEW</strong>. Administrators review and verify copyright before activating the listing in the public marketplace.
              </div>

              <button
                type="submit"
                disabled={isSubmittingListing || !ownershipConfirmed}
                className="w-full py-3 rounded-2xl bg-[#77574A] hover:bg-[#604439] disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-colors"
              >
                {isSubmittingListing ? "Submitting for Review..." : "Submit Listing for PENDING_REVIEW"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: BUY PRESENTATION (Part 9)
         ========================================================================= */}
      {selectedBuyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-4">
              <h3 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                Purchase Presentation (Direct Seller Payment)
              </h3>
              <button onClick={() => setSelectedBuyItem(null)} className="p-1 rounded-lg text-[#77574A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F9F2E4]/40 dark:bg-[#3E3731] border border-[#D0AE92]/30 space-y-1">
              <div className="text-xs text-[#77574A]">Presentation</div>
              <h4 className="font-bold text-sm text-[#4A3A34] dark:text-white">{selectedBuyItem.title}</h4>
              <div className="text-base font-extrabold text-emerald-600">
                PKR {((selectedBuyItem as any).price_pkr || selectedBuyItem.price || 1000).toLocaleString()}
              </div>
            </div>

            {!activeOrderCreated ? (
              <form onSubmit={handleConfirmOrder} className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[#4A3A34] dark:text-[#EBD7BE] space-y-2">
                  <div className="font-bold text-amber-700 dark:text-amber-400">
                    How it works:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>You transfer the exact amount directly to the seller.</li>
                    <li>Enter your payment reference below and submit.</li>
                    <li>Seller verifies receipt in their account and confirms the order.</li>
                    <li>Download is instantly unlocked in your library!</li>
                  </ol>
                </div>

                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Your Payment Method
                  </label>
                  <select
                    value={buyerPaymentMethod}
                    onChange={e => setBuyerPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                  >
                    <option value="Easypaisa">Easypaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Bank Transfer">Bank Transfer / Raast</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                    Transaction ID / Reference (Optional at initiation)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRX123456789"
                    value={buyerTxRef}
                    onChange={e => setBuyerTxRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessingBuy}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
                >
                  {isProcessingBuy ? "Initiating Order..." : `Confirm Purchase (PKR ${((selectedBuyItem as any).price_pkr || selectedBuyItem.price || 1000).toLocaleString()})`}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 space-y-1">
                  <div className="font-bold text-sm">Purchase Request Created!</div>
                  <p>Order ID: {activeOrderCreated.order_id}</p>
                </div>

                <div className="p-4 rounded-2xl border border-[#D0AE92]/40 bg-[#FDFBF7] dark:bg-[#3E3731] space-y-2">
                  <div className="font-bold text-sm text-[#4A3A34] dark:text-white">Seller Payment Details:</div>
                  <div>Account Title: <strong>{activeOrderCreated.seller?.payment_info?.account_title || activeOrderCreated.seller?.name}</strong></div>
                  <div>Payment Method: <strong>{activeOrderCreated.seller?.payment_info?.payment_method || "Easypaisa / Bank"}</strong></div>
                  <div>Account Number: <strong className="font-mono text-emerald-600">{activeOrderCreated.seller?.payment_info?.account_number || "Contact Seller"}</strong></div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBuyItem(null);
                    setActiveTab("purchases");
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#77574A] text-white font-bold"
                >
                  Go to My Purchases
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SUBMIT 5% COMMISSION (Part 9)
         ========================================================================= */}
      {selectedCommissionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-4">
              <h3 className="text-base font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Submit 5% Platform Commission
              </h3>
              <button onClick={() => setSelectedCommissionOrder(null)} className="p-1 rounded-lg text-[#77574A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <div className="text-[#77574A]">Order: {selectedCommissionOrder.title}</div>
              <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400">
                Commission Payable: PKR {selectedCommissionOrder.platform_commission_pkr} (5%)
              </div>
              <p className="text-[11px] text-[#77574A]">
                Platform Payment Number: <strong className="font-mono">+92 300 0000000</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitCommission} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Commission Transfer Reference / Tx ID
                </label>
                <input
                  type="text"
                  value={commissionTxRef}
                  onChange={e => setCommissionTxRef(e.target.value)}
                  placeholder="e.g. TRX99887766"
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Payment Receipt Screenshot (PNG, JPG, PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setCommissionReceiptFile(e.target.files[0]);
                    }
                  }}
                  className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCommission}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                {isSubmittingCommission ? "Submitting Evidence..." : "Submit Commission for Verification"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SLIDE VIEWER MODAL
         ========================================================================= */}
      {viewingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 p-6 md:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#4A3A34] dark:text-white">{viewingDeck.title}</h3>
                <span className="text-xs text-[#77574A]">Slide {activeSlideIndex + 1} of {viewingDeck.slides?.length || viewingDeck.slides_count || 1}</span>
              </div>
              <button onClick={() => setViewingDeck(null)} className="p-1 rounded-lg text-[#77574A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slide Viewer Canvas */}
            <div className="aspect-video w-full rounded-2xl bg-[#FDFBF7] dark:bg-[#2A2420] border border-[#D0AE92]/40 p-8 flex flex-col justify-between">
              {viewingDeck.slides && viewingDeck.slides[activeSlideIndex] ? (
                <div>
                  <h2 className="text-xl font-extrabold text-[#4A3A34] dark:text-white mb-4">
                    {viewingDeck.slides[activeSlideIndex].title}
                  </h2>
                  <ul className="space-y-2 text-sm text-[#6B4E3D] dark:text-[#EBD7BE]">
                    {(viewingDeck.slides[activeSlideIndex].content?.bullet_points || []).map((b: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[var(--color-primary)] font-bold">&bull;</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-[#77574A]">
                  Slide preview details available upon purchase.
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#D0AE92]/20 text-xs">
                <button
                  disabled={activeSlideIndex <= 0}
                  onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1 rounded-lg border border-[#D0AE92]/40 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  disabled={!viewingDeck.slides || activeSlideIndex >= viewingDeck.slides.length - 1}
                  onClick={() => setActiveSlideIndex(prev => prev + 1)}
                  className="px-3 py-1 rounded-lg border border-[#D0AE92]/40 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RATING & REVIEW MODAL
         ========================================================================= */}
      {reviewDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#332D28] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 p-6 md:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-3">
              <h3 className="text-base font-bold text-[#4A3A34] dark:text-white">
                Rate & Review: {reviewDeck.title}
              </h3>
              <button onClick={() => setReviewDeck(null)} className="p-1 rounded-lg text-[#77574A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Your Rating</label>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRatingScore(star)}
                      onMouseEnter={() => setHoverRatingScore(star)}
                      onMouseLeave={() => setHoverRatingScore(0)}
                      className="p-1"
                    >
                      <Star className={`w-6 h-6 ${
                        (hoverRatingScore || userRatingScore) >= star ? "fill-amber-500" : ""
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Your Comment</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share feedback on slide structure, quality and relevance..."
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full py-2.5 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white font-bold"
              >
                {isSubmittingReview ? "Submitting..." : "Submit Rating & Review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
