import { Router, Response } from "express";
import { Types } from "mongoose";
import { Presentation, ISlide } from "../models/Presentation.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

const getUserIdFilter = (userId: string) => {
  const ids: any[] = [userId];
  if (Types.ObjectId.isValid(userId)) {
    ids.push(new Types.ObjectId(userId));
  }
  return { $in: ids };
};

const buildOwnerQuery = (id: string, auth: AuthenticatedRequest["auth"]) => {
  const query: any = {};
  if (Types.ObjectId.isValid(id)) {
    query._id = new Types.ObjectId(id);
  } else {
    query._id = id;
  }

  if (auth?.userId) {
    query.user_id = getUserIdFilter(auth.userId);
  } else if (auth?.guestSessionId) {
    query.guest_session_id = auth.guestSessionId;
    query.$or = [{ user_id: null }, { user_id: { $exists: false } }];
  } else {
    query._id = null;
  }
  return query;
};

// 1. List user / guest presentations
router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {};
    if (req.auth?.userId) {
      filter.user_id = getUserIdFilter(req.auth.userId);
    } else if (req.auth?.guestSessionId) {
      filter.guest_session_id = req.auth.guestSessionId;
      filter.$or = [{ user_id: null }, { user_id: { $exists: false } }];
    } else {
      res.json([]);
      return;
    }

    const presentations = await Presentation.find(filter)
      .sort({ created_at: -1 })
      .lean();

    const formatted = presentations.map(p => ({
      ...p,
      id: p._id.toString(),
      user_id: p.user_id ? p.user_id.toString() : null
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch presentations." });
  }
});

// 2. Get single presentation details (with slides)
router.get("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!Types.ObjectId.isValid(id) && typeof id !== "string") {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const presentation = await Presentation.findById(id).lean();
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const userMatches = (val: any, target: string) => {
      if (!val || !target) return false;
      return val.toString() === target || String(val) === target;
    };

    const hasUserOwner = !!presentation.user_id;
    const isOwner = hasUserOwner
      ? (req.auth?.userId && userMatches(presentation.user_id, req.auth.userId))
      : (req.auth?.guestSessionId && presentation.guest_session_id === req.auth.guestSessionId);

    if (!isOwner) {
      res.status(403).json({ detail: "You do not have permission to access this presentation." });
      return;
    }

    const formattedSlides = (presentation.slides || []).map((s: any) => {
      const validImg = (s.image && (s.image.url || s.image.regular_url))
        ? s.image
        : ((s.content?.image && (s.content.image.url || s.content.image.regular_url)) ? s.content.image : undefined);
      return {
        ...s,
        id: s._id ? s._id.toString() : String(s.slide_number),
        image: validImg
      };
    });

    res.json({
      ...presentation,
      id: presentation._id.toString(),
      user_id: presentation.user_id ? presentation.user_id.toString() : null,
      slides: formattedSlides
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch presentation." });
  }
});

// 3. Create a new presentation
router.post("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, source_type, source_name, language, audience, presentation_type, tone, slides } = req.body;

    const initialSlides: ISlide[] = (slides || []).map((s: any, idx: number) => ({
      slide_number: s.slide_number || idx + 1,
      title: s.title || `Slide ${idx + 1}`,
      content: s.content || {},
      layout_type: s.layout_type || "standard",
      speaker_notes: s.speaker_notes || "",
      source_reference: s.source_reference || null
    }));

    const presentation = new Presentation({
      user_id: req.auth?.userId ? new Types.ObjectId(req.auth.userId) : null,
      guest_session_id: req.auth?.userId ? null : (req.auth?.guestSessionId || null),
      title: title || "Untitled Presentation",
      source_type: source_type || "prompt",
      source_name: source_name || null,
      language: language || "English",
      audience: audience || "General",
      presentation_type: presentation_type || "Informative",
      tone: tone || "Professional",
      slide_count: initialSlides.length,
      status: "ready",
      visibility: "private",
      slides: initialSlides
    });

    await presentation.save();

    const formattedSlides = presentation.slides.map((s: any) => ({
      ...(s.toObject ? s.toObject() : s),
      id: s._id ? s._id.toString() : String(s.slide_number)
    }));

    res.status(201).json({
      ...presentation.toObject(),
      id: presentation._id.toString(),
      user_id: presentation.user_id ? presentation.user_id.toString() : null,
      slides: formattedSlides
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to create presentation." });
  }
});

// 4. Update presentation metadata
router.put("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const { title, language, audience, presentation_type, tone, visibility, is_template, theme } = req.body;
    if (title !== undefined) presentation.title = title.trim();
    if (theme !== undefined) (presentation as any).theme = theme;
    if (language !== undefined) presentation.language = language;
    if (audience !== undefined) presentation.audience = audience;
    if (presentation_type !== undefined) presentation.presentation_type = presentation_type;
    if (tone !== undefined) presentation.tone = tone;
    if (visibility !== undefined && ["private", "public"].includes(visibility)) {
      presentation.visibility = visibility;
      if (visibility === "public") {
        if (!presentation.marketplace) {
          presentation.marketplace = {
            is_for_sale: true,
            price: 0,
            sales_count: 0,
            published_at: new Date()
          };
        } else {
          presentation.marketplace.is_for_sale = true;
          if (!presentation.marketplace.published_at) presentation.marketplace.published_at = new Date();
        }
      } else {
        if (presentation.marketplace) presentation.marketplace.is_for_sale = false;
      }
    }
    if (is_template !== undefined) presentation.is_template = Boolean(is_template);

    await presentation.save();
    res.json({
      ...presentation.toObject(),
      id: presentation._id.toString(),
      user_id: presentation.user_id ? presentation.user_id.toString() : null
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update presentation." });
  }
});

// 5. Delete presentation
router.delete("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const deleted = await Presentation.findOneAndDelete(query);
    if (!deleted) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to delete presentation." });
  }
});

// 6. Rename presentation
router.put("/:id/rename", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const { title } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ detail: "Title cannot be empty." });
      return;
    }

    presentation.title = title.trim();
    await presentation.save();

    res.json({
      ...presentation.toObject(),
      id: presentation._id.toString(),
      user_id: presentation.user_id ? presentation.user_id.toString() : null
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to rename presentation." });
  }
});

// 7. Duplicate presentation
router.post("/:id/duplicate", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const original = await Presentation.findOne(query);
    if (!original) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const clonedSlides = original.slides.map(s => ({
      slide_number: s.slide_number,
      title: s.title,
      content: s.content,
      layout_type: s.layout_type,
      speaker_notes: s.speaker_notes,
      source_reference: s.source_reference
    }));

    const copy = new Presentation({
      user_id: req.auth?.userId ? new Types.ObjectId(req.auth.userId) : null,
      guest_session_id: req.auth?.userId ? null : (req.auth?.guestSessionId || null),
      title: `Copy of ${original.title}`,
      source_type: original.source_type,
      source_name: original.source_name,
      language: original.language,
      audience: original.audience,
      presentation_type: original.presentation_type,
      tone: original.tone,
      slide_count: original.slide_count,
      status: original.status,
      visibility: "private",
      slides: clonedSlides
    });

    await copy.save();

    res.status(201).json({
      ...copy.toObject(),
      id: copy._id.toString(),
      user_id: copy.user_id ? copy.user_id.toString() : null
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to duplicate presentation." });
  }
});

// 8. Toggle / update sharing visibility (Private / Public)
router.put(["/:id/visibility", "/:id/share"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const visibility = req.body.visibility || (req.body.is_published_to_community ? "public" : "private");
    if (!["private", "public"].includes(visibility)) {
      res.status(400).json({ detail: "Visibility must be 'private' or 'public'." });
      return;
    }

    presentation.visibility = visibility;
    if (visibility === "public") {
      if (!presentation.marketplace) {
        presentation.marketplace = {
          is_for_sale: true,
          price: 0,
          sales_count: 0,
          published_at: new Date()
        };
      } else {
        presentation.marketplace.is_for_sale = true;
        if (!presentation.marketplace.published_at) presentation.marketplace.published_at = new Date();
      }
    } else {
      if (presentation.marketplace) presentation.marketplace.is_for_sale = false;
    }
    await presentation.save();

    res.json({
      message: `Presentation visibility set to ${visibility}.`,
      id: presentation._id.toString(),
      visibility: presentation.visibility,
      share_url: `/p/${presentation._id.toString()}`
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update visibility." });
  }
});

// --- SLIDE ENDPOINTS ---

// Add Slide
router.post("/:id/slides", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const { slide_number, title, content, layout_type, speaker_notes, source_reference } = req.body;
    const newNumber = slide_number || presentation.slides.length + 1;

    const newSlide: ISlide = {
      slide_number: newNumber,
      title: title || `Slide ${newNumber}`,
      content: content || {},
      layout_type: layout_type || "standard",
      speaker_notes: speaker_notes || "",
      source_reference: source_reference || null
    };

    presentation.slides.push(newSlide);
    presentation.slide_count = presentation.slides.length;
    await presentation.save();

    const addedSlide: any = presentation.slides[presentation.slides.length - 1];
    res.status(201).json({
      ...(addedSlide.toObject ? addedSlide.toObject() : addedSlide),
      id: addedSlide._id ? addedSlide._id.toString() : String(addedSlide.slide_number)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to add slide." });
  }
});

// Update Slide
router.put("/:id/slides/:slideId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const slide: any = presentation.slides.find(
      s => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
    );

    if (!slide) {
      res.status(404).json({ detail: "Slide not found." });
      return;
    }

    const { title, content, layout_type, speaker_notes, source_reference, image } = req.body;
    if (title !== undefined) slide.title = title.trim();
    if (content !== undefined) slide.content = content;
    if (layout_type !== undefined) slide.layout_type = layout_type;
    if (speaker_notes !== undefined) slide.speaker_notes = speaker_notes;
    if (source_reference !== undefined) slide.source_reference = source_reference;
    if (image !== undefined) {
      slide.image = image;
      if (!slide.content) slide.content = {};
      slide.content.image = image;
    } else if (content?.image !== undefined) {
      slide.image = content.image;
    }

    presentation.markModified("slides");
    await presentation.save();
    res.json({
      ...(slide.toObject ? slide.toObject() : slide),
      id: slide._id ? slide._id.toString() : String(slide.slide_number),
      image: slide.image || slide.content?.image || undefined
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update slide." });
  }
});

// Delete Slide
router.delete("/:id/slides/:slideId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const initialLen = presentation.slides.length;
    presentation.slides = presentation.slides.filter(
      s => (s._id && s._id.toString() !== slideId) && String(s.slide_number) !== slideId
    ) as any;

    if (presentation.slides.length === initialLen) {
      res.status(404).json({ detail: "Slide not found." });
      return;
    }

    presentation.slides.forEach((s, idx) => {
      s.slide_number = idx + 1;
    });
    presentation.slide_count = presentation.slides.length;

    await presentation.save();
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to delete slide." });
  }
});

// Reorder Slides
router.post("/:id/reorder", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const query = buildOwnerQuery(id, req.auth);
    const presentation = await Presentation.findOne(query);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found or unauthorized." });
      return;
    }

    const { reordered_slides } = req.body;
    if (!Array.isArray(reordered_slides)) {
      res.status(400).json({ detail: "reordered_slides array required." });
      return;
    }

    const slideMap = new Map<string, any>();
    presentation.slides.forEach(s => {
      const key = s._id ? s._id.toString() : String(s.slide_number);
      slideMap.set(key, s);
    });

    const newSlides: any[] = [];
    for (const item of reordered_slides) {
      const key = String(item.id || item.slide_id);
      const match = slideMap.get(key);
      if (match) {
        match.slide_number = item.slide_number;
        newSlides.push(match);
      }
    }

    if (newSlides.length === presentation.slides.length) {
      newSlides.sort((a, b) => a.slide_number - b.slide_number);
      presentation.slides = newSlides as any;
      await presentation.save();
    }

    const formatted = presentation.slides.map((s: any) => ({
      ...(s.toObject ? s.toObject() : s),
      id: s._id ? s._id.toString() : String(s.slide_number)
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to reorder slides." });
  }
});

export default router;
