import { apiFetch } from "./api";
import type {
  DiscoverResponse,
  PublicPresentationItem,
  RatingResult,
  UserRatingStatus,
  ReviewItem,
  MarketplaceResponse,
  PurchaseResult,
  TransactionSummary
} from "../types/community";
import type { PresentationDetail } from "../types/presentation";

export const communityApi = {
  // 1. Fetch public presentations for discovery with real ranking
  async getDiscover(params: {
    sort?: "trending" | "top_rated" | "popular" | "most_used" | "latest";
    language?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DiscoverResponse> {
    const query = new URLSearchParams();
    if (params.sort) query.append("sort", params.sort);
    if (params.language) query.append("language", params.language);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    return apiFetch<DiscoverResponse>(`/public/discover?${query.toString()}`);
  },

  // 2. Fetch single public presentation details (increments views count in MongoDB)
  async getPublicPresentation(id: string | number): Promise<PublicPresentationItem & PresentationDetail> {
    return apiFetch<PublicPresentationItem & PresentationDetail>(`/public/presentation/${id}`);
  },

  // 3. Submit or update star rating (1-5)
  async ratePresentation(presentationId: string | number, score: number): Promise<RatingResult> {
    return apiFetch<RatingResult>("/ratings", {
      method: "POST",
      body: JSON.stringify({ presentation_id: presentationId, score })
    });
  },

  // 4. Get current user's rating for a deck
  async getMyRating(presentationId: string | number): Promise<UserRatingStatus> {
    return apiFetch<UserRatingStatus>(`/ratings/${presentationId}/my-rating`);
  },

  // 5. Submit review
  async submitReview(presentationId: string | number, rating: number, comment: string): Promise<ReviewItem> {
    return apiFetch<ReviewItem>("/reviews", {
      method: "POST",
      body: JSON.stringify({ presentation_id: presentationId, rating, comment })
    });
  },

  // 6. Get presentation reviews
  async getReviews(presentationId: string | number): Promise<ReviewItem[]> {
    return apiFetch<ReviewItem[]>(`/reviews/${presentationId}`);
  },

  // 7. Use as Template (creates editable copy in user library, original stays untouched)
  async useAsTemplate(id: string | number): Promise<{ message: string; presentation: PresentationDetail }> {
    return apiFetch<{ message: string; presentation: PresentationDetail }>(`/templates/${id}/use`, {
      method: "POST"
    });
  },

  // 8. Update presentation sharing visibility (private / public)
  async setVisibility(id: string | number, visibility: "private" | "public"): Promise<{ message: string; id: string; visibility: string }> {
    return apiFetch<{ message: string; id: string; visibility: string }>(`/presentations/${id}/visibility`, {
      method: "PUT",
      body: JSON.stringify({ visibility })
    });
  },

  // 9. Publish to Marketplace
  async publishToMarketplace(presentationId: string | number, price: number): Promise<{ message: string; presentation: any }> {
    return apiFetch<{ message: string; presentation: any }>("/marketplace/publish", {
      method: "POST",
      body: JSON.stringify({ presentation_id: presentationId, price })
    });
  },

  // 10. Fetch Marketplace items
  async getMarketplaceItems(params: { search?: string; page?: number; limit?: number; sort?: string }): Promise<MarketplaceResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.sort) query.append("sort", params.sort);
    return apiFetch<MarketplaceResponse>(`/marketplace/items?${query.toString()}`);
  },

  // 11. Buy template from Marketplace
  async buyMarketplaceItem(id: string | number): Promise<PurchaseResult> {
    return apiFetch<PurchaseResult>(`/marketplace/buy/${id}`, {
      method: "POST"
    });
  },

  // 12. Fetch user transaction summary
  async getMyTransactions(): Promise<TransactionSummary> {
    return apiFetch<TransactionSummary>("/marketplace/my-transactions");
  },

  // 13. Upgrade SaaS plan & AI credits
  async upgradePlan(plan: "free" | "student" | "pro" | "team"): Promise<{ message: string; user: any }> {
    return apiFetch<{ message: string; user: any }>("/auth/upgrade-plan", {
      method: "POST",
      body: JSON.stringify({ plan })
    });
  },

  // 14. Get AI credits
  async getCredits(): Promise<{ plan: string; total_granted: number; used: number; remaining: number }> {
    return apiFetch<{ plan: string; total_granted: number; used: number; remaining: number }>("/auth/credits");
  },

  // 15. Create Marketplace Listing (AI deck or uploaded external file)
  async createListing(data: {
    presentation_id?: string;
    title: string;
    short_description: string;
    detailed_description?: string;
    category: string;
    tags?: string[];
    price_pkr: number;
    file_path?: string;
    file_name?: string;
    file_size_bytes?: number;
    file_type?: string;
    ownership_confirmed: boolean;
  }): Promise<{ message: string; listing: any }> {
    return apiFetch<{ message: string; listing: any }>("/marketplace/create-listing", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // 16. Upload External Presentation File (PPT/PPTX)
  async uploadPresentationFile(file: File): Promise<{ file_path: string; file_name: string; file_size_bytes: number; file_type: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch("/marketplace/upload-presentation", {
      method: "POST",
      body: formData
    });
  },

  // 17. Upload Commission Receipt Screenshot
  async uploadReceipt(file: File): Promise<{ receipt_url: string; filename: string }> {
    const formData = new FormData();
    formData.append("receipt", file);
    return apiFetch("/marketplace/upload-receipt", {
      method: "POST",
      body: formData
    });
  },

  // 18. Seller Dashboard
  async getSellerDashboard(): Promise<any> {
    return apiFetch("/marketplace/seller-dashboard");
  },

  // 19. Update Seller Payout / Receiving Details
  async updateSellerPaymentDetails(data: {
    payment_method: string;
    account_title: string;
    account_number: string;
    bank_name?: string;
    instructions?: string;
  }): Promise<any> {
    return apiFetch("/marketplace/seller-payment-details", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // 20. Buyer Dashboard
  async getBuyerDashboard(): Promise<any> {
    return apiFetch("/marketplace/buyer-dashboard");
  },

  // 21. Buyer Confirms Direct Payment to Seller
  async confirmBuyerPayment(orderId: string, data: { payment_method: string; transaction_ref?: string; notes?: string }): Promise<any> {
    return apiFetch(`/marketplace/orders/${orderId}/buyer-confirm`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // 22. Seller Confirms Receipt of Payment
  async confirmSellerSale(orderId: string): Promise<any> {
    return apiFetch(`/marketplace/orders/${orderId}/seller-confirm`, {
      method: "POST"
    });
  },

  // 23. Seller Submits 5% Platform Commission
  async submitCommission(orderId: string, data: { transaction_ref?: string; receipt_url?: string }): Promise<any> {
    return apiFetch(`/marketplace/orders/${orderId}/submit-commission`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // 24. Raise Dispute on Order
  async disputeOrder(orderId: string, reason: string): Promise<any> {
    return apiFetch(`/marketplace/orders/${orderId}/dispute`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  // 25. Platform Payment Details for 5% Commission
  async getPlatformPaymentInfo(): Promise<any> {
    return apiFetch("/marketplace/platform-payment-info");
  },

  // 26. Subscription Plans & NayaPay Info
  async getSubscriptionPlans(): Promise<any> {
    return apiFetch("/subscriptions/plans");
  },

  async requestSubscriptionPurchase(plan: string): Promise<any> {
    return apiFetch("/subscriptions/purchase-request", {
      method: "POST",
      body: JSON.stringify({ plan })
    });
  },

  async submitSubscriptionPayment(data: {
    payment_id?: string;
    plan: string;
    transaction_ref: string;
    receipt_url?: string;
    payer_name?: string;
    payer_account?: string;
  }): Promise<any> {
    return apiFetch("/subscriptions/submit-payment", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async upgradeFreePlan(): Promise<any> {
    return apiFetch("/subscriptions/upgrade-free", {
      method: "POST"
    });
  },

  async getMySubscriptionPayments(): Promise<any> {
    return apiFetch("/subscriptions/my-payments");
  },

  // 27. Freemium Template Library
  async getFreemiumTemplates(params?: {
    category?: string;
    access_type?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.access_type) query.append("access_type", params.access_type);
    if (params?.search) query.append("search", params.search);
    if (params?.sort) query.append("sort", params.sort);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    return apiFetch(`/templates?${query.toString()}`);
  },

  async getTemplateCategories(): Promise<any> {
    return apiFetch("/templates/categories");
  },

  async getTemplateDetail(id: string): Promise<any> {
    return apiFetch(`/templates/${id}`);
  },

  async useFreemiumTemplate(id: string): Promise<any> {
    return apiFetch(`/templates/${id}/use`, {
      method: "POST"
    });
  },

  async requestTemplatePurchase(id: string): Promise<any> {
    return apiFetch(`/templates/${id}/purchase-request`, {
      method: "POST"
    });
  },

  async submitTemplatePayment(id: string, data: {
    purchase_id?: string;
    transaction_ref: string;
    receipt_url?: string;
    payer_name?: string;
    payer_account?: string;
  }): Promise<any> {
    return apiFetch(`/templates/${id}/submit-payment`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async reviewTemplate(id: string, rating: number, comment: string): Promise<any> {
    return apiFetch(`/templates/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, comment })
    });
  }
};
