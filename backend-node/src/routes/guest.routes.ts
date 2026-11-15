import { Router, Response } from "express";
import { GuestSession } from "../models/GuestSession.js";
import { config } from "../config/config.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Attempt guest generation (counts attempts, enforces max limit of 2)
router.post("/attempt-generation", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessionId = req.auth?.guestSessionId;
    if (!sessionId) {
      res.status(400).json({ detail: "Guest session identifier header (x-guest-session-id) missing." });
      return;
    }

    let session = await GuestSession.findOne({ session_id: sessionId });
    if (!session) {
      session = new GuestSession({ session_id: sessionId, generation_count: 0 });
    }

    if (session.generation_count >= config.maxGuestGenerations) {
      res.status(403).json({
        allowed: false,
        status: "GUEST_GENERATION_LIMIT_REACHED",
        status_code: "GUEST_GENERATION_LIMIT_REACHED",
        count: session.generation_count,
        generation_count: session.generation_count,
        max_allowed: config.maxGuestGenerations,
        max_generations: config.maxGuestGenerations,
        remaining_generations: 0,
        message: `You have used your ${config.maxGuestGenerations} free guest generations. Please create an account to generate unlimited presentations!`,
        detail: {
          status_code: "GUEST_GENERATION_LIMIT_REACHED",
          count: session.generation_count,
          generation_count: session.generation_count,
          max_allowed: config.maxGuestGenerations,
          max_generations: config.maxGuestGenerations,
          message: `You have used your ${config.maxGuestGenerations} free guest generations. Please create an account to generate unlimited presentations!`
        }
      });
      return;
    }

    session.generation_count += 1;
    await session.save();

    res.json({
      allowed: true,
      status: "ALLOWED",
      status_code: "ALLOWED",
      count: session.generation_count,
      generation_count: session.generation_count,
      max_allowed: config.maxGuestGenerations,
      max_generations: config.maxGuestGenerations,
      remaining_generations: Math.max(0, config.maxGuestGenerations - session.generation_count),
      message: `Guest generation ${session.generation_count} of ${config.maxGuestGenerations} used.`
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to process guest attempt." });
  }
});

// Check guest session status without incrementing
router.get("/status", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sessionId = req.auth?.guestSessionId;
    if (!sessionId) {
      res.json({
        allowed: true,
        status: "ALLOWED",
        status_code: "ALLOWED",
        count: 0,
        generation_count: 0,
        max_allowed: config.maxGuestGenerations,
        max_generations: config.maxGuestGenerations,
        remaining_generations: config.maxGuestGenerations,
        message: "Fresh guest session."
      });
      return;
    }

    const session = await GuestSession.findOne({ session_id: sessionId });
    const count = session ? session.generation_count : 0;
    const allowed = count < config.maxGuestGenerations;

    res.json({
      allowed,
      status: allowed ? "ALLOWED" : "GUEST_GENERATION_LIMIT_REACHED",
      status_code: allowed ? "ALLOWED" : "GUEST_GENERATION_LIMIT_REACHED",
      count,
      generation_count: count,
      max_allowed: config.maxGuestGenerations,
      max_generations: config.maxGuestGenerations,
      remaining_generations: Math.max(0, config.maxGuestGenerations - count),
      message: allowed ? `Guest generations: ${count}/${config.maxGuestGenerations}` : "Guest limit reached."
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to check guest status." });
  }
});

export default router;
