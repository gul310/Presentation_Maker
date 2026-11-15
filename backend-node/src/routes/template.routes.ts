import { Router, Response } from "express";
import { Types } from "mongoose";
import { Template } from "../models/Template.js";
import { TemplatePurchase } from "../models/TemplatePurchase.js";
import { Presentation } from "../models/Presentation.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// Check if user has unlocked a template
async function isTemplateUnlocked(template: any, user: any): Promise<boolean> {
  if (!user) {
    return template.access_type === "FREE";
  }

  // Admin has access to all templates
  if (user.role === "admin" || user.is_admin) {
    return true;
  }

  if (template.access_type === "FREE") {
    return true;
  }

  if (template.access_type === "PLAN_INCLUDED") {
    const userPlan = user.subscription?.plan || "free";
    const userStatus = user.subscription?.status || "free";
    if (["student", "pro", "team"].includes(userPlan) && userStatus === "active") {
      return true;
    }
    return false;
  }

  if (template.access_type === "PREMIUM") {
    // Check if user has an APPROVED TemplatePurchase
    const purchase = await TemplatePurchase.findOne({
      user_id: user._id,
      template_id: template._id,
      status: "APPROVED"
    });
    if (purchase) {
      return true;
    }

    // Team plan gets access to premium templates
    if (user.subscription?.plan === "team" && user.subscription?.status === "active") {
      return true;
    }

    return false;
  }

  return false;
}

// 1. GET /api/templates: Browse templates with filters and unlocked status
router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, access_type, search, sort = "featured", page = "1", limit = "20" } = req.query;
    const filter: any = { is_published: true };

    if (category && typeof category === "string" && category !== "all") {
      filter.category = category;
    }

    if (access_type && typeof access_type === "string" && access_type !== "all") {
      filter.access_type = access_type.toUpperCase();
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } }
      ];
    }

    const sortOption: any = {};
    if (sort === "featured") sortOption.is_featured = -1;
    else if (sort === "popular") sortOption.usage_count = -1;
    else if (sort === "top_rated") sortOption.average_rating = -1;
    else sortOption.created_at = -1;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Template.countDocuments(filter);
    const templates = await Template.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const user = req.auth?.user;

    const formatted = await Promise.all(
      templates.map(async t => {
        const unlocked = await isTemplateUnlocked(t, user);
        return {
          id: t._id.toString(),
          title: t.title,
          description: t.description,
          category: t.category,
          cover_image: t.cover_image,
          preview_images: t.preview_images || [],
          access_type: t.access_type,
          price_pkr: t.price_pkr,
          price_usd: t.price_usd,
          slide_count: t.slide_count || (t.slides ? t.slides.length : 0),
          usage_count: t.usage_count,
          purchase_count: t.purchase_count,
          average_rating: t.average_rating,
          ratings_count: t.ratings_count,
          is_featured: t.is_featured,
          tags: t.tags,
          is_unlocked: unlocked,
          preview_slides: (t.slides || []).slice(0, 3).map(s => ({
            slide_number: s.slide_number,
            title: s.title,
            layout_type: s.layout_type
          }))
        };
      })
    );

    res.json({
      templates: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch templates." });
  }
});

// 2. GET /api/templates/categories: Categories and counts
router.get("/categories", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = [
      "Business & Corporate",
      "Education & University",
      "Technology & AI",
      "Healthcare",
      "Marketing",
      "Research & Academic",
      "Portfolio & Creative",
      "Pitch Decks"
    ];

    const counts = await Template.aggregate([
      { $match: { is_published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map(c => [c._id, c.count]));

    const result = categories.map(cat => ({
      name: cat,
      count: countMap.get(cat) || 0
    }));

    res.json({ categories: result });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch template categories." });
  }
});

// 2.5. GET /api/templates/my-purchases: User's template purchase records
router.get("/my-purchases", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.auth!.userId!;
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const filter = userObjId ? { $or: [{ user_id: userObjId }, { user_id: userId }] } : { user_id: userId };
    const purchases = await TemplatePurchase.find(filter)
      .sort({ created_at: -1 })
      .lean();

    res.json({
      purchases: purchases.map(p => ({
        ...p,
        id: p._id.toString()
      }))
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch template purchases." });
  }
});

// 3. GET /api/templates/:id: Single template detail
router.get("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const template = await Template.findById(id).lean();
    if (!template) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const user = req.auth?.user;
    const unlocked = await isTemplateUnlocked(template, user);

    // If unlocked, return full slides; otherwise return sanitized preview slides
    const slides = unlocked
      ? template.slides
      : (template.slides || []).map((s, idx) => {
          if (idx < 2) return s;
          return {
            slide_number: s.slide_number,
            title: s.title,
            content: ["Content locked. Upgrade or purchase this premium template to unlock full slides."],
            layout_type: s.layout_type
          };
        });

    res.json({
      ...template,
      id: template._id.toString(),
      slides,
      is_unlocked: unlocked
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch template details." });
  }
});

// 4. POST /api/templates/:id/use: Clone template into user's presentations library
router.post("/:id/use", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const user = req.auth!.user!;
    const userId = req.auth!.userId!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    // Try finding dedicated Template first
    let template = await Template.findById(id);

    if (template) {
      // Check access permission
      const unlocked = await isTemplateUnlocked(template, user);
      if (!unlocked) {
        res.status(403).json({
          detail: `This premium template requires purchase or an active paid plan. Access type: ${template.access_type}, Price: PKR ${template.price_pkr}.`
        });
        return;
      }

      // Clone template slides into user presentation
      const clonedSlides = (template.slides || []).map(s => ({
        slide_number: s.slide_number,
        title: s.title,
        content: s.content,
        layout_type: s.layout_type || "title_and_body",
        speaker_notes: s.speaker_notes || "",
        image_url: s.image_url || null,
        source_reference: s.source_reference || `Template: ${template!.title}`
      }));

      const newPresentation = new Presentation({
        user_id: new Types.ObjectId(userId),
        title: `${template.title} (Editable Copy)`,
        source_type: "prompt",
        source_name: `Template: ${template.title}`,
        language: "English",
        audience: "General Audience",
        presentation_type: "Informative",
        tone: "Professional",
        slide_count: clonedSlides.length,
        status: "ready",
        visibility: "private",
        is_template: false,
        slides: clonedSlides
      });

      await newPresentation.save();

      // Increment template usage
      template.usage_count = (template.usage_count || 0) + 1;
      await template.save();

      const formattedSlides = newPresentation.slides.map((s: any) => ({
        ...(s.toObject ? s.toObject() : s),
        id: s._id ? s._id.toString() : String(s.slide_number)
      }));

      res.status(201).json({
        message: `Template "${template.title}" cloned to your workspace successfully!`,
        presentation: {
          ...newPresentation.toObject(),
          id: newPresentation._id.toString(),
          user_id: newPresentation.user_id ? newPresentation.user_id.toString() : null,
          slides: formattedSlides
        }
      });
      return;
    }

    // Fallback: Check if it's a public presentation (legacy template cloning)
    const publicPres = await Presentation.findById(id);
    if (!publicPres || publicPres.visibility !== "public") {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const clonedSlides = publicPres.slides.map(s => ({
      slide_number: s.slide_number,
      title: s.title,
      content: s.content,
      layout_type: s.layout_type,
      speaker_notes: s.speaker_notes,
      image_url: (s as any).image?.url || (s as any).image_url || null,
      source_reference: s.source_reference
    }));

    const userCopy = new Presentation({
      user_id: new Types.ObjectId(userId),
      title: `${publicPres.title} (Template Copy)`,
      source_type: publicPres.source_type,
      source_name: publicPres.source_name,
      language: publicPres.language,
      audience: publicPres.audience,
      presentation_type: publicPres.presentation_type,
      tone: publicPres.tone,
      slide_count: publicPres.slide_count,
      status: "ready",
      visibility: "private",
      is_template: false,
      original_presentation_id: publicPres._id,
      slides: clonedSlides
    });

    await userCopy.save();

    publicPres.template_use_count = (publicPres.template_use_count || 0) + 1;
    await publicPres.save();

    const formattedSlides = userCopy.slides.map((s: any) => ({
      ...(s.toObject ? s.toObject() : s),
      id: s._id ? s._id.toString() : String(s.slide_number)
    }));

    res.status(201).json({
      message: "Template copied to your presentations library successfully!",
      presentation: {
        ...userCopy.toObject(),
        id: userCopy._id.toString(),
        user_id: userCopy.user_id ? userCopy.user_id.toString() : null,
        slides: formattedSlides
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to clone template." });
  }
});

// 5. POST /api/templates/:id/purchase-request: Initiate NayaPay purchase of premium template
router.post("/:id/purchase-request", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const user = req.auth!.user!;

    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    if (template.access_type === "FREE") {
      res.status(400).json({ detail: "This template is free and does not require purchase." });
      return;
    }

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const transaction_ref = `NP-TMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const purchase = new TemplatePurchase({
      user_id: user._id,
      template_id: template._id,
      template_title: template.title,
      price_pkr: template.price_pkr,
      price_usd: template.price_usd,
      payment_provider: settings.payment_provider || "NayaPay",
      transaction_ref,
      status: "PENDING_PAYMENT"
    });

    await purchase.save();

    res.json({
      purchase_id: purchase._id.toString(),
      transaction_ref,
      template_title: template.title,
      amount_pkr: template.price_pkr,
      payment_instructions: {
        provider: settings.payment_provider || "NayaPay",
        account_title: settings.account_title || "Syeda Gul Andam Malik Kazmi",
        platform_payment_number: settings.platform_payment_number || "03339114569",
        bank_details: settings.bank_details,
        note: `Transfer PKR ${template.price_pkr} to NayaPay account 03339114569 (Title: Syeda Gul Andam Malik Kazmi). Enter '${transaction_ref}' in the transaction reference/note, then submit your payment proof.`
      }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to create template purchase request." });
  }
});

// 6. POST /api/templates/:id/submit-payment: Submit transaction proof for template purchase
router.post("/:id/submit-payment", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const user = req.auth!.user!;
    const { purchase_id, transaction_ref, receipt_url, payer_name, payer_account } = req.body;

    let purchase: any = null;
    if (purchase_id && Types.ObjectId.isValid(purchase_id)) {
      purchase = await TemplatePurchase.findOne({ _id: purchase_id, user_id: user._id });
    }

    if (!purchase && transaction_ref) {
      purchase = await TemplatePurchase.findOne({ transaction_ref, user_id: user._id });
    }

    if (!purchase) {
      const template = await Template.findById(id);
      if (!template) {
        res.status(404).json({ detail: "Template not found." });
        return;
      }
      purchase = new TemplatePurchase({
        user_id: user._id,
        template_id: template._id,
        template_title: template.title,
        price_pkr: template.price_pkr,
        price_usd: template.price_usd,
        payment_provider: "NayaPay",
        transaction_ref: transaction_ref || `NP-TMP-${Date.now()}`
      });
    }

    purchase.transaction_ref = transaction_ref || purchase.transaction_ref;
    purchase.receipt_url = receipt_url || null;
    purchase.payer_name = payer_name || user.name;
    purchase.payer_account = payer_account || null;
    purchase.status = "PAYMENT_SUBMITTED";

    await purchase.save();

    res.json({
      message: "Template purchase payment submitted successfully. Awaiting Super Admin verification.",
      purchase: { ...purchase.toObject(), id: purchase._id.toString() }
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit template purchase payment." });
  }
});

// 7. POST /api/templates/:id/review: Leave rating and review (only if used or purchased)
router.post("/:id/review", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const user = req.auth!.user!;
    const { rating, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      res.status(400).json({ detail: "Rating must be between 1 and 5 stars." });
      return;
    }

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      res.status(400).json({ detail: "Review comment is required." });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({ detail: "Template not found." });
      return;
    }

    // Verify user has used or unlocked the template
    const unlocked = await isTemplateUnlocked(template, user);
    if (!unlocked) {
      res.status(403).json({ detail: "You can only review templates you have unlocked or used." });
      return;
    }

    // Add or update review
    const existingIdx = template.reviews.findIndex(r => r.user_id.toString() === user._id.toString());
    if (existingIdx >= 0) {
      template.reviews[existingIdx].rating = Number(rating);
      template.reviews[existingIdx].comment = comment.trim();
      template.reviews[existingIdx].created_at = new Date();
    } else {
      template.reviews.push({
        user_id: user._id,
        user_name: user.name,
        rating: Number(rating),
        comment: comment.trim(),
        created_at: new Date()
      });
    }

    // Recompute average rating
    const totalScore = template.reviews.reduce((acc, r) => acc + r.rating, 0);
    template.ratings_count = template.reviews.length;
    template.average_rating = Math.round((totalScore / template.ratings_count) * 10) / 10;

    await template.save();

    res.json({
      message: "Review submitted successfully!",
      average_rating: template.average_rating,
      ratings_count: template.ratings_count,
      reviews: template.reviews
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit review." });
  }
});

export default router;
