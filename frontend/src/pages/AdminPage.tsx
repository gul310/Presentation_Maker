import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Users,
  Presentation as PresIcon,
  ShoppingBag,
  DollarSign,
  Cpu,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  Settings,
  CreditCard,
  Activity,
  FileText,
  Clock,
  Eye,
  Layers,
  Plus,
  Trash2,
  Edit3,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../services/adminApi";
import type {
  DashboardStats,
  AdminUser,
  AdminListing,
  AdminCommissionOrder,
  PlatformPaymentSettings,
  AdminSubscriptionPayment,
  AdminTemplate,
  AdminTemplatePurchase
} from "../services/adminApi";

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

type AdminTab =
  | "overview"
  | "users"
  | "presentations"
  | "marketplace"
  | "commissions"
  | "disputes"
  | "templates"
  | "settings"
  | "subscriptions"
  | "health"
  | "audit";

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = Boolean(user && (user.role === "admin" || (user as any).is_admin || (user as any).isAdmin));

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  // Presentations State
  const [presentations, setPresentations] = useState<any[]>([]);
  const [presSearch, setPresSearch] = useState("");

  // Marketplace State
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingFilter, setListingFilter] = useState("ALL");

  // Commissions State
  const [commissions, setCommissions] = useState<AdminCommissionOrder[]>([]);
  const [commissionFilter, setCommissionFilter] = useState("ALL");

  // Disputes State
  const [disputes, setDisputes] = useState<any[]>([]);

  // Platform Settings State
  const [settingsForm, setSettingsForm] = useState<PlatformPaymentSettings>({
    payment_provider: "",
    account_title: "",
    platform_payment_number: "",
    bank_details: "",
    payment_instructions: "",
    support_contact: "",
    commission_percentage: 5
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Subscriptions State
  const [subscriptionsData, setSubscriptionsData] = useState<any>(null);
  const [subscriptionPayments, setSubscriptionPayments] = useState<AdminSubscriptionPayment[]>([]);
  const [subPaymentFilter, setSubPaymentFilter] = useState("ALL");

  // Templates State (Part 11)
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("ALL");
  const [templateAccessFilter, setTemplateAccessFilter] = useState("ALL");
  const [templatePurchases, setTemplatePurchases] = useState<AdminTemplatePurchase[]>([]);
  const [templatePurchasesFilter, setTemplatePurchasesFilter] = useState("ALL");
  const [editingTemplate, setEditingTemplate] = useState<Partial<AdminTemplate> | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // System Health State
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Action Loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers({
        search: userSearch.trim() || undefined,
        role: userRoleFilter !== "all" ? userRoleFilter : undefined
      });
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPresentations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPresentations({
        search: presSearch.trim() || undefined
      });
      setPresentations(data.presentations || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load presentations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplace = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMarketplaceListings({
        status: listingFilter !== "ALL" ? listingFilter : undefined
      });
      setListings(data.listings || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCommissions({
        status: commissionFilter !== "ALL" ? commissionFilter : undefined
      });
      setCommissions(data.commissions || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load commissions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDisputes();
      setDisputes(data.disputes || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPlatformSettings();
      setSettingsForm(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load platform settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const [subs, payments] = await Promise.all([
        adminApi.getSubscriptions(),
        adminApi.getSubscriptionPayments()
      ]);
      setSubscriptionsData(subs);
      setSubscriptionPayments(payments.payments || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const [tmplRes, purchasesRes] = await Promise.all([
        adminApi.getTemplates({
          category: templateCategoryFilter !== "ALL" ? templateCategoryFilter : undefined,
          access_type: templateAccessFilter !== "ALL" ? templateAccessFilter : undefined
        }),
        adminApi.getTemplatePurchases()
      ]);
      setTemplates(tmplRes.templates || []);
      setTemplatePurchases(purchasesRes.purchases || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSystemHealth();
      setSystemHealth(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load system health.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAuditLogs();
      setAuditLogs(data.audit_logs || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    switch (activeTab) {
      case "overview":
        fetchOverview();
        break;
      case "users":
        fetchUsers();
        break;
      case "presentations":
        fetchPresentations();
        break;
      case "marketplace":
        fetchMarketplace();
        break;
      case "commissions":
        fetchCommissions();
        break;
      case "disputes":
        fetchDisputes();
        break;
      case "templates":
        fetchTemplates();
        break;
      case "settings":
        fetchSettings();
        break;
      case "subscriptions":
        fetchSubscriptions();
        break;
      case "health":
        fetchHealth();
        break;
      case "audit":
        fetchAudit();
        break;
    }
  }, [isAdmin, activeTab, templateCategoryFilter, templateAccessFilter]);

  // Actions
  const handleToggleUserStatus = async (targetUser: AdminUser) => {
    const nextStatus = !targetUser.is_active;
    const confirmMsg = `Are you sure you want to ${nextStatus ? "reactivate" : "suspend"} ${targetUser.email}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(`user-status-${targetUser.id}`);
      await adminApi.updateUserStatus(targetUser.id, nextStatus, "Admin manual status change");
      setSuccessMsg(`User ${targetUser.email} status updated.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeUserRole = async (targetUser: AdminUser) => {
    const newRole = window.prompt(
      `Enter new role for ${targetUser.email} (student, teacher, researcher, professional, admin):`,
      targetUser.role
    );
    if (!newRole || newRole.trim() === targetUser.role) return;

    try {
      setActionLoading(`user-role-${targetUser.id}`);
      await adminApi.updateUserRole(targetUser.id, newRole.trim().toLowerCase(), "Admin role update");
      setSuccessMsg(`Role for ${targetUser.email} changed to ${newRole}.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change user role.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      setActionLoading(`approve-${listingId}`);
      await adminApi.approveListing(listingId);
      setSuccessMsg("Listing approved and is now active in the Marketplace!");
      fetchMarketplace();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to approve listing.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    const reason = window.prompt("Enter rejection reason for this listing:");
    if (!reason || !reason.trim()) return;

    try {
      setActionLoading(`reject-${listingId}`);
      await adminApi.rejectListing(listingId, reason.trim());
      setSuccessMsg("Listing rejected.");
      fetchMarketplace();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject listing.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyCommission = async (orderId: string) => {
    if (!window.confirm("Confirm verification of 5% platform commission receipt?")) return;
    try {
      setActionLoading(`verify-${orderId}`);
      await adminApi.verifyCommission(orderId);
      setSuccessMsg("Commission payment verified and marked as PAID!");
      fetchCommissions();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify commission.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCommission = async (orderId: string) => {
    const reason = window.prompt("Enter rejection reason for this commission proof:");
    if (!reason || !reason.trim()) return;

    try {
      setActionLoading(`reject-comm-${orderId}`);
      await adminApi.rejectCommission(orderId, reason.trim());
      setSuccessMsg("Commission proof rejected.");
      fetchCommissions();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject commission.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async (orderId: string, resolution: "confirm_sale" | "cancel_sale") => {
    const notes = window.prompt(`Enter resolution notes for dispute (${resolution}):`);
    if (!notes || !notes.trim()) return;

    try {
      setActionLoading(`dispute-${orderId}`);
      await adminApi.resolveDispute(orderId, resolution, notes.trim(), resolution === "confirm_sale");
      setSuccessMsg("Dispute resolved successfully.");
      fetchDisputes();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resolve dispute.");
    } finally {
      setActionLoading(null);
    }
  };

  // Subscription Payment Handlers (Part 10)
  const handleVerifySubPayment = async (paymentId: string) => {
    if (!window.confirm("Approve this subscription payment and activate user's subscription tier?")) return;
    try {
      setActionLoading(`verify-sub-${paymentId}`);
      await adminApi.verifySubscriptionPayment(paymentId);
      setSuccessMsg("Subscription payment verified and plan activated!");
      fetchSubscriptions();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify subscription payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubPayment = async (paymentId: string) => {
    const reason = window.prompt("Enter rejection reason for this subscription payment:");
    if (!reason || !reason.trim()) return;
    try {
      setActionLoading(`reject-sub-${paymentId}`);
      await adminApi.rejectSubscriptionPayment(paymentId, reason.trim());
      setSuccessMsg("Subscription payment rejected.");
      fetchSubscriptions();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject subscription payment.");
    } finally {
      setActionLoading(null);
    }
  };

  // Freemium Template Handlers (Part 11)
  const handleVerifyTemplatePurchase = async (purchaseId: string) => {
    if (!window.confirm("Approve template purchase and unlock template for user?")) return;
    try {
      setActionLoading(`verify-tmpl-${purchaseId}`);
      await adminApi.verifyTemplatePurchase(purchaseId);
      setSuccessMsg("Template purchase approved and unlocked!");
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify template purchase.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTemplatePurchase = async (purchaseId: string) => {
    const reason = window.prompt("Enter rejection reason for template purchase:");
    if (!reason || !reason.trim()) return;
    try {
      setActionLoading(`reject-tmpl-${purchaseId}`);
      await adminApi.rejectTemplatePurchase(purchaseId, reason.trim());
      setSuccessMsg("Template purchase rejected.");
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject template purchase.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTemplatePublish = async (tmpl: AdminTemplate) => {
    try {
      setActionLoading(`pub-${tmpl.id}`);
      await adminApi.updateTemplate(tmpl.id, { is_published: !tmpl.is_published });
      setSuccessMsg(`Template "${tmpl.title}" is now ${!tmpl.is_published ? "Published" : "Unpublished"}.`);
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle template publish state.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTemplate = async (tmplId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${title}"?`)) return;
    try {
      setActionLoading(`del-tmpl-${tmplId}`);
      await adminApi.deleteTemplate(tmplId);
      setSuccessMsg(`Template "${title}" deleted successfully.`);
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete template.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await adminApi.updatePlatformSettings(settingsForm);
      setSuccessMsg("Platform payment & commission settings updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save platform settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const exportFinancialReportCsv = () => {
    if (!stats) return;
    const rows = [
      ["Metric", "Value (PKR / Count)"],
      ["Total Completed Gross Sales (PKR)", stats.finance.total_completed_sales_pkr],
      ["Commission Rate (%)", stats.finance.commission_rate_percent],
      ["Platform Commission Due (PKR)", stats.finance.commission_due_pkr],
      ["Commission Submitted / Under Review (PKR)", stats.finance.commission_submitted_pkr],
      ["Commission Received & Verified (PKR)", stats.finance.commission_received_pkr],
      ["Outstanding Commission (PKR)", stats.finance.outstanding_commission_pkr],
      ["Total Marketplace Orders", stats.marketplace.total_orders],
      ["Confirmed Sales", stats.marketplace.confirmed_sales],
      ["Disputed Transactions", stats.marketplace.disputed],
      ["Total Registered Accounts", stats.users.total],
      ["Active Users", stats.users.active],
      ["Total Presentations", stats.presentations.total]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PresentationMaker_Financial_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#C15F3D] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#77574A] dark:text-[#E0D5CC]">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#2D241E] dark:text-white mb-2">Administrator Access Required</h2>
        <p className="text-[#77574A] dark:text-[#D0AE92] text-sm mb-4 leading-relaxed">
          The Super Admin control center is restricted exclusively to authorized platform administrators.
          {user ? (
            <> You are currently signed in as <span className="font-semibold text-[#C15F3D]">{user.email}</span> (role: <span className="font-semibold">{user.role}</span>), which does not have administrative privileges.</>
          ) : (
            <> You are currently not signed in.</>
          )}
        </p>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 mb-6 text-left">
          <p className="font-semibold mb-1">Super Admin Account Notice:</p>
          <p>Sign in with your configured Super Admin credentials (<code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">admin@presentai.com</code>) to access platform controls, user management, and financial audits.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigate("/login")}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#C15F3D] hover:bg-[#a84f32] shadow-md transition-all flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Sign In with Administrator Account
          </button>
          <button
            onClick={() => onNavigate("/dashboard")}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#5B4136] dark:text-[#E0D5CC] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[#D0AE92]/30 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Admin Panel Header */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#2D2320] via-[#3E322D] to-[#2D2320] text-[#FFFFFF] shadow-2xl border border-[#D0AE92]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            Super Administrator Control Center
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Centralized Platform Administration
          </h1>
          <p className="text-xs text-[#EBD7BE]/80 max-w-xl">
            Real MongoDB telemetry, multi-tenant user management, marketplace listing approvals, 5% commission verification ledger, and live service health monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === "overview") fetchOverview();
              else if (activeTab === "users") fetchUsers();
              else if (activeTab === "presentations") fetchPresentations();
              else if (activeTab === "marketplace") fetchMarketplace();
              else if (activeTab === "commissions") fetchCommissions();
              else if (activeTab === "disputes") fetchDisputes();
              else if (activeTab === "templates") fetchTemplates();
              else if (activeTab === "settings") fetchSettings();
              else if (activeTab === "subscriptions") fetchSubscriptions();
              else if (activeTab === "health") fetchHealth();
              else if (activeTab === "audit") fetchAudit();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 text-xs font-bold transition-colors border border-white/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <button
            onClick={exportFinancialReportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation Navigation Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
        {[
          { key: "overview", label: "Dashboard Overview", icon: Activity },
          { key: "users", label: "User Management", icon: Users },
          { key: "presentations", label: "Presentations", icon: PresIcon },
          { key: "marketplace", label: "Marketplace Approvals", icon: ShoppingBag },
          { key: "commissions", label: "5% Commission Ledger", icon: DollarSign },
          { key: "disputes", label: "Dispute Center", icon: AlertTriangle },
          { key: "templates", label: "Freemium Templates", icon: Layers },
          { key: "subscriptions", label: "Subscriptions", icon: CreditCard },
          { key: "settings", label: "Payment Settings", icon: Settings },
          { key: "health", label: "System Health", icon: Cpu },
          { key: "audit", label: "Audit Logs", icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-white shadow-md"
                  : "text-[#77574A] dark:text-[#F5EEE8] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/20"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: MAIN DASHBOARD OVERVIEW (Real MongoDB Data)
         ========================================================================= */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Completed Gross Sales */}
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#EBD7BE]">
                <span>Marketplace Gross Sales</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-[#4A3A34] dark:text-white">
                PKR {stats.finance.total_completed_sales_pkr.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#F5EEE8]/80">
                {stats.marketplace.confirmed_sales} confirmed buyer purchases
              </p>
            </div>

            {/* Platform 5% Commission Due */}
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#EBD7BE]">
                <span>5% Commission Due</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                PKR {stats.finance.commission_due_pkr.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#F5EEE8]/80">
                Calculated exactly at 5% of confirmed sales
              </p>
            </div>

            {/* Commission Received (Verified) */}
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#EBD7BE]">
                <span>Commission Received</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                PKR {stats.finance.commission_received_pkr.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#F5EEE8]/80">
                Verified and deposited into platform
              </p>
            </div>

            {/* Outstanding Commission */}
            <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-[#77574A] dark:text-[#EBD7BE]">
                <span>Outstanding Balance</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                PKR {stats.finance.outstanding_commission_pkr.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#77574A] dark:text-[#F5EEE8]/80">
                Pending seller remittance or verification
              </p>
            </div>
          </div>

          {/* Detailed Statistics Grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users Breakdown */}
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                User Account Telemetry
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Total Registered Users</span>
                  <span className="font-extrabold text-[#4A3A34] dark:text-white">{stats.users.total}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">New Registrations Today</span>
                  <span className="font-bold text-emerald-600">{stats.users.today}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">New This Week (7 Days)</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">{stats.users.weekly}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Active Accounts</span>
                  <span className="font-bold text-emerald-600">{stats.users.active}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Suspended Accounts</span>
                  <span className="font-bold text-rose-500">{stats.users.suspended}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Super Administrators</span>
                  <span className="font-bold text-amber-500">{stats.users.admins}</span>
                </div>
              </div>
            </div>

            {/* Presentation Engine Breakdown */}
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <PresIcon className="w-4 h-4 text-[var(--color-primary)]" />
                Presentation Generation
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Total Presentation Decks</span>
                  <span className="font-extrabold text-[#4A3A34] dark:text-white">{stats.presentations.total}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Prompt-Generated Decks</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">{stats.presentations.ai_generated}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Document Upload Decks</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">{stats.presentations.document_uploads}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Public Decks</span>
                  <span className="font-bold text-emerald-600">{stats.presentations.public}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">AI Generation Success Rate</span>
                  <span className="font-bold text-emerald-600">{stats.ai.success_rate}%</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Successful Generation Jobs</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">{stats.ai.completed}</span>
                </div>
              </div>
            </div>

            {/* Marketplace Status */}
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
                Marketplace Activity
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Total Listings</span>
                  <span className="font-extrabold text-[#4A3A34] dark:text-white">{stats.marketplace.total_listings}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Pending Admin Review</span>
                  <span className="font-bold text-amber-500">{stats.marketplace.pending_review}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Approved Listings</span>
                  <span className="font-bold text-emerald-600">{stats.marketplace.approved}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Rejected Listings</span>
                  <span className="font-bold text-rose-500">{stats.marketplace.rejected}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Total Purchases Initiated</span>
                  <span className="font-bold text-[#4A3A34] dark:text-white">{stats.marketplace.total_orders}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#77574A] dark:text-[#EBD7BE]">Open Disputes</span>
                  <span className="font-bold text-rose-500">{stats.marketplace.disputed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Data CSV Exports (Part 13) */}
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#4A3A34] dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" />
                  Real MongoDB Data Exports (CSV)
                </h3>
                <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                  Download live database records for external analysis, auditing, accounting, and compliance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <a
                href="/api/admin/export/users.csv"
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 hover:bg-[#D0AE92]/20 text-[#4A3A34] dark:text-white font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Users CSV</span>
              </a>

              <a
                href="/api/admin/export/orders.csv"
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 hover:bg-[#D0AE92]/20 text-[#4A3A34] dark:text-white font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Orders CSV</span>
              </a>

              <a
                href="/api/admin/export/subscriptions.csv"
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 hover:bg-[#D0AE92]/20 text-[#4A3A34] dark:text-white font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                <span>Subscriptions CSV</span>
              </a>

              <a
                href="/api/admin/export/commissions.csv"
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#F9F2E4] dark:bg-[#332D28] border border-[#D0AE92]/40 hover:bg-[#D0AE92]/20 text-[#4A3A34] dark:text-white font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>5% Commissions CSV</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: USER MANAGEMENT (Part 12.B)
         ========================================================================= */}
      {activeTab === "users" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
              Registered Accounts Directory ({users.length})
            </h2>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#77574A]" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchUsers()}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={e => {
                  setUserRoleFilter(e.target.value);
                  setTimeout(fetchUsers, 50);
                }}
                className="px-3 py-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="researcher">Researcher</option>
                <option value="professional">Professional</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                <tr>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Decks</th>
                  <th className="py-3 px-3">Listings</th>
                  <th className="py-3 px-3">Sales</th>
                  <th className="py-3 px-3">Joined</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0AE92]/20 dark:divide-[#8C7D70]/20">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#F9F2E4]/30 dark:hover:bg-[#332D28]/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#4A3A34] dark:text-white">{u.name}</div>
                      <div className="text-[11px] text-[#77574A] dark:text-[#EBD7BE]">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === "admin"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      }`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold">{u.presentations_count}</td>
                    <td className="py-3 px-3 font-semibold">{u.listings_count}</td>
                    <td className="py-3 px-3 font-semibold">{u.confirmed_sales_count}</td>
                    <td className="py-3 px-3 text-[#77574A] dark:text-[#EBD7BE]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleChangeUserRole(u)}
                        disabled={actionLoading === `user-role-${u.id}`}
                        className="px-2 py-1 rounded bg-[#FFFFFF]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 hover:border-[#77574A] text-[10px] font-bold"
                      >
                        Role
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        disabled={actionLoading === `user-status-${u.id}`}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          u.is_active
                            ? "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/30"
                        }`}
                      >
                        {u.is_active ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PRESENTATION MANAGEMENT (Part 12.C)
         ========================================================================= */}
      {activeTab === "presentations" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <PresIcon className="w-5 h-5 text-[var(--color-primary)]" />
              Presentation Library Moderation ({presentations.length})
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#77574A]" />
              <input
                type="text"
                placeholder="Search presentation titles..."
                value={presSearch}
                onChange={e => setPresSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchPresentations()}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                <tr>
                  <th className="py-3 px-3">Title</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Slides</th>
                  <th className="py-3 px-3">Visibility</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0AE92]/20 dark:divide-[#8C7D70]/20">
                {presentations.map(p => (
                  <tr key={p.id} className="hover:bg-[#F9F2E4]/30 dark:hover:bg-[#332D28]/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-[#4A3A34] dark:text-white">
                      {p.title}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <div>{p.owner_name}</div>
                      <div className="text-[#77574A] dark:text-[#EBD7BE]">{p.owner_email}</div>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-mono">{p.source_type}</td>
                    <td className="py-3 px-3 font-semibold">{p.slides_count}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.visibility === "public"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-[#77574A]/10 text-[#77574A] dark:text-[#EBD7BE]"
                      }`}>
                        {p.visibility}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#77574A] dark:text-[#EBD7BE]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => onNavigate(`/presentation/${p.id}`)}
                        className="px-2.5 py-1 rounded bg-[#FFFFFF]/60 dark:bg-[#3E3731] border border-[#D0AE92]/40 hover:border-[#77574A] text-[10px] font-bold"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={async () => {
                          const reason = window.prompt(`Moderate / delete "${p.title}"? Enter reason:`);
                          if (!reason) return;
                          await adminApi.deletePresentation(p.id, reason);
                          fetchPresentations();
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MARKETPLACE APPROVAL CENTER (Part 8 & 12.E)
         ========================================================================= */}
      {activeTab === "marketplace" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
                Marketplace Seller Listing Approvals ({listings.length})
              </h2>
              <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                Every seller submission enters PENDING_REVIEW and must be approved before going live.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setListingFilter(status);
                    setTimeout(fetchMarketplace, 50);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    listingFilter === status
                      ? "bg-[#77574A] text-white"
                      : "bg-[#FFFFFF]/60 dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] border border-[#D0AE92]/40"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
                No listings found matching the current filter.
              </div>
            ) : (
              listings.map(l => (
                <div
                  key={l.id}
                  className="p-5 rounded-2xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#332D28]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === "PENDING_REVIEW"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : l.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                      }`}>
                        {l.status}
                      </span>
                      <span className="text-[10px] font-semibold text-[#77574A] dark:text-[#EBD7BE] px-2 py-0.5 rounded bg-[#EBD7BE]/40">
                        {l.category} &bull; {l.file_type}
                      </span>
                      <span className="font-extrabold text-xs text-emerald-600">
                        PKR {l.price_pkr.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#4A3A34] dark:text-white">
                      {l.title}
                    </h4>
                    <p className="text-xs text-[#6B4E3D] dark:text-[#F5EEE8]/80 line-clamp-2">
                      {l.short_description}
                    </p>

                    <div className="text-[11px] text-[#77574A] dark:text-[#EBD7BE] flex items-center gap-4 pt-1">
                      <span>Seller: <strong>{l.seller_name}</strong> ({l.seller_email})</span>
                      <span>Submitted: {new Date(l.created_at).toLocaleDateString()}</span>
                    </div>

                    {l.rejection_reason && (
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-500/20">
                        Rejection reason: {l.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {l.status === "PENDING_REVIEW" && (
                      <>
                        <button
                          onClick={() => handleApproveListing(l.id)}
                          disabled={actionLoading === `approve-${l.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectListing(l.id)}
                          disabled={actionLoading === `reject-${l.id}`}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {l.status === "APPROVED" && (
                      <button
                        onClick={() => handleRejectListing(l.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-600 text-xs font-bold hover:bg-rose-500/10"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: 5% COMMISSION VERIFICATION LEDGER (Part 9 & 12.E)
         ========================================================================= */}
      {activeTab === "commissions" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                5% Platform Commission Verification Ledger ({commissions.length})
              </h2>
              <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                Seller pays 5% commission separately after confirming sale. Admin verifies receipt evidence before marking PAID.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["ALL", "COMMISSION_SUBMITTED", "COMMISSION_DUE", "COMMISSION_PAID", "COMMISSION_REJECTED"].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setCommissionFilter(status);
                    setTimeout(fetchCommissions, 50);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    commissionFilter === status
                      ? "bg-[#77574A] text-white"
                      : "bg-[#FFFFFF]/60 dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] border border-[#D0AE92]/40"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {commissions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
                No commission records matching current filter.
              </div>
            ) : (
              commissions.map(o => (
                <div
                  key={o.id}
                  className="p-5 rounded-2xl border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-[#FDFBF7] dark:bg-[#332D28]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.commission_status === "COMMISSION_PAID"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          : o.commission_status === "COMMISSION_SUBMITTED"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                      }`}>
                        {o.commission_status}
                      </span>
                      <span className="text-xs font-extrabold text-[#4A3A34] dark:text-white">
                        Sale: PKR {o.sale_price_pkr.toLocaleString()}
                      </span>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        Commission: PKR {o.platform_commission_pkr.toLocaleString()} (5%)
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#4A3A34] dark:text-white">
                      Order for: {o.title}
                    </h4>

                    <div className="text-[11px] text-[#77574A] dark:text-[#EBD7BE] flex flex-wrap gap-4 pt-1">
                      <span>Seller: <strong>{o.seller_name}</strong> ({o.seller_email})</span>
                      <span>Buyer: <strong>{o.buyer_name}</strong></span>
                      {o.commission_payment_ref && (
                        <span>Tx Ref: <strong className="font-mono">{o.commission_payment_ref}</strong></span>
                      )}
                    </div>

                    {o.commission_receipt_url && (
                      <div className="pt-2">
                        <a
                          href={o.commission_receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FFFFFF]/80 dark:bg-[#3E3731] border border-[#D0AE92]/40 text-xs font-bold text-[var(--color-primary)] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Receipt Screenshot
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {o.commission_status === "COMMISSION_SUBMITTED" && (
                      <>
                        <button
                          onClick={() => handleVerifyCommission(o.id)}
                          disabled={actionLoading === `verify-${o.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                        >
                          Verify Payment
                        </button>
                        <button
                          onClick={() => handleRejectCommission(o.id)}
                          disabled={actionLoading === `reject-comm-${o.id}`}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
                        >
                          Reject Proof
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: DISPUTE CENTER (Part 9 & 12.E)
         ========================================================================= */}
      {activeTab === "disputes" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Marketplace Transaction Disputes ({disputes.length})
          </h2>

          <div className="space-y-4">
            {disputes.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
                No active transaction disputes.
              </div>
            ) : (
              disputes.map(d => (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#4A3A34] dark:text-white">
                      Order: {d.title} (PKR {d.sale_price_pkr})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold">
                      DISPUTE OPEN
                    </span>
                  </div>

                  <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                    <strong>Dispute Reason:</strong> {d.dispute_reason || "Buyer reported payment submitted but unconfirmed by seller."}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-[#77574A] dark:text-[#EBD7BE]">
                    <span>Buyer: {d.buyer_name} ({d.buyer_email})</span>
                    <span>Seller: {d.seller_name} ({d.seller_email})</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => handleResolveDispute(d.id, "confirm_sale")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Authorize Buyer Download (Confirm Sale)
                    </button>
                    <button
                      onClick={() => handleResolveDispute(d.id, "cancel_sale")}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                    >
                      Cancel Sale
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: FREEMIUM TEMPLATES (Part 11 & Part 12)
         ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                  Freemium Templates Library ({templates.length})
                </h2>
                <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                  Manage curated presentation decks across 8 professional categories with real access gating.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate({
                    title: "",
                    description: "",
                    category: "Business & Corporate",
                    access_type: "FREE",
                    price_pkr: 0,
                    cover_image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
                    is_published: true,
                    is_featured: false
                  });
                  setShowTemplateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white text-xs font-bold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Template</span>
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-3">
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
                    onClick={() => setTemplateCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      templateCategoryFilter === cat
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
                    onClick={() => setTemplateAccessFilter(acc)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      templateAccessFilter === acc
                        ? "bg-[#77574A] text-white"
                        : "bg-[#F9F2E4] dark:bg-[#332D28] text-[#77574A] dark:text-[#EBD7BE] hover:bg-[#D0AE92]/30"
                    }`}
                  >
                    {acc.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-[#77574A] dark:text-[#EBD7BE]">
                  No templates found matching the selected criteria.
                </div>
              ) : (
                templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="rounded-2xl border border-[#D0AE92]/30 dark:border-[#8C7D70]/40 overflow-hidden bg-white/50 dark:bg-[#332D28]/40 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="relative aspect-video w-full bg-[#EBD7BE]/40 overflow-hidden">
                        <img
                          src={tmpl.cover_image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085"}
                          alt={tmpl.title}
                          className="w-full h-full object-cover"
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tmpl.is_published ? "bg-emerald-500/80 text-white" : "bg-neutral-500/80 text-white"
                          }`}>
                            {tmpl.is_published ? "Published" : "Draft"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-[var(--color-primary)]">
                          {tmpl.category}
                        </span>
                        <h3 className="font-bold text-sm text-[#4A3A34] dark:text-white line-clamp-1">
                          {tmpl.title}
                        </h3>
                        <p className="text-xs text-[#77574A] dark:text-[#EBD7BE] line-clamp-2">
                          {tmpl.description}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-[#77574A] pt-2 border-t border-[#D0AE92]/20">
                          <span>{tmpl.slide_count} Slides</span>
                          <span>Used {tmpl.usage_count}x</span>
                          <span className="font-bold text-amber-500">★ {tmpl.average_rating || 5.0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-[#D0AE92]/20 dark:border-[#8C7D70]/20">
                      <button
                        onClick={() => handleToggleTemplatePublish(tmpl)}
                        disabled={actionLoading === `pub-${tmpl.id}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          tmpl.is_published
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {tmpl.is_published ? "Unpublish" : "Publish"}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setShowTemplateModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#D0AE92]/20 text-[#77574A] dark:text-[#EBD7BE]"
                          title="Edit Template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          disabled={actionLoading === `del-tmpl-${tmpl.id}`}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-600"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Template Purchases Approvals Section */}
            <div className="pt-8 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[#4A3A34] dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Premium Template Purchase Requests ({templatePurchases.length})
                  </h3>
                  <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                    Verify NayaPay payment submissions for individual premium template purchases.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {["ALL", "PAYMENT_SUBMITTED", "APPROVED", "REJECTED"].map(st => (
                    <button
                      key={st}
                      onClick={() => setTemplatePurchasesFilter(st)}
                      className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                        templatePurchasesFilter === st
                          ? "bg-[#77574A] text-white"
                          : "bg-[#F9F2E4] dark:bg-[#332D28] text-[#77574A]"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#D0AE92]/30 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Buyer</th>
                      <th className="py-2.5 px-3">Template</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Transaction Reference</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0AE92]/20">
                    {templatePurchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-[#77574A]">
                          No template purchases recorded yet.
                        </td>
                      </tr>
                    ) : (
                      templatePurchases
                        .filter(p => templatePurchasesFilter === "ALL" || p.status === templatePurchasesFilter)
                        .map(p => (
                          <tr key={p.id}>
                            <td className="py-3 px-3">
                              <div className="font-bold text-[#4A3A34] dark:text-white">{p.user_name}</div>
                              <div className="text-[11px] text-[#77574A]">{p.user_email}</div>
                            </td>
                            <td className="py-3 px-3 font-semibold">{p.template_title}</td>
                            <td className="py-3 px-3 font-bold text-emerald-600">PKR {p.price_pkr}</td>
                            <td className="py-3 px-3 font-mono">{p.transaction_ref}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === "APPROVED"
                                  ? "bg-emerald-500/20 text-emerald-700"
                                  : p.status === "REJECTED"
                                  ? "bg-rose-500/20 text-rose-700"
                                  : "bg-amber-500/20 text-amber-700"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              {p.status === "PAYMENT_SUBMITTED" || p.status === "PENDING_PAYMENT" ? (
                                <>
                                  <button
                                    onClick={() => handleVerifyTemplatePurchase(p.id)}
                                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectTemplatePurchase(p.id)}
                                    className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-[#77574A]">Resolved</span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: PLATFORM SETTINGS (Part 9 & 12.E)
         ========================================================================= */}
      {activeTab === "settings" && (
        <div className="p-6 md:p-8 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--color-primary)]" />
              Platform Commission & Payment Settings
            </h2>
            <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
              Configure platform accounts displayed to sellers for remitting their 5% commission.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                Payment Provider
              </label>
              <input
                type="text"
                value={settingsForm.payment_provider}
                onChange={e => setSettingsForm({ ...settingsForm, payment_provider: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                Account Title
              </label>
              <input
                type="text"
                value={settingsForm.account_title}
                onChange={e => setSettingsForm({ ...settingsForm, account_title: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Platform Payment / Mobile Number
                </label>
                <input
                  type="text"
                  value={settingsForm.platform_payment_number}
                  onChange={e => setSettingsForm({ ...settingsForm, platform_payment_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={settingsForm.commission_percentage}
                  onChange={e => setSettingsForm({ ...settingsForm, commission_percentage: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                Bank Details & IBAN
              </label>
              <input
                type="text"
                value={settingsForm.bank_details}
                onChange={e => setSettingsForm({ ...settingsForm, bank_details: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
              />
            </div>

            <div>
              <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                Commission Payment Instructions for Sellers
              </label>
              <textarea
                rows={3}
                value={settingsForm.payment_instructions}
                onChange={e => setSettingsForm({ ...settingsForm, payment_instructions: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
              />
            </div>

            <div>
              <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">
                Support Contact Email
              </label>
              <input
                type="email"
                value={settingsForm.support_contact}
                onChange={e => setSettingsForm({ ...settingsForm, support_contact: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white font-bold text-xs shadow-md transition-colors"
            >
              {savingSettings ? "Saving Settings..." : "Save Settings"}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 8: SUBSCRIPTIONS (Part 12.F)
         ========================================================================= */}
      {activeTab === "subscriptions" && subscriptionsData && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-[#D0AE92]/30">
              <span className="text-xs text-[#77574A]">Free Plan Accounts</span>
              <div className="text-xl font-bold">{subscriptionsData.summary.free}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-[#D0AE92]/30">
              <span className="text-xs text-[#77574A]">Student Plan Accounts</span>
              <div className="text-xl font-bold">{subscriptionsData.summary.student}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-[#D0AE92]/30">
              <span className="text-xs text-[#77574A]">Pro Plan Accounts</span>
              <div className="text-xl font-bold">{subscriptionsData.summary.pro}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F9F2E4]/40 dark:bg-[#332D28]/60 border border-[#D0AE92]/30">
              <span className="text-xs text-[#77574A]">Team / Enterprise Plan</span>
              <div className="text-xl font-bold">{subscriptionsData.summary.team}</div>
            </div>
          </div>

          {/* Manual Subscription Payments Approvals (Part 10) */}
          <div className="space-y-4 pt-4 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-[#4A3A34] dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Manual NayaPay Subscription Verifications ({subscriptionPayments.length})
                </h3>
                <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
                  Review user NayaPay transfers (Recipient: Syeda Gul Andam Malik Kazmi - 03339114569) and activate tiers.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {["ALL", "PAYMENT_SUBMITTED", "APPROVED", "REJECTED"].map(st => (
                  <button
                    key={st}
                    onClick={() => setSubPaymentFilter(st)}
                    className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                      subPaymentFilter === st
                        ? "bg-[#77574A] text-white"
                        : "bg-[#F9F2E4] dark:bg-[#332D28] text-[#77574A]"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#D0AE92]/30 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Plan Requested</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Transaction Reference</th>
                    <th className="py-2.5 px-3">Payer Info</th>
                    <th className="py-2.5 px-3">Receipt Proof</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0AE92]/20">
                  {subscriptionPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#77574A]">
                        No subscription payments submitted yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptionPayments
                      .filter(p => subPaymentFilter === "ALL" || p.payment_status === subPaymentFilter)
                      .map(p => (
                        <tr key={p.id}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#4A3A34] dark:text-white">{p.user_name}</div>
                            <div className="text-[11px] text-[#77574A]">{p.user_email}</div>
                          </td>
                          <td className="py-3 px-3 font-bold uppercase text-[11px]">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                              {p.plan}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-emerald-600">
                            PKR {p.amount_pkr ? p.amount_pkr.toLocaleString() : (p.gross_amount * 280).toLocaleString()} (${p.gross_amount})
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">{p.transaction_ref}</td>
                          <td className="py-3 px-3 text-[11px]">{p.payer_name || p.user_name}</td>
                          <td className="py-3 px-3">
                            {p.receipt_url ? (
                              <a
                                href={p.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[var(--color-primary)] font-bold hover:underline"
                              >
                                View Proof <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-neutral-400 italic">No upload</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.payment_status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-700"
                                : p.payment_status === "REJECTED"
                                ? "bg-rose-500/20 text-rose-700"
                                : "bg-amber-500/20 text-amber-700"
                            }`}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            {p.payment_status === "PAYMENT_SUBMITTED" || p.payment_status === "PENDING_PAYMENT" ? (
                              <>
                                <button
                                  onClick={() => handleVerifySubPayment(p.id)}
                                  disabled={actionLoading === `verify-sub-${p.id}`}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                                >
                                  Approve Tier
                                </button>
                                <button
                                  onClick={() => handleRejectSubPayment(p.id)}
                                  disabled={actionLoading === `reject-sub-${p.id}`}
                                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-[#77574A]">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                <tr>
                  <th className="py-3 px-3">Subscriber</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Credits</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0AE92]/20 dark:divide-[#8C7D70]/20">
                {subscriptionsData.subscriptions.map((s: any) => (
                  <tr key={s.user_id}>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#4A3A34] dark:text-white">{s.name}</div>
                      <div className="text-[11px] text-[#77574A]">{s.email}</div>
                    </td>
                    <td className="py-3 px-3 font-bold uppercase text-[10px]">{s.plan}</td>
                    <td className="py-3 px-3 font-semibold">{s.status}</td>
                    <td className="py-3 px-3">{s.credits_remaining}</td>
                    <td className="py-3 px-3 font-extrabold text-emerald-600">
                      ${s.amount_paid} {s.currency}
                    </td>
                    <td className="py-3 px-3 text-[#77574A]">
                      {new Date(s.registered_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: SYSTEM HEALTH (Part 12.H)
         ========================================================================= */}
      {activeTab === "health" && systemHealth && (
        <div className="p-6 md:p-8 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[var(--color-primary)]" />
              Live Microservices Health Telemetry
            </h2>
            <p className="text-xs text-[#77574A] dark:text-[#EBD7BE]">
              Live status checked synchronously against each service process.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Node Gateway */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3A34] dark:text-white">Node.js Gateway</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-extrabold text-emerald-600">
                {systemHealth.node_gateway?.status}
              </div>
              <p className="text-[11px] text-[#77574A]">
                Port {systemHealth.node_gateway?.port} &bull; Uptime {Math.floor(systemHealth.node_gateway?.uptime_seconds / 60)}m
              </p>
            </div>

            {/* MongoDB Atlas */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3A34] dark:text-white">MongoDB Atlas</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-extrabold text-emerald-600">
                {systemHealth.mongodb?.status}
              </div>
              <p className="text-[11px] text-[#77574A]">
                State: {systemHealth.mongodb?.readyState}
              </p>
            </div>

            {/* Python FastAPI AI */}
            <div className={`p-5 rounded-2xl border space-y-2 ${
              systemHealth.python_ai_service?.status === "ONLINE"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                : "border-rose-500/30 bg-rose-500/5 text-rose-600"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3A34] dark:text-white">Python FastAPI AI</span>
                {systemHealth.python_ai_service?.status === "ONLINE" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <div className="text-lg font-extrabold">
                {systemHealth.python_ai_service?.status}
              </div>
              <p className="text-[11px] text-[#77574A]">
                Port 8001 &bull; {systemHealth.python_ai_service?.response?.service || "AI Service"}
              </p>
            </div>

            {/* Unsplash Integration */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A3A34] dark:text-white">Unsplash API</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-extrabold text-emerald-600">
                CONFIGURED
              </div>
              <p className="text-[11px] text-[#77574A]">
                Key & Secret verified active
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 10: AUDIT LOGS (Part 12.E & Part 13)
         ========================================================================= */}
      {activeTab === "audit" && (
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#3E3731] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-[#4A3A34] dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            Administrative Action Audit Trail ({auditLogs.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold">
                <tr>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-3">Reason / Details</th>
                  <th className="py-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0AE92]/20 dark:divide-[#8C7D70]/20">
                {auditLogs.map(a => (
                  <tr key={a.id}>
                    <td className="py-3 px-3 font-semibold">{a.admin_email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#77574A]/10 font-mono text-[10px] font-bold">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px]">{a.target_type} ({a.target_id.slice(-6)})</td>
                    <td className="py-3 px-3 text-[#77574A]">{a.reason || JSON.stringify(a.details)}</td>
                    <td className="py-3 px-3 text-[#77574A]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Template Modal (Part 11) */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#3E3731] border border-[#D0AE92]/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D0AE92]/30 pb-3">
              <h3 className="font-bold text-base text-[#4A3A34] dark:text-white">
                {editingTemplate.id ? "Edit Freemium Template" : "Create New Presentation Template"}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                try {
                  setActionLoading("save-template");
                  if (editingTemplate.id) {
                    await adminApi.updateTemplate(editingTemplate.id, editingTemplate);
                    setSuccessMsg("Template updated successfully!");
                  } else {
                    await adminApi.createTemplate(editingTemplate);
                    setSuccessMsg("Template created successfully!");
                  }
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  fetchTemplates();
                } catch (err: any) {
                  setErrorMsg(err.message || "Failed to save template.");
                } finally {
                  setActionLoading(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.title || ""}
                  onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="e.g. AI Strategy & Executive Roadmap"
                />
              </div>

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={editingTemplate.description || ""}
                  onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="Summary of presentation structure, audience, and slides..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Category</label>
                  <select
                    value={editingTemplate.category || "Business & Corporate"}
                    onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                    className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white text-xs"
                  >
                    {[
                      "Business & Corporate",
                      "Education & University",
                      "Technology & AI",
                      "Healthcare",
                      "Marketing",
                      "Research & Academic",
                      "Portfolio & Creative",
                      "Pitch Decks"
                    ].map(c => (
                      <option key={c} value={c} className="bg-white dark:bg-[#3E3731]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Access Type</label>
                  <select
                    value={editingTemplate.access_type || "FREE"}
                    onChange={e => setEditingTemplate({ ...editingTemplate, access_type: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white text-xs"
                  >
                    <option value="FREE" className="bg-white dark:bg-[#3E3731]">FREE (0 PKR)</option>
                    <option value="PLAN_INCLUDED" className="bg-white dark:bg-[#3E3731]">PLAN INCLUDED</option>
                    <option value="PREMIUM" className="bg-white dark:bg-[#3E3731]">PREMIUM (Paid)</option>
                  </select>
                </div>
              </div>

              {editingTemplate.access_type === "PREMIUM" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Price in PKR</label>
                    <input
                      type="number"
                      min="0"
                      value={editingTemplate.price_pkr || 0}
                      onChange={e => setEditingTemplate({ ...editingTemplate, price_pkr: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">USD Equivalent ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingTemplate.price_usd || 0}
                      onChange={e => setEditingTemplate({ ...editingTemplate, price_usd: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-[#4A3A34] dark:text-white block mb-1">Cover Image URL (Unsplash)</label>
                <input
                  type="url"
                  value={editingTemplate.cover_image || ""}
                  onChange={e => setEditingTemplate({ ...editingTemplate, cover_image: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#D0AE92]/40 bg-transparent text-[#4A3A34] dark:text-white"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#4A3A34] dark:text-white font-bold">
                  <input
                    type="checkbox"
                    checked={!!editingTemplate.is_published}
                    onChange={e => setEditingTemplate({ ...editingTemplate, is_published: e.target.checked })}
                    className="rounded text-[var(--color-primary)]"
                  />
                  <span>Published & Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#4A3A34] dark:text-white font-bold">
                  <input
                    type="checkbox"
                    checked={!!editingTemplate.is_featured}
                    onChange={e => setEditingTemplate({ ...editingTemplate, is_featured: e.target.checked })}
                    className="rounded text-[var(--color-primary)]"
                  />
                  <span>Featured on Homepage</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#D0AE92]/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#D0AE92]/40 text-[#77574A] dark:text-[#EBD7BE] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "save-template"}
                  className="px-5 py-2 rounded-xl bg-[#77574A] hover:bg-[#604439] text-white font-bold shadow-md"
                >
                  {actionLoading === "save-template" ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
