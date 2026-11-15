import { Router, Response } from "express";
import { Types } from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Presentation } from "../models/Presentation.js";
import { MarketplaceListing } from "../models/MarketplaceListing.js";
import { MarketplaceOrder } from "../models/MarketplaceOrder.js";
import { MarketplaceTransaction } from "../models/MarketplaceTransaction.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { User } from "../models/User.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { fastApiService } from "../services/fastapi.service.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// Ensure upload directories exist
const uploadBaseDir = path.resolve(process.cwd(), "uploads");
const marketplaceUploadDir = path.join(uploadBaseDir, "marketplace");
const receiptUploadDir = path.join(uploadBaseDir, "receipts");

fs.mkdirSync(marketplaceUploadDir, { recursive: true });
fs.mkdirSync(receiptUploadDir, { recursive: true });

// Configure Multer for external presentations
const presentationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, marketplaceUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `deck_${Date.now()}_${safeName}`);
  }
});

const uploadPresentation = multer({
  storage: presentationStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pptx" || ext === ".ppt") {
      cb(null, true);
    } else {
      cb(new Error("Only PPT and PPTX presentation files are allowed."));
    }
  }
});

// Configure Multer for commission receipt screenshots
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `receipt_${Date.now()}_${safeName}`);
  }
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image receipts (PNG, JPG, WEBP) or PDF are allowed."));
    }
  }
});

// ==============================================================================
// 1. PUBLIC MARKETPLACE ITEMS (Part 8)
// ==============================================================================
router.get("/items", async (req, res): Promise<void> => {
  try {
    const { search, category, sort = "highest_rated", page = "1", limit = "12" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Fetch approved listings from MarketplaceListing
    const listingFilter: any = {
      status: { $in: ["APPROVED", "ACTIVE"] }
    };

    if (search && typeof search === "string" && search.trim()) {
      listingFilter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { short_description: { $regex: search.trim(), $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } }
      ];
    }

    if (category && typeof category === "string" && category !== "All") {
      listingFilter.category = category;
    }

    let sortObj: any = { sales_count: -1, created_at: -1 };
    if (sort === "newest") {
      sortObj = { created_at: -1 };
    } else if (sort === "price_asc") {
      sortObj = { price_pkr: 1 };
    } else if (sort === "price_desc") {
      sortObj = { price_pkr: -1 };
    } else if (sort === "sales" || sort === "popular") {
      sortObj = { sales_count: -1 };
    }

    const totalListings = await MarketplaceListing.countDocuments(listingFilter);
    const listings = await MarketplaceListing.find(listingFilter)
      .populate("seller_id", "name role seller_payment_info")
      .populate("presentation_id", "average_rating ratings_count slide_count slides")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formattedListings = listings.map(l => {
      const pres = l.presentation_id as any;
      return {
        id: l._id.toString(),
        listing_id: l._id.toString(),
        presentation_id: pres?._id?.toString() || null,
        title: l.title,
        short_description: l.short_description,
        detailed_description: l.detailed_description,
        category: l.category,
        tags: l.tags || [],
        price: l.price_pkr,
        price_pkr: l.price_pkr,
        currency: "PKR",
        seller_name: (l.seller_id as any)?.name || "Creator",
        seller_id: (l.seller_id as any)?._id?.toString() || null,
        seller_role: (l.seller_id as any)?.role || "professional",
        file_type: l.file_type,
        cover_image_url: l.cover_image_url || null,
        sales_count: l.sales_count || 0,
        average_rating: pres?.average_rating || 5.0,
        ratings_count: pres?.ratings_count || 1,
        slides_count: pres?.slides?.length || pres?.slide_count || 6,
        slides: pres?.slides || [],
        slides_preview: (pres?.slides || []).slice(0, 3),
        status: l.status,
        created_at: l.created_at
      };
    });

    // If MarketplaceListing collection has few items, also include legacy public presentations
    if (formattedListings.length === 0 && (!category || category === "All")) {
      const legacyFilter: any = { visibility: "public" };
      if (search && typeof search === "string" && search.trim()) {
        legacyFilter.title = { $regex: search.trim(), $options: "i" };
      }
      const legacyTotal = await Presentation.countDocuments(legacyFilter);
      const legacyItems = await Presentation.find(legacyFilter)
        .populate("user_id", "name role")
        .sort({ average_rating: -1, ratings_count: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const formattedLegacy = legacyItems.map(p => ({
        id: p._id.toString(),
        listing_id: p._id.toString(),
        presentation_id: p._id.toString(),
        title: p.title,
        short_description: p.tone ? `${p.presentation_type || "Presentation"} &bull; ${p.tone} tone` : "Curated Presentation",
        detailed_description: `Professional deck containing ${p.slides?.length || p.slide_count} slides.`,
        category: "General",
        tags: ["Presentation", "Slides"],
        price: p.marketplace?.price || 1000,
        price_pkr: p.marketplace?.price || 1000,
        currency: "PKR",
        seller_name: (p.user_id as any)?.name || "Creator",
        seller_id: p.user_id ? (p.user_id as any)._id?.toString() || p.user_id.toString() : null,
        seller_role: (p.user_id as any)?.role || "professional",
        file_type: "ai_deck",
        cover_image_url: null,
        sales_count: p.marketplace?.sales_count || 0,
        average_rating: p.average_rating || 5.0,
        ratings_count: p.ratings_count || 1,
        slides_count: p.slides?.length || p.slide_count,
        slides: p.slides || [],
        slides_preview: (p.slides || []).slice(0, 3),
        status: "APPROVED",
        created_at: p.created_at
      }));

      res.json({
        items: formattedLegacy,
        total: legacyTotal,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(legacyTotal / limitNum)
      });
      return;
    }

    res.json({
      items: formattedListings,
      total: totalListings,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalListings / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch marketplace items." });
  }
});

// ==============================================================================
// 2. SELLER LISTING CREATION (Part 8)
// ==============================================================================

// Upload external PPT/PPTX file
router.post(
  "/upload-presentation",
  requireAuth,
  uploadPresentation.single("file"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ detail: "Please provide a valid PPT or PPTX presentation file." });
        return;
      }

      res.json({
        message: "Presentation file uploaded and validated successfully.",
        file_path: req.file.path,
        file_name: req.file.originalname,
        file_size_bytes: req.file.size,
        file_type: path.extname(req.file.originalname).toLowerCase() === ".pptx" ? "uploaded_pptx" : "uploaded_ppt"
      });
    } catch (err: any) {
      res.status(500).json({ detail: err.message || "Failed to upload presentation file." });
    }
  }
);

// Create new seller listing (AI-generated or external upload)
router.post("/create-listing", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      presentation_id,
      title,
      short_description,
      detailed_description,
      category,
      tags,
      price_pkr,
      file_path,
      file_name,
      file_size_bytes,
      file_type,
      ownership_confirmed
    } = req.body;

    const sellerId = req.auth!.userId!;

    if (!title || !short_description) {
      res.status(400).json({ detail: "Title and short description are required." });
      return;
    }

    const priceNum = Math.max(0, Number(price_pkr) || 0);
    if (priceNum <= 0) {
      res.status(400).json({ detail: "Selling price in PKR must be greater than 0." });
      return;
    }

    if (!ownership_confirmed) {
      res.status(400).json({ detail: "You must confirm ownership and copyright clearance to sell this presentation." });
      return;
    }

    let presId: Types.ObjectId | null = null;
    let effectiveFileType: "ai_deck" | "uploaded_pptx" | "uploaded_ppt" = "ai_deck";

    if (presentation_id) {
      if (!Types.ObjectId.isValid(presentation_id)) {
        res.status(400).json({ detail: "Invalid presentation ID." });
        return;
      }
      const existingPres = await Presentation.findOne({
        _id: new Types.ObjectId(presentation_id),
        user_id: new Types.ObjectId(sellerId)
      });
      if (!existingPres) {
        res.status(404).json({ detail: "Presentation not found or you are not the owner." });
        return;
      }
      presId = existingPres._id;
      effectiveFileType = "ai_deck";
    } else if (file_path) {
      effectiveFileType = file_type || "uploaded_pptx";
    } else {
      res.status(400).json({ detail: "Either an existing presentation ID or an uploaded presentation file is required." });
      return;
    }

    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const listing = new MarketplaceListing({
      seller_id: new Types.ObjectId(sellerId),
      presentation_id: presId,
      title: title.trim(),
      short_description: short_description.trim(),
      detailed_description: detailed_description || "",
      category: category || "Education",
      tags: tagsArray,
      price_pkr: priceNum,
      file_type: effectiveFileType,
      file_path: file_path || null,
      file_name: file_name || null,
      file_size_bytes: file_size_bytes || 0,
      ownership_confirmed: true,
      status: "PENDING_REVIEW" // Mandatory requirement: new listings enter PENDING_REVIEW
    });

    await listing.save();

    res.status(201).json({
      message: `Listing "${listing.title}" submitted successfully for PENDING_REVIEW! An administrator will review and approve it shortly.`,
      listing: { ...listing.toObject(), id: listing._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to create listing." });
  }
});

// Upload commission receipt screenshot
router.post(
  "/upload-receipt",
  requireAuth,
  uploadReceipt.single("receipt"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ detail: "Please upload an image receipt (PNG, JPG, WEBP) or PDF." });
        return;
      }

      const receiptUrl = `/uploads/receipts/${req.file.filename}`;
      res.json({
        message: "Receipt screenshot uploaded successfully.",
        receipt_url: receiptUrl,
        filename: req.file.filename
      });
    } catch (err: any) {
      res.status(500).json({ detail: err.message || "Failed to upload receipt screenshot." });
    }
  }
);

// ==============================================================================
// 3. BUYER-TO-SELLER PURCHASE & 5% COMMISSION FLOW (Part 9)
// ==============================================================================

// Public Platform Payment Info (for 5% commission)
router.get("/platform-payment-info", async (req, res): Promise<void> => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    res.json({
      payment_provider: settings.payment_provider,
      account_title: settings.account_title,
      platform_payment_number: settings.platform_payment_number,
      bank_details: settings.bank_details,
      payment_instructions: settings.payment_instructions,
      support_contact: settings.support_contact,
      commission_percentage: settings.commission_percentage || 5
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch platform payment info." });
  }
});

// Buyer initiates purchase of a listing
router.post(["/buy/:id", "/orders/create"], requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id || req.body.listing_id || req.body.presentation_id;
    const buyerId = req.auth!.userId!;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ detail: "Valid listing ID or presentation ID is required." });
      return;
    }

    let listing = await MarketplaceListing.findById(id).populate("seller_id", "name email seller_payment_info");
    let presentation: any = null;

    if (!listing) {
      presentation = await Presentation.findById(id).populate("user_id", "name email seller_payment_info");
      if (!presentation) {
        res.status(404).json({ detail: "Presentation or listing not found." });
        return;
      }
    }

    const sellerId = listing ? listing.seller_id._id.toString() : presentation.user_id?._id?.toString() || presentation.user_id?.toString();
    if (sellerId === buyerId) {
      res.status(400).json({ detail: "You cannot purchase your own presentation." });
      return;
    }

    const title = listing ? listing.title : presentation.title;
    const pricePkr = listing ? listing.price_pkr : presentation.marketplace?.price || 1000;

    // Part 9 formula: platform_commission = sale_price * 0.05, seller_net = sale_price - platform_commission
    const commissionPkr = Math.round(pricePkr * 0.05 * 100) / 100;
    const sellerNetPkr = Math.round((pricePkr - commissionPkr) * 100) / 100;

    const sellerUser = (listing ? listing.seller_id : presentation.user_id) as any;
    const sellerPaymentInfo = sellerUser?.seller_payment_info || {
      payment_method: "Easypaisa / JazzCash / Bank",
      account_title: sellerUser?.name || "Seller",
      account_number: "Provided in order notes",
      instructions: "Transfer the amount directly to the seller."
    };

    const order = new MarketplaceOrder({
      listing_id: listing ? listing._id : null,
      presentation_id: presentation ? presentation._id : listing?.presentation_id || null,
      title,
      seller_id: new Types.ObjectId(sellerId),
      buyer_id: new Types.ObjectId(buyerId),
      sale_price_pkr: pricePkr,
      platform_commission_pkr: commissionPkr,
      seller_net_pkr: sellerNetPkr,
      currency: "PKR",
      sale_status: "SALE_PENDING",
      commission_status: "COMMISSION_DUE",
      is_download_authorized: false
    });

    await order.save();

    res.status(201).json({
      message: `Purchase initiated for "${title}"! Please transfer PKR ${pricePkr} directly to the seller.`,
      order_id: order._id.toString(),
      order: { ...order.toObject(), id: order._id.toString() },
      seller: {
        name: sellerUser?.name || "Seller",
        payment_info: sellerPaymentInfo
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to initiate purchase." });
  }
});

// Buyer confirms direct payment to seller
router.post("/orders/:id/buyer-confirm", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { payment_method, transaction_ref, notes } = req.body;
    const buyerId = req.auth!.userId!;

    const order = await MarketplaceOrder.findOne({
      _id: new Types.ObjectId(id),
      buyer_id: new Types.ObjectId(buyerId)
    });

    if (!order) {
      res.status(404).json({ detail: "Order not found or you are not the buyer." });
      return;
    }

    order.buyer_payment_method = payment_method || "Direct Transfer";
    order.buyer_transaction_ref = transaction_ref || null;
    order.buyer_payment_proof = notes || null;
    order.buyer_confirmed_at = new Date();
    await order.save();

    res.json({
      message: "Payment confirmation recorded! The seller has been notified to verify your payment.",
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to confirm payment." });
  }
});

// Seller confirms receipt of payment from buyer -> SALE_CONFIRMED & unlocks download
router.post("/orders/:id/seller-confirm", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const sellerId = req.auth!.userId!;

    const order = await MarketplaceOrder.findOne({
      _id: new Types.ObjectId(id),
      seller_id: new Types.ObjectId(sellerId)
    });

    if (!order) {
      res.status(404).json({ detail: "Order not found or you are not the seller." });
      return;
    }

    order.sale_status = "SALE_CONFIRMED";
    order.seller_confirmed_at = new Date();
    order.is_download_authorized = true;
    order.commission_status = "COMMISSION_DUE";

    // If presentation is an AI deck, clone it to buyer's library so they can view and practice
    if (order.presentation_id) {
      const origPres = await Presentation.findById(order.presentation_id);
      if (origPres) {
        const cloned = new Presentation({
          user_id: order.buyer_id,
          title: `${origPres.title} (Purchased)`,
          source_type: origPres.source_type,
          source_name: origPres.source_name,
          language: origPres.language,
          audience: origPres.audience,
          presentation_type: origPres.presentation_type,
          tone: origPres.tone,
          slide_count: origPres.slide_count,
          status: "ready",
          visibility: "private",
          slides: origPres.slides
        });
        await cloned.save();
        order.cloned_deck_id = cloned._id;
      }
    }

    await order.save();

    // Increment sales count on listing
    if (order.listing_id) {
      await MarketplaceListing.findByIdAndUpdate(order.listing_id, {
        $inc: { sales_count: 1 }
      });
    }

    res.json({
      message: `Sale confirmed! PKR ${order.sale_price_pkr} acknowledged. Buyer can now download the presentation. Please submit the 5% platform commission (PKR ${order.platform_commission_pkr}) to the platform.`,
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to confirm sale." });
  }
});

// Seller submits 5% platform commission evidence
router.post("/orders/:id/submit-commission", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { transaction_ref, receipt_url } = req.body;
    const sellerId = req.auth!.userId!;

    if (!transaction_ref && !receipt_url) {
      res.status(400).json({ detail: "Transaction reference or receipt screenshot is required." });
      return;
    }

    const order = await MarketplaceOrder.findOne({
      _id: new Types.ObjectId(id),
      seller_id: new Types.ObjectId(sellerId)
    });

    if (!order) {
      res.status(404).json({ detail: "Order not found or you are not the seller." });
      return;
    }

    if (order.sale_status !== "SALE_CONFIRMED") {
      res.status(400).json({ detail: "Commission can only be submitted for confirmed sales." });
      return;
    }

    order.commission_status = "COMMISSION_SUBMITTED";
    order.commission_payment_ref = transaction_ref || null;
    order.commission_receipt_url = receipt_url || null;
    order.commission_submitted_at = new Date();
    order.commission_rejection_reason = null;
    await order.save();

    res.json({
      message: `Commission of PKR ${order.platform_commission_pkr} submitted for verification. An administrator will verify receipt.`,
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit commission." });
  }
});

// Raise a dispute on an order (Buyer or Seller)
router.post("/orders/:id/dispute", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const { reason } = req.body;
    const userId = req.auth!.userId!;

    if (!reason || !reason.trim()) {
      res.status(400).json({ detail: "Dispute reason is required." });
      return;
    }

    const order = await MarketplaceOrder.findOne({
      _id: new Types.ObjectId(id),
      $or: [{ buyer_id: new Types.ObjectId(userId) }, { seller_id: new Types.ObjectId(userId) }]
    });

    if (!order) {
      res.status(404).json({ detail: "Order not found or you are not a party to this transaction." });
      return;
    }

    order.sale_status = "DISPUTED";
    order.dispute_status = "OPEN";
    order.dispute_reason = reason.trim();
    await order.save();

    res.json({
      message: "Dispute submitted to administration for review.",
      order: { ...order.toObject(), id: order._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to raise dispute." });
  }
});

// ==============================================================================
// 4. AUTHORIZED FILE DOWNLOAD (Part 11 & Part 13)
// ==============================================================================
router.get("/orders/:id/download", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const userId = req.auth!.userId!;
    const user = req.auth!.user! as any;

    const order = await MarketplaceOrder.findById(id);
    if (!order) {
      res.status(404).json({ detail: "Order not found." });
      return;
    }

    // Strict access control: only authorized buyer or admin can download
    const isBuyer = order.buyer_id.toString() === userId;
    const isAdmin = user.role === "admin" || user.is_admin === true;

    if (!isBuyer && !isAdmin) {
      res.status(403).json({ detail: "Unauthorized. You did not purchase this presentation." });
      return;
    }

    if (!order.is_download_authorized && !isAdmin) {
      res.status(403).json({
        detail: "Download not authorized yet. Sale must be confirmed by the seller first."
      });
      return;
    }

    order.download_count = (order.download_count || 0) + 1;
    await order.save();

    // Check if listing has an external uploaded PPT/PPTX file
    if (order.listing_id) {
      const listing = await MarketplaceListing.findById(order.listing_id);
      if (listing && listing.file_path && fs.existsSync(listing.file_path)) {
        res.download(listing.file_path, listing.file_name || `${order.title}.pptx`);
        return;
      }
    }

    // Otherwise, export the presentation deck as PPTX via Python FastAPI export service
    const presId = order.cloned_deck_id || order.presentation_id;
    if (presId) {
      const pres = await Presentation.findById(presId).lean();
      if (pres) {
        const pptxStream = await fastApiService.exportPresentation("pptx", pres as any);
        const filename = `${order.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        res.send(pptxStream);
        return;
      }
    }

    res.status(404).json({ detail: "Presentation file not found for download." });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to download presentation." });
  }
});

// ==============================================================================
// 5. SELLER DASHBOARD (Part 10)
// ==============================================================================
router.get("/seller-dashboard", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sellerId = new Types.ObjectId(req.auth!.userId!);
    const user = await User.findById(sellerId);

    // 1. Listings
    const listings = await MarketplaceListing.find({ seller_id: sellerId })
      .sort({ created_at: -1 })
      .lean();

    const listingsSummary = {
      total: listings.length,
      pending: listings.filter(l => l.status === "PENDING_REVIEW").length,
      approved: listings.filter(l => l.status === "APPROVED" || l.status === "ACTIVE").length,
      rejected: listings.filter(l => l.status === "REJECTED").length,
      suspended: listings.filter(l => l.status === "SUSPENDED").length
    };

    // 2. Orders/Sales
    const orders = await MarketplaceOrder.find({ seller_id: sellerId })
      .populate("buyer_id", "name email")
      .sort({ created_at: -1 })
      .lean();

    const confirmedOrders = orders.filter(o => o.sale_status === "SALE_CONFIRMED");
    const grossSalesPkr = confirmedOrders.reduce((sum, o) => sum + o.sale_price_pkr, 0);
    const platformCommissionPkr = confirmedOrders.reduce((sum, o) => sum + o.platform_commission_pkr, 0);
    const netEarningsPkr = confirmedOrders.reduce((sum, o) => sum + o.seller_net_pkr, 0);

    const commissionPaidPkr = orders
      .filter(o => o.commission_status === "COMMISSION_PAID")
      .reduce((sum, o) => sum + o.platform_commission_pkr, 0);

    const outstandingCommissionPkr = Math.max(0, platformCommissionPkr - commissionPaidPkr);

    // Platform settings for commission transfer
    let platformSettings = await PlatformSettings.findOne();
    if (!platformSettings) platformSettings = await PlatformSettings.create({});

    res.json({
      listings_summary: listingsSummary,
      financials: {
        total_sales_count: orders.length,
        confirmed_sales_count: confirmedOrders.length,
        gross_sales_pkr: grossSalesPkr,
        platform_commission_pkr: platformCommissionPkr,
        net_seller_earnings_pkr: netEarningsPkr,
        commission_paid_pkr: commissionPaidPkr,
        outstanding_commission_pkr: outstandingCommissionPkr,
        commission_rate_percent: 5
      },
      seller_payment_info: user?.seller_payment_info || {},
      platform_payment_info: {
        payment_provider: platformSettings.payment_provider,
        account_title: platformSettings.account_title,
        platform_payment_number: platformSettings.platform_payment_number,
        bank_details: platformSettings.bank_details,
        instructions: platformSettings.payment_instructions
      },
      listings: listings.map(l => ({ ...l, id: l._id.toString() })),
      orders: orders.map(o => ({
        ...o,
        id: o._id.toString(),
        buyer_name: (o.buyer_id as any)?.name || "Buyer",
        buyer_email: (o.buyer_id as any)?.email || "N/A"
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch seller dashboard." });
  }
});

// Update Seller Payout / Receiving Details
router.put("/seller-payment-details", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { payment_method, account_title, account_number, bank_name, instructions } = req.body;
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ detail: "User not found." });
      return;
    }

    user.seller_payment_info = {
      payment_method: payment_method || "Easypaisa",
      account_title: account_title || user.name,
      account_number: account_number || "",
      bank_name: bank_name || "",
      instructions: instructions || ""
    };

    await user.save();

    res.json({
      message: "Seller payment details updated successfully.",
      seller_payment_info: user.seller_payment_info
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update seller payment details." });
  }
});

// ==============================================================================
// 6. BUYER DASHBOARD (Part 11)
// ==============================================================================
router.get("/buyer-dashboard", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const buyerId = new Types.ObjectId(req.auth!.userId!);
    const orders = await MarketplaceOrder.find({ buyer_id: buyerId })
      .populate("seller_id", "name email seller_payment_info")
      .populate("presentation_id", "slides slide_count average_rating")
      .sort({ created_at: -1 })
      .lean();

    const formatted = orders.map(o => {
      const seller = (o.seller_id as any) || {};
      const pres = (o.presentation_id as any) || {};
      return {
        ...o,
        id: o._id.toString(),
        seller_name: seller.name || "Seller",
        seller_email: seller.email || "N/A",
        seller_payment_info: seller.seller_payment_info || {
          payment_method: "Easypaisa",
          account_title: seller.name || "Seller",
          account_number: "Contact seller",
          instructions: "Transfer payment directly."
        },
        slides_count: pres.slides?.length || pres.slide_count || 6,
        preview_slides: (pres.slides || []).slice(0, 3)
      };
    });

    res.json({
      total_purchases: formatted.length,
      confirmed_purchases: formatted.filter(o => o.sale_status === "SALE_CONFIRMED").length,
      pending_purchases: formatted.filter(o => o.sale_status === "SALE_PENDING").length,
      orders: formatted
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch buyer dashboard." });
  }
});

export default router;
