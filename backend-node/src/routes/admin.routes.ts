import { Router, Response } from "express";
import { Types } from "mongoose";
import axios from "axios";
import { User } from "../models/User.js";
import { Presentation } from "../models/Presentation.js";
import { MarketplaceListing } from "../models/MarketplaceListing.js";
import { MarketplaceOrder } from "../models/MarketplaceOrder.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { AuditLog } from "../models/AuditLog.js";
import { GenerationJob } from "../models/GenerationJob.js";
import { SubscriptionPayment } from "../models/SubscriptionPayment.js";
import { Template } from "../models/Template.js";
import { TemplatePurchase } from "../models/TemplatePurchase.js";
import { AuthenticatedRequest, requireAuth, requireAdmin } from "../middleware/auth.js";
import { config } from "../config/config.js";
import { unsplashService } from "../services/unsplash.service.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// All admin routes strictly require authentication and admin role (RBAC)
router.use(requireAuth);
router.use(requireAdmin);

// Helper to log audit actions
async function recordAudit(
  adminId: string,
  adminEmail: string,
  action: string,
  target_type: "listing" | "order" | "user" | "presentation" | "settings" | "subscription" | "template" | "template_purchase" | "subscription_payment",
  target_id: string,
  details: any = {},
  reason?: string
) {
  try {
    await AuditLog.create({
      admin_id: new Types.ObjectId(adminId),
      admin_email: adminEmail,
      action,
      target_type,
      target_id,
      details,
      reason: reason || null,
      created_at: new Date()
    });
  } catch (err: any) {
    console.warn("[AuditLog] Failed to record audit log:", err.message);
  }
}

// ==============================================================================
// 1. MAIN DASHBOARD: REAL MONGODB STATISTICS (Part 12.A)
// ==============================================================================
router.get("/dashboard-stats", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Users Statistics
    const [
      totalUsers,
      todayUsers,
      weeklyUsers,
      monthlyUsers,
      activeUsers,
      suspendedUsers,
      adminUsers
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ created_at: { $gte: todayStart } }),
      User.countDocuments({ created_at: { $gte: weekAgo } }),
      User.countDocuments({ created_at: { $gte: monthAgo } }),
      User.countDocuments({ is_active: true }),
      User.countDocuments({ is_active: false }),
      User.countDocuments({ $or: [{ role: "admin" }, { is_admin: true }] })
    ]);

    // Unique sellers & buyers
    const [sellerIds, buyerIds] = await Promise.all([
      MarketplaceListing.distinct("seller_id"),
      MarketplaceOrder.distinct("buyer_id")
    ]);

    // 2. Presentations Statistics
    const [
      totalPresentations,
      aiPresentations,
      docPresentations,
      publicPresentations,
      savedPresentations,
      draftPresentations
    ] = await Promise.all([
      Presentation.countDocuments({}),
      Presentation.countDocuments({ source_type: "prompt" }),
      Presentation.countDocuments({ source_type: "document" }),
      Presentation.countDocuments({ visibility: "public" }),
      Presentation.countDocuments({ status: "ready" }),
      Presentation.countDocuments({ status: "draft" })
    ]);

    // 3. Marketplace Statistics
    const [
      totalListings,
      pendingListings,
      approvedListings,
      rejectedListings,
      suspendedListings,
      totalOrders,
      confirmedSales,
      disputedSales
    ] = await Promise.all([
      MarketplaceListing.countDocuments({}),
      MarketplaceListing.countDocuments({ status: "PENDING_REVIEW" }),
      MarketplaceListing.countDocuments({ status: "APPROVED" }),
      MarketplaceListing.countDocuments({ status: "REJECTED" }),
      MarketplaceListing.countDocuments({ status: "SUSPENDED" }),
      MarketplaceOrder.countDocuments({}),
      MarketplaceOrder.countDocuments({ sale_status: "SALE_CONFIRMED" }),
      MarketplaceOrder.countDocuments({ sale_status: "DISPUTED" })
    ]);

    // 4. Financial Statistics (Real commission tracking)
    // Only count verified COMMISSION_PAID as received revenue
    const financeAgg = await MarketplaceOrder.aggregate([
      {
        $group: {
          _id: null,
          total_gross_pkr: {
            $sum: { $cond: [{ $eq: ["$sale_status", "SALE_CONFIRMED"] }, "$sale_price_pkr", 0] }
          },
          commission_due_pkr: {
            $sum: { $cond: [{ $eq: ["$sale_status", "SALE_CONFIRMED"] }, "$platform_commission_pkr", 0] }
          },
          commission_submitted_pkr: {
            $sum: {
              $cond: [
                { $in: ["$commission_status", ["COMMISSION_SUBMITTED", "COMMISSION_UNDER_REVIEW"]] },
                "$platform_commission_pkr",
                0
              ]
            }
          },
          commission_received_pkr: {
            $sum: {
              $cond: [{ $eq: ["$commission_status", "COMMISSION_PAID"] }, "$platform_commission_pkr", 0]
            }
          },
          commission_rejected_pkr: {
            $sum: {
              $cond: [{ $eq: ["$commission_status", "COMMISSION_REJECTED"] }, "$platform_commission_pkr", 0]
            }
          }
        }
      }
    ]);

    const finance = financeAgg[0] || {
      total_gross_pkr: 0,
      commission_due_pkr: 0,
      commission_submitted_pkr: 0,
      commission_received_pkr: 0,
      commission_rejected_pkr: 0
    };

    const outstanding_commission_pkr = Math.max(
      0,
      finance.commission_due_pkr - finance.commission_received_pkr
    );

    // AI Job stats
    const [totalJobs, completedJobs, failedJobs] = await Promise.all([
      GenerationJob.countDocuments({}),
      GenerationJob.countDocuments({ status: "completed" }),
      GenerationJob.countDocuments({ status: "failed" })
    ]);

    // Template stats (Part 11)
    const [totalTemplates, freeTemplates, planTemplates, premiumTemplates, templatePurchases] = await Promise.all([
      Template.countDocuments({}),
      Template.countDocuments({ access_type: "FREE" }),
      Template.countDocuments({ access_type: "PLAN_INCLUDED" }),
      Template.countDocuments({ access_type: "PREMIUM" }),
      TemplatePurchase.countDocuments({})
    ]);

    // Subscription Payment stats (Part 10)
    const [totalSubPayments, pendingSubPayments, approvedSubPayments, rejectedSubPayments] = await Promise.all([
      SubscriptionPayment.countDocuments({}),
      SubscriptionPayment.countDocuments({ payment_status: { $in: ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "pending"] } }),
      SubscriptionPayment.countDocuments({ payment_status: { $in: ["APPROVED", "completed"] } }),
      SubscriptionPayment.countDocuments({ payment_status: { $in: ["REJECTED", "failed", "cancelled"] } })
    ]);

    res.json({
      users: {
        total: totalUsers,
        today: todayUsers,
        weekly: weeklyUsers,
        monthly: monthlyUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        sellers: sellerIds.length,
        buyers: buyerIds.length,
        admins: adminUsers
      },
      presentations: {
        total: totalPresentations,
        ai_generated: aiPresentations,
        document_uploads: docPresentations,
        public: publicPresentations,
        saved: savedPresentations,
        drafts: draftPresentations,
        successful_generations: completedJobs,
        failed_generations: failedJobs
      },
      marketplace: {
        total_listings: totalListings,
        pending_review: pendingListings,
        approved: approvedListings,
        rejected: rejectedListings,
        suspended: suspendedListings,
        total_orders: totalOrders,
        confirmed_sales: confirmedSales,
        disputed: disputedSales
      },
      templates: {
        total: totalTemplates,
        free: freeTemplates,
        plan_included: planTemplates,
        premium: premiumTemplates,
        total_purchases: templatePurchases
      },
      subscriptions: {
        total_payments: totalSubPayments,
        pending: pendingSubPayments,
        approved: approvedSubPayments,
        rejected: rejectedSubPayments
      },
      finance: {
        total_completed_sales_pkr: finance.total_gross_pkr,
        commission_due_pkr: finance.commission_due_pkr,
        commission_submitted_pkr: finance.commission_submitted_pkr,
        commission_received_pkr: finance.commission_received_pkr,
        outstanding_commission_pkr,
        commission_rejected_pkr: finance.commission_rejected_pkr,
        commission_rate_percent: 5
      },
      ai: {
        total_requests: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        success_rate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 100
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch dashboard statistics." });
  }
});

// ==============================================================================
// 2. USER MANAGEMENT (Part 12.B)
// ==============================================================================
router.get("/users", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status, page = "1", limit = "20" } = req.query;
    const filter: any = {};

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    if (role && typeof role === "string" && role !== "all") {
      filter.role = role;
    }

    if (status === "active") filter.is_active = true;
    if (status === "suspended") filter.is_active = false;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password_hash")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Attach presentation and listing counts per user
    const userIds = users.map(u => u._id);
    const [presCounts, listingCounts, salesCounts] = await Promise.all([
      Presentation.aggregate([
        { $match: { user_id: { $in: userIds } } },
        { $group: { _id: "$user_id", count: { $sum: 1 } } }
      ]),
      MarketplaceListing.aggregate([
        { $match: { seller_id: { $in: userIds } } },
        { $group: { _id: "$seller_id", count: { $sum: 1 } } }
      ]),
      MarketplaceOrder.aggregate([
        { $match: { seller_id: { $in: userIds }, sale_status: "SALE_CONFIRMED" } },
        { $group: { _id: "$seller_id", count: { $sum: 1 } } }
      ])
    ]);

    const presMap = new Map(presCounts.map(item => [item._id.toString(), item.count]));
    const listingMap = new Map(listingCounts.map(item => [item._id.toString(), item.count]));
    const salesMap = new Map(salesCounts.map(item => [item._id.toString(), item.count]));

    const formatted = users.map(u => ({
      ...u,
      id: u._id.toString(),
      presentations_count: presMap.get(u._id.toString()) || 0,
      listings_count: listingMap.get(u._id.toString()) || 0,
      confirmed_sales_count: salesMap.get(u._id.toString()) || 0
    }));

    res.json({
      users: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch users." });
  }
});

// Suspend or Reactivate Account
router.patch("/users/:id/status", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { is_active, reason } = req.body;
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ detail: "Invalid user ID." });
      return;
    }

    if (id === req.auth!.userId) {
      res.status(400).json({ detail: "You cannot change your own account status." });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ detail: "User not found." });
      return;
    }

    targetUser.is_active = Boolean(is_active);
    await targetUser.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      is_active ? "REACTIVATE_USER" : "SUSPEND_USER",
      "user",
      id,
      { previous_status: !is_active, new_status: is_active },
      reason
    );

    res.json({
      message: `User ${targetUser.email} has been ${is_active ? "reactivated" : "suspended"}.`,
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        is_active: targetUser.is_active
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update user status." });
  }
});

// Change User Role
router.patch("/users/:id/role", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { role, reason } = req.body;
    const admin = req.auth!.user!;

    const allowed = ["student", "teacher", "researcher", "professional", "admin"];
    if (!allowed.includes(role)) {
      res.status(400).json({ detail: `Invalid role. Allowed: ${allowed.join(", ")}` });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ detail: "User not found." });
      return;
    }

    const prevRole = targetUser.role;
    targetUser.role = role as any;
    targetUser.is_admin = role === "admin";
    await targetUser.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "CHANGE_USER_ROLE",
      "user",
      id,
      { previous_role: prevRole, new_role: role },
      reason
    );

    res.json({
      message: `Role for ${targetUser.email} updated to ${role}.`,
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        role: targetUser.role,
        is_admin: targetUser.is_admin
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update user role." });
  }
});

// ==============================================================================
// 3. PRESENTATION MANAGEMENT (Part 12.C)
// ==============================================================================
router.get("/presentations", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, source_type, visibility, page = "1", limit = "20" } = req.query;
    const filter: any = {};

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    if (source_type && typeof source_type === "string" && source_type !== "all") {
      filter.source_type = source_type;
    }

    if (visibility && typeof visibility === "string" && visibility !== "all") {
      filter.visibility = visibility;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Presentation.countDocuments(filter);
    const presentations = await Presentation.find(filter)
      .populate("user_id", "name email role")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formatted = presentations.map(p => ({
      ...p,
      id: p._id.toString(),
      owner_name: (p.user_id as any)?.name || "Guest / Anonymous",
      owner_email: (p.user_id as any)?.email || "N/A",
      slides_count: p.slides ? p.slides.length : p.slide_count
    }));

    res.json({
      presentations: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch presentations." });
  }
});

// Moderate / Remove presentation
router.delete("/presentations/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { reason } = req.body;
    const admin = req.auth!.user!;

    const presentation = await Presentation.findById(id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    await Presentation.findByIdAndDelete(id);

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "MODERATE_DELETE_PRESENTATION",
      "presentation",
      id,
      { title: presentation.title },
      reason
    );

    res.json({ message: `Presentation "${presentation.title}" removed by administrator.` });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to moderate presentation." });
  }
});

// ==============================================================================
// 4. MARKETPLACE APPROVAL CENTER (Part 12.E)
// ==============================================================================

// List Marketplace Listings with status filter
router.get("/marketplace/listings", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = {};

    if (status && typeof status === "string" && status !== "ALL") {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await MarketplaceListing.countDocuments(filter);
    const listings = await MarketplaceListing.find(filter)
      .populate("seller_id", "name email role seller_payment_info")
      .populate("approved_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formatted = listings.map(l => ({
      ...l,
      id: l._id.toString(),
      seller_name: (l.seller_id as any)?.name || "Unknown Seller",
      seller_email: (l.seller_id as any)?.email || "N/A",
      seller_payment_info: (l.seller_id as any)?.seller_payment_info || {}
    }));

    res.json({
      listings: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch marketplace listings." });
  }
});

// Approve Listing
router.post("/marketplace/listings/:id/approve", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const admin = req.auth!.user!;

    const listing = await MarketplaceListing.findById(id);
    if (!listing) {
      res.status(404).json({ detail: "Listing not found." });
      return;
    }

    listing.status = "APPROVED";
    listing.approved_at = new Date();
    listing.approved_by = admin._id;
    listing.rejection_reason = null;
    await listing.save();

    // If linked to an existing presentation, mark it public and for sale
    if (listing.presentation_id) {
      await Presentation.findByIdAndUpdate(listing.presentation_id, {
        $set: {
          visibility: "public",
          "marketplace.is_for_sale": true,
          "marketplace.price": listing.price_pkr,
          "marketplace.published_at": new Date()
        }
      });
    }

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "APPROVE_LISTING",
      "listing",
      id,
      { title: listing.title, price_pkr: listing.price_pkr }
    );

    res.json({
      message: `Listing "${listing.title}" is now APPROVED and live in the Marketplace!`,
      listing: { ...listing.toObject(), id: listing._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to approve listing." });
  }
});

// Reject Listing
router.post("/marketplace/listings/:id/reject", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { reason } = req.body;
    const admin = req.auth!.user!;

    if (!reason || !reason.trim()) {
      res.status(400).json({ detail: "Rejection reason is required." });
      return;
    }

    const listing = await MarketplaceListing.findById(id);
    if (!listing) {
      res.status(404).json({ detail: "Listing not found." });
      return;
    }

    listing.status = "REJECTED";
    listing.rejection_reason = reason.trim();
    await listing.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "REJECT_LISTING",
      "listing",
      id,
      { title: listing.title },
      reason.trim()
    );

    res.json({
      message: `Listing "${listing.title}" has been rejected.`,
      listing: { ...listing.toObject(), id: listing._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to reject listing." });
  }
});

// ==============================================================================
// 5. 5% COMMISSION VERIFICATION (Part 9 & Part 12.E)
// ==============================================================================

// List Commission Submissions & Obligations
router.get("/marketplace/commissions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = {
      sale_status: "SALE_CONFIRMED"
    };

    if (status && typeof status === "string" && status !== "ALL") {
      filter.commission_status = status;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await MarketplaceOrder.countDocuments(filter);
    const orders = await MarketplaceOrder.find(filter)
      .populate("seller_id", "name email seller_payment_info")
      .populate("buyer_id", "name email")
      .populate("commission_verified_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formatted = orders.map(o => ({
      ...o,
      id: o._id.toString(),
      seller_name: (o.seller_id as any)?.name || "Unknown Seller",
      seller_email: (o.seller_id as any)?.email || "N/A",
      buyer_name: (o.buyer_id as any)?.name || "Unknown Buyer",
      buyer_email: (o.buyer_id as any)?.email || "N/A"
    }));

    res.json({
      commissions: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch commissions." });
  }
});

// Verify 5% Commission Payment -> Mark COMMISSION_PAID
router.post("/marketplace/commissions/:orderId/verify", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req.params.orderId);
    const admin = req.auth!.user!;

    const order = await MarketplaceOrder.findById(orderId);
    if (!order) {
      res.status(404).json({ detail: "Order not found." });
      return;
    }

    order.commission_status = "COMMISSION_PAID";
    order.commission_verified_at = new Date();
    order.commission_verified_by = admin._id;
    order.commission_rejection_reason = null;
    await order.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "VERIFY_COMMISSION_PAID",
      "order",
      orderId,
      {
        sale_price_pkr: order.sale_price_pkr,
        platform_commission_pkr: order.platform_commission_pkr,
        commission_payment_ref: order.commission_payment_ref
      }
    );

    res.json({
      message: `Commission of PKR ${order.platform_commission_pkr} verified and marked as PAID!`,
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to verify commission." });
  }
});

// Reject Commission Proof
router.post("/marketplace/commissions/:orderId/reject", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req.params.orderId);
    const { reason } = req.body;
    const admin = req.auth!.user!;

    if (!reason || !reason.trim()) {
      res.status(400).json({ detail: "Rejection reason is required." });
      return;
    }

    const order = await MarketplaceOrder.findById(orderId);
    if (!order) {
      res.status(404).json({ detail: "Order not found." });
      return;
    }

    order.commission_status = "COMMISSION_REJECTED";
    order.commission_rejection_reason = reason.trim();
    await order.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "REJECT_COMMISSION_PROOF",
      "order",
      orderId,
      { platform_commission_pkr: order.platform_commission_pkr },
      reason.trim()
    );

    res.json({
      message: `Commission payment rejected. Seller has been notified to resubmit valid evidence.`,
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to reject commission." });
  }
});

// ==============================================================================
// 6. DISPUTE RESOLUTION (Part 9 & Part 12.E)
// ==============================================================================
router.get("/marketplace/disputes", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const disputes = await MarketplaceOrder.find({
      $or: [{ sale_status: "DISPUTED" }, { dispute_status: "OPEN" }]
    })
      .populate("seller_id", "name email")
      .populate("buyer_id", "name email")
      .sort({ created_at: -1 })
      .lean();

    res.json({
      disputes: disputes.map(d => ({
        ...d,
        id: d._id.toString(),
        seller_name: (d.seller_id as any)?.name,
        seller_email: (d.seller_id as any)?.email,
        buyer_name: (d.buyer_id as any)?.name,
        buyer_email: (d.buyer_id as any)?.email
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch disputes." });
  }
});

router.post("/marketplace/disputes/:orderId/resolve", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req.params.orderId);
    const { resolution, notes, authorize_download } = req.body;
    const admin = req.auth!.user!;

    const order = await MarketplaceOrder.findById(orderId);
    if (!order) {
      res.status(404).json({ detail: "Order not found." });
      return;
    }

    order.dispute_status = "RESOLVED";
    order.dispute_resolution_notes = notes || `Resolved as ${resolution}`;

    if (resolution === "confirm_sale" || authorize_download) {
      order.sale_status = "SALE_CONFIRMED";
      order.is_download_authorized = true;
    } else if (resolution === "cancel_sale") {
      order.sale_status = "CANCELLED";
      order.is_download_authorized = false;
    }

    await order.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "RESOLVE_DISPUTE",
      "order",
      orderId,
      { resolution, authorize_download },
      notes
    );

    res.json({
      message: `Dispute resolved successfully.`,
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to resolve dispute." });
  }
});

// ==============================================================================
// 7. PLATFORM PAYMENT SETTINGS (Part 9 & Part 12.E)
// ==============================================================================
router.get("/platform-settings", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch platform settings." });
  }
});

router.put("/platform-settings", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      payment_provider,
      account_title,
      platform_payment_number,
      bank_details,
      payment_instructions,
      support_contact,
      commission_percentage
    } = req.body;
    const admin = req.auth!.user!;

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings({});
    }

    if (payment_provider) settings.payment_provider = payment_provider.trim();
    if (account_title) settings.account_title = account_title.trim();
    if (platform_payment_number) settings.platform_payment_number = platform_payment_number.trim();
    if (bank_details) settings.bank_details = bank_details.trim();
    if (payment_instructions) settings.payment_instructions = payment_instructions.trim();
    if (support_contact) settings.support_contact = support_contact.trim();
    if (commission_percentage !== undefined) {
      settings.commission_percentage = Math.max(0, Math.min(50, Number(commission_percentage)));
    }
    settings.updated_by = admin._id;
    settings.updated_at = new Date();

    await settings.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "UPDATE_PLATFORM_SETTINGS",
      "settings",
      settings._id.toString(),
      { platform_payment_number: settings.platform_payment_number, commission_percentage: settings.commission_percentage }
    );

    res.json({
      message: "Platform payment settings updated successfully.",
      settings
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update platform settings." });
  }
});

// ==============================================================================
// 8. SUBSCRIPTION MANAGEMENT (Part 12.F)
// ==============================================================================
router.get("/subscriptions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({
      "subscription.plan": { $in: ["student", "pro", "team", "free"] }
    })
      .select("name email role subscription ai_credits created_at")
      .sort({ "subscription.amount_paid": -1, created_at: -1 })
      .lean();

    const planSummary = {
      free: users.filter(u => u.subscription?.plan === "free").length,
      student: users.filter(u => u.subscription?.plan === "student").length,
      pro: users.filter(u => u.subscription?.plan === "pro").length,
      team: users.filter(u => u.subscription?.plan === "team").length,
      active_total: users.filter(u => u.subscription?.status === "active").length,
      total_subscription_revenue_usd: users.reduce((acc, curr) => acc + (curr.subscription?.amount_paid || 0), 0)
    };

    res.json({
      summary: planSummary,
      subscriptions: users.map(u => ({
        user_id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        plan: u.subscription?.plan || "free",
        status: u.subscription?.status || "free",
        amount_paid: u.subscription?.amount_paid || 0,
        currency: u.subscription?.currency || "USD",
        credits_remaining: u.ai_credits?.remaining || 0,
        registered_at: u.created_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch subscriptions." });
  }
});

// ==============================================================================
// 9. SYSTEM HEALTH MONITOR (Part 12.H)
// ==============================================================================
router.get("/system-health", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const health: any = {
      timestamp: new Date().toISOString(),
      node_gateway: { status: "ONLINE", port: config.port, uptime_seconds: Math.floor(process.uptime()) },
      mongodb: { status: "ONLINE", readyState: "CONNECTED" },
      python_ai_service: { status: "UNKNOWN" },
      unsplash_api: { configured: unsplashService.isConfigured() }
    };

    // Check Python AI Service across candidate ports (8002 primary, 8001 fallback)
    const candidateUrls = [...new Set([config.pythonAiServiceUrl, "http://127.0.0.1:8002", "http://127.0.0.1:8001"])];
    let pyHealthy = false;
    for (const url of candidateUrls) {
      try {
        const pyRes = await axios.get(`${url}/api/health`, { timeout: 3000 });
        if (pyRes.status === 200) {
          health.python_ai_service = {
            status: "ONLINE",
            url,
            response: pyRes.data
          };
          pyHealthy = true;
          break;
        }
      } catch {
        // try next candidate
      }
    }
    if (!pyHealthy) {
      health.python_ai_service = {
        status: "OFFLINE",
        url: config.pythonAiServiceUrl,
        error: "Python AI Service is currently unreachable."
      };
    }

    res.json(health);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to check system health." });
  }
});

// ==============================================================================
// 10. AUDIT LOGS (Part 12.E & Part 13)
// ==============================================================================
router.get("/audit-logs", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find({})
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    res.json({
      audit_logs: logs.map(l => ({ ...l, id: l._id.toString() }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch audit logs." });
  }
});

// ==============================================================================
// 11. MANUAL SUBSCRIPTION PAYMENT APPROVALS (Part 10 & Part 12.F)
// ==============================================================================
router.get("/subscription-payments", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = {};
    if (status && status !== "all") {
      filter.payment_status = status;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await SubscriptionPayment.countDocuments(filter);
    const payments = await SubscriptionPayment.find(filter)
      .populate("user_id", "name email role")
      .populate("verified_by", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      payments: payments.map(p => ({
        ...p,
        id: p._id.toString(),
        user_name: (p.user_id as any)?.name || "Registered User",
        user_email: (p.user_id as any)?.email || "N/A",
        payer_name: p.payer_name || (p.user_id as any)?.name || "Unspecified",
        payer_account: p.payer_account || null
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch subscription payments." });
  }
});

router.post("/subscription-payments/:id/verify", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Subscription payment not found." });
      return;
    }

    const payment = await SubscriptionPayment.findById(id);
    if (!payment) {
      res.status(404).json({ detail: "Subscription payment not found." });
      return;
    }

    const user = await User.findById(payment.user_id);
    if (!user) {
      res.status(404).json({ detail: "Subscribing user not found in database." });
      return;
    }

    const PLAN_CREDIT_MAP: Record<string, number> = {
      student: 50,
      pro: 200,
      team: 500
    };

    const creditsToAdd = PLAN_CREDIT_MAP[payment.plan] || 20;

    // 1. Update user subscription and AI credits
    user.subscription.plan = payment.plan;
    user.subscription.status = "active";
    user.subscription.amount_paid = (user.subscription.amount_paid || 0) + (payment.amount_pkr || 0);
    user.subscription.currency = payment.currency || "PKR";
    user.subscription.renews_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.ai_credits.total_granted += creditsToAdd;
    user.ai_credits.remaining += creditsToAdd;
    await user.save();

    // 2. Mark payment approved
    payment.payment_status = "APPROVED";
    payment.verified_by = admin._id;
    payment.verified_at = new Date();
    payment.paid_at = new Date();
    await payment.save();

    // 3. Log audit trail
    await recordAudit(
      admin._id.toString(),
      admin.email,
      "APPROVE_SUBSCRIPTION_PAYMENT",
      "subscription_payment",
      payment._id.toString(),
      {
        plan: payment.plan,
        amount_pkr: payment.amount_pkr,
        user_email: user.email,
        credits_granted: creditsToAdd
      }
    );

    res.json({
      message: `Subscription payment approved! User upgraded to ${payment.plan.toUpperCase()} with +${creditsToAdd} AI credits.`,
      payment: { ...payment.toObject(), id: payment._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to verify subscription payment." });
  }
});

router.post("/subscription-payments/:id/reject", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { reason } = req.body;
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Subscription payment not found." });
      return;
    }

    const payment = await SubscriptionPayment.findById(id);
    if (!payment) {
      res.status(404).json({ detail: "Subscription payment not found." });
      return;
    }

    payment.payment_status = "REJECTED";
    payment.rejection_reason = reason || "Payment proof not verified or transaction invalid.";
    payment.verified_by = admin._id;
    payment.verified_at = new Date();
    await payment.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "REJECT_SUBSCRIPTION_PAYMENT",
      "subscription_payment",
      payment._id.toString(),
      { reason: payment.rejection_reason }
    );

    res.json({
      message: "Subscription payment rejected.",
      payment: { ...payment.toObject(), id: payment._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to reject subscription payment." });
  }
});

// ==============================================================================
// 12. FREEMIUM TEMPLATES MANAGEMENT (Part 11 & Part 12)
// ==============================================================================
router.get("/templates", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, access_type, page = "1", limit = "50" } = req.query;
    const filter: any = {};
    if (category && category !== "all") filter.category = category;
    if (access_type && access_type !== "all") filter.access_type = access_type;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const total = await Template.countDocuments(filter);
    const templates = await Template.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      templates: templates.map(t => ({ ...t, id: t._id.toString() })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch admin templates." });
  }
});

router.post("/templates", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.auth!.user!;
    const {
      title,
      description,
      category,
      cover_image,
      access_type,
      price_pkr,
      price_usd,
      slides,
      tags,
      is_featured
    } = req.body;

    if (!title || !description || !category) {
      res.status(400).json({ detail: "Title, description, and category are required." });
      return;
    }

    const template = new Template({
      title: title.trim(),
      description: description.trim(),
      category,
      cover_image: cover_image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      access_type: access_type || "FREE",
      price_pkr: access_type === "PREMIUM" ? Number(price_pkr) || 500 : 0,
      price_usd: access_type === "PREMIUM" ? Number(price_usd) || 2 : 0,
      applicable_plans: access_type === "PLAN_INCLUDED" ? ["student", "pro", "team"] : ["free", "student", "pro", "team"],
      slides: Array.isArray(slides) && slides.length > 0 ? slides : [
        {
          slide_number: 1,
          title: "Introduction",
          content: ["Key topic highlight", "Executive summary"],
          layout_type: "title_and_body"
        }
      ],
      slide_count: Array.isArray(slides) ? slides.length : 1,
      tags: Array.isArray(tags) ? tags : [],
      is_published: true,
      is_featured: !!is_featured,
      created_by: admin._id
    });

    await template.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "CREATE_TEMPLATE",
      "template",
      template._id.toString(),
      { title: template.title, category: template.category, access_type: template.access_type }
    );

    res.status(201).json({
      message: "Template created successfully.",
      template: { ...template.toObject(), id: template._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to create template." });
  }
});

router.put("/templates/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const {
      title,
      description,
      category,
      cover_image,
      access_type,
      price_pkr,
      price_usd,
      is_published,
      is_featured,
      slides,
      tags
    } = req.body;

    if (title) template.title = title.trim();
    if (description) template.description = description.trim();
    if (category) template.category = category;
    if (cover_image) template.cover_image = cover_image;
    if (access_type) template.access_type = access_type;
    if (price_pkr !== undefined) template.price_pkr = Number(price_pkr);
    if (price_usd !== undefined) template.price_usd = Number(price_usd);
    if (is_published !== undefined) template.is_published = !!is_published;
    if (is_featured !== undefined) template.is_featured = !!is_featured;
    if (Array.isArray(slides)) {
      template.slides = slides;
      template.slide_count = slides.length;
    }
    if (Array.isArray(tags)) template.tags = tags;

    await template.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "UPDATE_TEMPLATE",
      "template",
      template._id.toString(),
      { title: template.title, is_published: template.is_published }
    );

    res.json({
      message: "Template updated successfully.",
      template: { ...template.toObject(), id: template._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update template." });
  }
});

router.delete("/templates/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const template = await Template.findByIdAndDelete(id);
    if (!template) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "DELETE_TEMPLATE",
      "template",
      id,
      { title: template.title }
    );

    res.json({ message: "Template deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to delete template." });
  }
});

// Template Purchases
router.get("/template-purchases", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const filter: any = {};
    if (status && status !== "all") filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await TemplatePurchase.countDocuments(filter);
    const purchases = await TemplatePurchase.find(filter)
      .populate("user_id", "name email")
      .populate("template_id", "title category access_type price_pkr")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      purchases: purchases.map(p => ({
        ...p,
        id: p._id.toString(),
        user_name: (p.user_id as any)?.name || "Registered User",
        user_email: (p.user_id as any)?.email || "N/A",
        payer_name: p.payer_name || (p.user_id as any)?.name || "Unspecified",
        payer_account: p.payer_account || null
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch template purchases." });
  }
});

router.post("/template-purchases/:id/verify", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template purchase record not found." });
      return;
    }

    const purchase = await TemplatePurchase.findById(id);
    if (!purchase) {
      res.status(404).json({ detail: "Template purchase record not found." });
      return;
    }

    purchase.status = "APPROVED";
    purchase.verified_by = admin._id;
    purchase.verified_at = new Date();
    await purchase.save();

    await Template.findByIdAndUpdate(purchase.template_id, {
      $inc: { purchase_count: 1 }
    });

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "APPROVE_TEMPLATE_PURCHASE",
      "template_purchase",
      purchase._id.toString(),
      { template_id: purchase.template_id, price_pkr: purchase.price_pkr }
    );

    res.json({
      message: "Template purchase approved. Template is now unlocked for user.",
      purchase: { ...purchase.toObject(), id: purchase._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to verify template purchase." });
  }
});

router.post("/template-purchases/:id/reject", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { reason } = req.body;
    const admin = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template purchase record not found." });
      return;
    }

    const purchase = await TemplatePurchase.findById(id);
    if (!purchase) {
      res.status(404).json({ detail: "Template purchase record not found." });
      return;
    }

    purchase.status = "REJECTED";
    purchase.rejection_reason = reason || "Payment reference could not be verified.";
    purchase.verified_by = admin._id;
    purchase.verified_at = new Date();
    await purchase.save();

    await recordAudit(
      admin._id.toString(),
      admin.email,
      "REJECT_TEMPLATE_PURCHASE",
      "template_purchase",
      purchase._id.toString(),
      { reason: purchase.rejection_reason }
    );

    res.json({
      message: "Template purchase rejected.",
      purchase: { ...purchase.toObject(), id: purchase._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to reject template purchase." });
  }
});

// ==============================================================================
// 13. CSV EXPORTS (Part 13)
// ==============================================================================
router.get("/export/users.csv", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).sort({ created_at: -1 }).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="presentai_users.csv"');

    let csv = "ID,Name,Email,Role,IsAdmin,Plan,SubscriptionStatus,AICreditsRemaining,CreatedAt\n";
    for (const u of users) {
      csv += `"${u._id}","${(u.name || "").replace(/"/g, '""')}","${u.email}","${u.role}","${!!u.is_admin}","${u.subscription?.plan || "free"}","${u.subscription?.status || "free"}","${u.ai_credits?.remaining ?? 0}","${u.created_at ? new Date(u.created_at).toISOString() : ""}"\n`;
    }
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to export users CSV." });
  }
});

router.get("/export/orders.csv", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await MarketplaceOrder.find({}).sort({ created_at: -1 }).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="presentai_marketplace_orders.csv"');

    let csv = "OrderID,ListingID,SellerID,BuyerID,ListingTitle,SalePricePKR,CommissionPKR,SaleStatus,CommissionStatus,CreatedAt\n";
    for (const o of orders) {
      csv += `"${o._id}","${o.listing_id || ""}","${o.seller_id}","${o.buyer_id}","${(o.title || "").replace(/"/g, '""')}","${o.sale_price_pkr}","${o.platform_commission_pkr}","${o.sale_status}","${o.commission_status}","${o.created_at ? new Date(o.created_at).toISOString() : ""}"\n`;
    }
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to export orders CSV." });
  }
});

router.get("/export/subscriptions.csv", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payments = await SubscriptionPayment.find({}).sort({ created_at: -1 }).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="presentai_subscriptions.csv"');

    let csv = "PaymentID,UserID,Plan,GrossUSD,AmountPKR,TransactionRef,Status,PaymentMethod,CreatedAt\n";
    for (const p of payments) {
      csv += `"${p._id}","${p.user_id}","${p.plan}","${p.gross_amount}","${p.amount_pkr || 0}","${p.transaction_ref || ""}","${p.payment_status}","${p.payment_method || "NayaPay"}","${p.created_at ? new Date(p.created_at).toISOString() : ""}"\n`;
    }
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to export subscriptions CSV." });
  }
});

router.get("/export/commissions.csv", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await MarketplaceOrder.find({
      commission_status: { $in: ["COMMISSION_PAID", "COMMISSION_SUBMITTED", "COMMISSION_UNDER_REVIEW"] }
    }).sort({ created_at: -1 }).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="presentai_5percent_commissions.csv"');

    let csv = "OrderID,ListingTitle,SalePricePKR,PlatformCommissionPKR,Status,TransactionRef,CreatedAt\n";
    for (const o of orders) {
      csv += `"${o._id}","${(o.title || "").replace(/"/g, '""')}","${o.sale_price_pkr}","${o.platform_commission_pkr}","${o.commission_status}","${o.commission_payment_ref || ""}","${o.created_at ? new Date(o.created_at).toISOString() : ""}"\n`;
    }
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to export commissions CSV." });
  }
});

// ==============================================================================
// 14. REAL DATABASE ANALYTICS TRENDS (Part 13)
// ==============================================================================
router.get("/analytics/trends", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [userTrends, presTrends, orderTrends] = await Promise.all([
      User.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Presentation.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      MarketplaceOrder.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            order_count: { $sum: 1 },
            gross_pkr: { $sum: { $cond: [{ $eq: ["$sale_status", "SALE_CONFIRMED"] }, "$sale_price_pkr", 0] } },
            commission_pkr: { $sum: { $cond: [{ $eq: ["$commission_status", "COMMISSION_PAID"] }, "$platform_commission_pkr", 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      timeframe_days: 30,
      user_registrations: userTrends.map(t => ({ date: t._id, count: t.count })),
      presentations_created: presTrends.map(t => ({ date: t._id, count: t.count })),
      marketplace_activity: orderTrends.map(t => ({
        date: t._id,
        orders: t.order_count,
        gross_sales_pkr: t.gross_pkr,
        commission_pkr: t.commission_pkr
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch analytics trends." });
  }
});

export default router;
