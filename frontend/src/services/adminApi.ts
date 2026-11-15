import { apiFetch } from "./api";

export interface DashboardStats {
  users: {
    total: number;
    today: number;
    weekly: number;
    monthly: number;
    active: number;
    suspended: number;
    sellers: number;
    buyers: number;
    admins: number;
  };
  presentations: {
    total: number;
    ai_generated: number;
    document_uploads: number;
    public: number;
    saved: number;
    drafts: number;
    successful_generations: number;
    failed_generations: number;
  };
  marketplace: {
    total_listings: number;
    pending_review: number;
    approved: number;
    rejected: number;
    suspended: number;
    total_orders: number;
    confirmed_sales: number;
    disputed: number;
  };
  finance: {
    total_completed_sales_pkr: number;
    commission_due_pkr: number;
    commission_submitted_pkr: number;
    commission_received_pkr: number;
    outstanding_commission_pkr: number;
    commission_rejected_pkr: number;
    commission_rate_percent: number;
  };
  ai: {
    total_requests: number;
    completed: number;
    failed: number;
    success_rate: number;
  };
  templates?: {
    total: number;
    free: number;
    plan_included: number;
    premium: number;
    total_purchases: number;
  };
  subscriptions?: {
    total_payments: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_admin?: boolean;
  is_active: boolean;
  presentations_count: number;
  listings_count: number;
  confirmed_sales_count: number;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    amount_paid?: number;
  };
  ai_credits?: {
    remaining: number;
  };
}

export interface AdminListing {
  id: string;
  title: string;
  short_description: string;
  category: string;
  price_pkr: number;
  seller_name: string;
  seller_email: string;
  seller_payment_info?: any;
  file_type: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ACTIVE";
  rejection_reason?: string;
  created_at: string;
}

export interface AdminCommissionOrder {
  id: string;
  title: string;
  seller_name: string;
  seller_email: string;
  buyer_name: string;
  buyer_email: string;
  sale_price_pkr: number;
  platform_commission_pkr: number;
  seller_net_pkr: number;
  sale_status: string;
  commission_status: string;
  commission_payment_ref?: string;
  commission_receipt_url?: string;
  commission_submitted_at?: string;
  commission_rejection_reason?: string;
  created_at: string;
}

export interface PlatformPaymentSettings {
  payment_provider: string;
  account_title: string;
  platform_payment_number: string;
  bank_details: string;
  payment_instructions: string;
  support_contact: string;
  commission_percentage: number;
}

export interface AdminSubscriptionPayment {
  id: string;
  user_id: any;
  user_name: string;
  user_email: string;
  plan: string;
  gross_amount: number;
  amount_pkr: number;
  currency: string;
  payment_method: string;
  transaction_ref: string;
  receipt_url?: string;
  payer_name?: string;
  payer_account?: string;
  payment_status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "APPROVED" | "REJECTED";
  rejection_reason?: string;
  created_at: string;
}

export interface AdminTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  access_type: "FREE" | "PLAN_INCLUDED" | "PREMIUM";
  price_pkr: number;
  price_usd: number;
  slide_count: number;
  usage_count: number;
  purchase_count: number;
  average_rating: number;
  ratings_count: number;
  is_published: boolean;
  is_featured: boolean;
  tags?: string[];
  slides?: any[];
  created_at: string;
}

export interface AdminTemplatePurchase {
  id: string;
  user_id: any;
  user_name: string;
  user_email: string;
  template_id: any;
  template_title: string;
  price_pkr: number;
  payment_provider: string;
  transaction_ref: string;
  receipt_url?: string;
  payer_name?: string;
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "APPROVED" | "REJECTED";
  rejection_reason?: string;
  created_at: string;
}

export const adminApi = {
  // 1. Dashboard Statistics
  async getDashboardStats(): Promise<DashboardStats> {
    return apiFetch<DashboardStats>("/admin/dashboard-stats");
  },

  // 2. Users Management
  async getUsers(params: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.role) query.append("role", params.role);
    if (params.status) query.append("status", params.status);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    return apiFetch<{ users: AdminUser[]; total: number; page: number; pages: number }>(`/admin/users?${query.toString()}`);
  },

  async updateUserStatus(id: string, is_active: boolean, reason?: string) {
    return apiFetch<{ message: string; user: any }>(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active, reason })
    });
  },

  async updateUserRole(id: string, role: string, reason?: string) {
    return apiFetch<{ message: string; user: any }>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role, reason })
    });
  },

  // 3. Presentations
  async getPresentations(params: { search?: string; source_type?: string; visibility?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.source_type) query.append("source_type", params.source_type);
    if (params.visibility) query.append("visibility", params.visibility);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    return apiFetch<{ presentations: any[]; total: number; page: number; pages: number }>(`/admin/presentations?${query.toString()}`);
  },

  async deletePresentation(id: string, reason?: string) {
    return apiFetch<{ message: string }>(`/admin/presentations/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason })
    });
  },

  // 4. Marketplace Listings Approvals
  async getMarketplaceListings(params: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    return apiFetch<{ listings: AdminListing[]; total: number; page: number; pages: number }>(`/admin/marketplace/listings?${query.toString()}`);
  },

  async approveListing(id: string) {
    return apiFetch<{ message: string; listing: any }>(`/admin/marketplace/listings/${id}/approve`, {
      method: "POST"
    });
  },

  async rejectListing(id: string, reason: string) {
    return apiFetch<{ message: string; listing: any }>(`/admin/marketplace/listings/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  // 5. 5% Commission Reviews
  async getCommissions(params: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    return apiFetch<{ commissions: AdminCommissionOrder[]; total: number; page: number; pages: number }>(`/admin/marketplace/commissions?${query.toString()}`);
  },

  async verifyCommission(orderId: string) {
    return apiFetch<{ message: string; order: any }>(`/admin/marketplace/commissions/${orderId}/verify`, {
      method: "POST"
    });
  },

  async rejectCommission(orderId: string, reason: string) {
    return apiFetch<{ message: string; order: any }>(`/admin/marketplace/commissions/${orderId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  // 6. Disputes
  async getDisputes() {
    return apiFetch<{ disputes: any[] }>("/admin/marketplace/disputes");
  },

  async resolveDispute(orderId: string, resolution: "confirm_sale" | "cancel_sale", notes?: string, authorize_download?: boolean) {
    return apiFetch<{ message: string; order: any }>(`/admin/marketplace/disputes/${orderId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution, notes, authorize_download })
    });
  },

  // 7. Platform Settings
  async getPlatformSettings(): Promise<PlatformPaymentSettings> {
    return apiFetch<PlatformPaymentSettings>("/admin/platform-settings");
  },

  async updatePlatformSettings(data: Partial<PlatformPaymentSettings>) {
    return apiFetch<{ message: string; settings: PlatformPaymentSettings }>("/admin/platform-settings", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // 8. Subscriptions
  async getSubscriptions() {
    return apiFetch<{ summary: any; subscriptions: any[] }>("/admin/subscriptions");
  },

  // 9. System Health
  async getSystemHealth() {
    return apiFetch<any>("/admin/system-health");
  },

  // 10. Audit Logs
  async getAuditLogs() {
    return apiFetch<{ audit_logs: any[] }>("/admin/audit-logs");
  },

  // 11. Manual Subscription Payments
  async getSubscriptionPayments(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    return apiFetch<{ payments: AdminSubscriptionPayment[]; total: number; page: number; totalPages: number }>(`/admin/subscription-payments?${query.toString()}`);
  },

  async verifySubscriptionPayment(id: string) {
    return apiFetch<{ message: string; payment: AdminSubscriptionPayment }>(`/admin/subscription-payments/${id}/verify`, {
      method: "POST"
    });
  },

  async rejectSubscriptionPayment(id: string, reason: string) {
    return apiFetch<{ message: string; payment: AdminSubscriptionPayment }>(`/admin/subscription-payments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  // 12. Freemium Templates
  async getTemplates(params?: { category?: string; access_type?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.access_type) query.append("access_type", params.access_type);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    return apiFetch<{ templates: AdminTemplate[]; total: number; page: number; totalPages: number }>(`/admin/templates?${query.toString()}`);
  },

  async createTemplate(data: Partial<AdminTemplate>) {
    return apiFetch<{ message: string; template: AdminTemplate }>("/admin/templates", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateTemplate(id: string, data: Partial<AdminTemplate>) {
    return apiFetch<{ message: string; template: AdminTemplate }>(`/admin/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteTemplate(id: string) {
    return apiFetch<{ message: string }>(`/admin/templates/${id}`, {
      method: "DELETE"
    });
  },

  // 13. Template Purchases
  async getTemplatePurchases(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    return apiFetch<{ purchases: AdminTemplatePurchase[]; total: number; page: number; totalPages: number }>(`/admin/template-purchases?${query.toString()}`);
  },

  async verifyTemplatePurchase(id: string) {
    return apiFetch<{ message: string; purchase: AdminTemplatePurchase }>(`/admin/template-purchases/${id}/verify`, {
      method: "POST"
    });
  },

  async rejectTemplatePurchase(id: string, reason: string) {
    return apiFetch<{ message: string; purchase: AdminTemplatePurchase }>(`/admin/template-purchases/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  // 14. Real Trends
  async getTrends() {
    return apiFetch<any>("/admin/analytics/trends");
  }
};

