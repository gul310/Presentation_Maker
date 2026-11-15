import { Router, Response } from "express";
import { Types } from "mongoose";
import { Presentation, ISlideImage } from "../models/Presentation.js";
import { unsplashService } from "../services/unsplash.service.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// 1. Unsplash Configuration and Rate Limit Status
router.get("/status", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const status = unsplashService.getStatus();
  res.json({
    status: status.configured ? "configured" : "unconfigured",
    configured: status.configured,
    rate_limit_total: status.rate_limit_total,
    rate_limit_remaining: status.rate_limit_remaining,
    cache_size: status.cache_size,
    provider: "Unsplash"
  });
});

// 2. Search Photographs on Unsplash
router.get("/search", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.query as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const perPage = req.query.per_page || req.query.perPage
      ? parseInt((req.query.per_page || req.query.perPage) as string, 10)
      : 12;
    const orientation = (req.query.orientation as any) || "landscape";

    if (!query || query.trim().length === 0) {
      res.status(400).json({ detail: "Search query is required." });
      return;
    }

    if (!unsplashService.isConfigured()) {
      res.status(503).json({
        error_code: "UNSPLASH_NOT_CONFIGURED",
        detail: "Unsplash API credentials are not configured in backend environment variables. Please configure UNSPLASH_ACCESS_KEY."
      });
      return;
    }

    const { results, total } = await unsplashService.searchPhotos(query, {
      page,
      perPage,
      orientation
    });

    const status = unsplashService.getStatus();

    res.json({
      query: query.trim(),
      page,
      per_page: perPage,
      orientation,
      total,
      results,
      photos: results,
      rate_limit_remaining: status.rate_limit_remaining
    });
  } catch (err: any) {
    console.error("[Image API] Search error:", err.message);
    const isRateLimit = err.message?.includes("UNSPLASH_RATE_LIMIT") || err.message?.includes("429");
    const isAuth = err.message?.includes("UNSPLASH_AUTH_ERROR") || err.message?.includes("401");
    const isTimeout = err.message?.includes("UNSPLASH_TIMEOUT");

    const statusCode = isRateLimit ? 429 : (isAuth ? 401 : (isTimeout ? 504 : 500));
    res.status(statusCode).json({
      error_code: isRateLimit ? "UNSPLASH_RATE_LIMIT" : (isAuth ? "UNSPLASH_AUTH_ERROR" : "UNSPLASH_SEARCH_FAILED"),
      detail: err.message || "Failed to search images."
    });
  }
});

// 3. Track Image Download Event (Unsplash Compliance)
router.post("/track-download", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { download_location } = req.body;
    if (download_location) {
      // Validate that URL belongs to Unsplash API to prevent arbitrary SSRF
      const parsed = new URL(download_location);
      if (parsed.hostname === "api.unsplash.com") {
        await unsplashService.trackDownload(download_location);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(200).json({ success: false, warning: "Tracking failed but request ignored." });
  }
});

// 4. Attach or Replace Image on a Specific Slide
router.post(["/presentation/:id/slides/:slideId/image", "/presentations/:id/slides/:slideId/image"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const { image } = req.body;

    if (!image || !image.url) {
      res.status(400).json({ detail: "Valid image metadata and URL are required." });
      return;
    }

    const presentation = await Presentation.findById(id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const slide = presentation.slides.find(
      s => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
    );

    if (!slide) {
      res.status(404).json({ detail: "Slide not found." });
      return;
    }

    const cleanImage: ISlideImage = {
      provider: image.provider || "unsplash",
      photo_id: image.photo_id || `img_${Date.now()}`,
      url: image.regular_url || image.url,
      regular_url: image.regular_url || image.url,
      small_url: image.small_url || image.url,
      thumb_url: image.thumb_url || image.small_url || image.url,
      download_location: image.download_location || "",
      photographer_name: image.photographer_name || "Unsplash Photographer",
      photographer_profile_url: image.photographer_profile_url || "https://unsplash.com/?utm_source=presentation_maker&utm_medium=referral",
      photo_page_url: image.photo_page_url || "https://unsplash.com/?utm_source=presentation_maker&utm_medium=referral",
      alt_text: image.alt_text || slide.title,
      width: image.width || 1920,
      height: image.height || 1080,
      orientation: image.orientation || "landscape",
      position: image.position || "split_right",
      selection_reason: image.selection_reason || "User selected image",
      selected_at: new Date()
    };

    slide.image = cleanImage;
    if (!slide.content) slide.content = {};
    slide.content.image = cleanImage;

    // If slide was standard layout, transition to image_text so it renders beautifully
    if (slide.layout_type === "standard" || !slide.layout_type) {
      slide.layout_type = "image_text";
      slide.content.visual_type = "image_text";
    }

    presentation.markModified("slides");
    await presentation.save();

    // Trigger download tracking if download_location is present
    if (cleanImage.download_location) {
      unsplashService.trackDownload(cleanImage.download_location).catch(() => {});
    }

    res.json({
      message: "Slide image updated successfully.",
      presentation_id: id,
      slide_id: slide._id ? slide._id.toString() : String(slide.slide_number),
      image: cleanImage,
      slide
    });
  } catch (err: any) {
    console.error("[Image API] Update slide image error:", err);
    res.status(500).json({ detail: err.message || "Failed to update slide image." });
  }
});

// 5. Remove Image from a Specific Slide
router.delete(["/presentation/:id/slides/:slideId/image", "/presentations/:id/slides/:slideId/image"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);

    const presentation = await Presentation.findById(id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const slide = presentation.slides.find(
      s => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
    );

    if (!slide) {
      res.status(404).json({ detail: "Slide not found." });
      return;
    }

    // Remove image
    slide.image = undefined;
    if (slide.content) {
      delete slide.content.image;
      delete slide.content.image_url;
      // If layout was image_text, revert to standard
      if (slide.layout_type === "image_text") {
        slide.layout_type = "standard";
        slide.content.visual_type = "standard";
      }
    }

    presentation.markModified("slides");
    await presentation.save();

    res.json({
      message: "Slide image removed successfully.",
      presentation_id: id,
      slide_id: slide._id ? slide._id.toString() : String(slide.slide_number),
      slide
    });
  } catch (err: any) {
    console.error("[Image API] Remove slide image error:", err);
    res.status(500).json({ detail: err.message || "Failed to remove slide image." });
  }
});

export default router;

