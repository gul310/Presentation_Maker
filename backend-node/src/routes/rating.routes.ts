import { Router, Response } from "express";
import { Types } from "mongoose";
import { Rating } from "../models/Rating.js";
import { Presentation } from "../models/Presentation.js";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// Submit or Update a 1-5 Star Rating on a Public Presentation
router.post(["/", "/:id"], requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const presentation_id = req.body.presentation_id || getParam(req.params.id);
    const score = req.body.score;
    const userId = req.auth!.userId!;

    if (!presentation_id || !Types.ObjectId.isValid(presentation_id)) {
      res.status(400).json({ detail: "Valid presentation_id is required." });
      return;
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 1 || numScore > 5) {
      res.status(400).json({ detail: "Score must be an integer between 1 and 5." });
      return;
    }

    const presentation = await Presentation.findById(presentation_id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    if (presentation.visibility !== "public") {
      res.status(400).json({ detail: "Only publicly shared presentations can be rated." });
      return;
    }

    await Rating.findOneAndUpdate(
      {
        presentation_id: new Types.ObjectId(presentation_id),
        user_id: new Types.ObjectId(userId)
      },
      { score: numScore },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const stats = await Rating.aggregate([
      { $match: { presentation_id: new Types.ObjectId(presentation_id) } },
      {
        $group: {
          _id: "$presentation_id",
          average: { $avg: "$score" },
          count: { $sum: 1 }
        }
      }
    ]);

    const avgRating = stats.length > 0 ? Math.round(stats[0].average * 10) / 10 : numScore;
    const ratingsCount = stats.length > 0 ? stats[0].count : 1;

    presentation.average_rating = avgRating;
    presentation.ratings_count = ratingsCount;
    await presentation.save();

    res.json({
      message: "Rating saved successfully.",
      user_score: numScore,
      average_rating: avgRating,
      ratings_count: ratingsCount
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to submit rating." });
  }
});

// Get authenticated user's current rating for a presentation
router.get("/:presentationId/my-rating", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const presentationId = getParam(req.params.presentationId);
    const userId = req.auth!.userId!;

    if (!Types.ObjectId.isValid(presentationId)) {
      res.status(400).json({ detail: "Invalid presentationId." });
      return;
    }

    const rating = await Rating.findOne({
      presentation_id: new Types.ObjectId(presentationId),
      user_id: new Types.ObjectId(userId)
    });

    res.json({
      rated: Boolean(rating),
      score: rating ? rating.score : null
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch rating." });
  }
});

export default router;
