import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Presentation } from "../models/Presentation.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// Public Discovery & Dynamic Real Ranking
router.get("/discover", async (req: Request, res: Response): Promise<void> => {
  try {
    const sort = (req.query.sort || req.query.filter || "trending") as string;
    const { language, search, page = "1", limit = "12" } = req.query;

    const filter: any = { visibility: "public" };

    if (language && language !== "all") {
      filter.language = language;
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { "slides.title": { $regex: search.trim(), $options: "i" } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    let sortStage: any = { created_at: -1 };
    if (sort === "top_rated") {
      sortStage = { average_rating: -1, ratings_count: -1 };
    } else if (sort === "popular") {
      sortStage = { views_count: -1 };
    } else if (sort === "most_used") {
      sortStage = { template_use_count: -1 };
    } else if (sort === "trending") {
      sortStage = { average_rating: -1, template_use_count: -1, views_count: -1 };
    }

    const total = await Presentation.countDocuments(filter);
    const presentations = await Presentation.find(filter)
      .populate("user_id", "name role")
      .sort(sortStage)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formatted = presentations.map(p => ({
      ...p,
      id: p._id.toString(),
      author_name: (p.user_id as any)?.name || "Community Creator",
      author_role: (p.user_id as any)?.role || "User",
      user_id: p.user_id ? (p.user_id as any)._id?.toString() || p.user_id.toString() : null,
      slide_count: p.slides ? p.slides.length : p.slide_count,
      slides: (p.slides || []).slice(0, 3)
    }));

    res.json({
      items: formatted,
      presentations: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch public presentations." });
  }
});

// View Public Presentation (Increments real views count atomically)
router.get(["/presentation/:id", "/presentations/:id"], async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Public presentation not found." });
      return;
    }

    const presentation = await Presentation.findOneAndUpdate(
      { _id: new Types.ObjectId(id), visibility: "public" },
      { $inc: { views_count: 1 } },
      { new: true }
    )
      .populate("user_id", "name role")
      .lean();

    if (!presentation) {
      res.status(404).json({ detail: "Public presentation not found." });
      return;
    }

    const formattedSlides = (presentation.slides || []).map((s: any) => ({
      ...s,
      id: s._id ? s._id.toString() : String(s.slide_number)
    }));

    res.json({
      ...presentation,
      id: presentation._id.toString(),
      author_name: (presentation.user_id as any)?.name || "Community Creator",
      author_role: (presentation.user_id as any)?.role || "User",
      user_id: presentation.user_id ? (presentation.user_id as any)._id?.toString() || presentation.user_id.toString() : null,
      slides: formattedSlides
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch public presentation." });
  }
});

export default router;
