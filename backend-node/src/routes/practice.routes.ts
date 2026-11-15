import { Router, Response } from "express";
import { Types } from "mongoose";
import { PracticeSession, IPracticeSlideResult } from "../models/PracticeSession.js";
import { Presentation } from "../models/Presentation.js";
import { fastApiService } from "../services/fastapi.service.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// 1. Create practice session
router.post("/sessions", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { presentation_id } = req.body;
    if (!presentation_id || !Types.ObjectId.isValid(presentation_id)) {
      res.status(400).json({ detail: "Valid presentation_id required." });
      return;
    }

    const presentation = await Presentation.findById(presentation_id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const slideResults: IPracticeSlideResult[] = presentation.slides.map((s, idx) => ({
      slide_id: s._id ? s._id.toString() : String(s.slide_number),
      slide_number: s.slide_number || idx + 1,
      title: s.title,
      transcript: "",
      duration_seconds: 0,
      words_spoken: 0,
      words_per_minute: 0,
      completion_status: "skipped",
      score: null,
      feedback: null
    }));

    const session = new PracticeSession({
      user_id: req.auth?.userId ? new Types.ObjectId(req.auth.userId) : null,
      guest_session_id: req.auth?.userId ? null : (req.auth?.guestSessionId || null),
      presentation_id: presentation._id,
      presentation_title: presentation.title,
      started_at: new Date(),
      total_slides: presentation.slides.length,
      completed_slides: 0,
      status: "in_progress",
      slide_results: slideResults
    });

    await session.save();

    res.status(201).json({
      ...session.toObject(),
      id: session._id.toString(),
      presentation_id: presentation._id.toString()
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to start practice session." });
  }
});

// 2. Get practice session
router.get("/sessions/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(404).json({ detail: "Session not found." });
      return;
    }

    const session = await PracticeSession.findById(id).lean();
    if (!session) {
      res.status(404).json({ detail: "Session not found." });
      return;
    }

    res.json({
      ...session,
      id: session._id.toString(),
      presentation_id: session.presentation_id.toString()
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch practice session." });
  }
});

// 3. Save live slide transcript and metrics
router.put("/sessions/:id/slides/:slideId", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const { transcript = "", duration_seconds = 0, completion_status = "completed" } = req.body;

    const session = await PracticeSession.findById(id);
    if (!session) {
      res.status(404).json({ detail: "Session not found." });
      return;
    }

    const cleanTranscript = (transcript || "").trim();
    const wordsSpoken = cleanTranscript ? cleanTranscript.split(/\s+/).filter(Boolean).length : 0;
    const duration = Math.max(0, Number(duration_seconds) || 0);
    const wpm = duration > 0 ? Math.round((wordsSpoken / (duration / 60)) * 10) / 10 : 0;

    let targetSlide = session.slide_results.find(
      s => String(s.slide_id) === slideId || String(s.slide_number) === slideId
    );

    if (!targetSlide) {
      const slideNum = parseInt(slideId, 10);
      if (!isNaN(slideNum) && slideNum <= session.slide_results.length) {
        targetSlide = session.slide_results[slideNum - 1];
      }
    }

    if (targetSlide) {
      targetSlide.transcript = cleanTranscript;
      targetSlide.duration_seconds = duration;
      targetSlide.words_spoken = wordsSpoken;
      targetSlide.words_per_minute = wpm;
      targetSlide.completion_status = completion_status;
    }

    session.completed_slides = session.slide_results.filter(s => s.completion_status === "completed").length;
    session.duration_seconds = session.slide_results.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    await session.save();

    res.json({
      message: "Slide transcript updated.",
      slide_result: targetSlide
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to update transcript." });
  }
});

// 4. Finish practice session & run AI evaluation
router.post("/sessions/:id/finish", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const session = await PracticeSession.findById(id);
    if (!session) {
      res.status(404).json({ detail: "Session not found." });
      return;
    }

    const presentation = await Presentation.findById(session.presentation_id);
    if (!presentation) {
      res.status(404).json({ detail: "Associated presentation not found." });
      return;
    }

    const slideEvalInputs = session.slide_results.map((r, idx) => {
      const pSlide = presentation.slides[idx] || ({} as any);
      const content = (pSlide.content as any) || {};
      let bulletPoints: string[] = [];
      if (Array.isArray(content.bullet_points) && content.bullet_points.length > 0) {
        bulletPoints = content.bullet_points.filter((b: any) => typeof b === 'string' && b.trim() !== '');
      } else if (Array.isArray(content.cards) && content.cards.length > 0) {
        bulletPoints = content.cards.map((c: any) => `${c.title || ''}: ${c.description || ''}`.trim());
      } else if (Array.isArray(content.steps) && content.steps.length > 0) {
        bulletPoints = content.steps.map((s: any) => `${s.label || ''}: ${s.description || ''}`.trim());
      } else if (Array.isArray(content.timeline_items) && content.timeline_items.length > 0) {
        bulletPoints = content.timeline_items.map((t: any) => `${t.period || ''} ${t.title || ''}: ${t.description || ''}`.trim());
      } else if (Array.isArray(content.stats) && content.stats.length > 0) {
        bulletPoints = content.stats.map((s: any) => `${s.metric || ''} ${s.label || ''}: ${s.description || ''}`.trim());
      } else if (Array.isArray(content.comparison_columns) && content.comparison_columns.length > 0) {
        bulletPoints = content.comparison_columns.flatMap((c: any) => (Array.isArray(c.points) && c.points.length > 0 ? c.points : [c.heading || '']));
      } else if (content.body) {
        bulletPoints = [content.body];
      }

      return {
        slide_number: r.slide_number,
        title: pSlide.title || r.title,
        bullet_points: bulletPoints,
        speaker_notes: pSlide.speaker_notes || "",
        transcript: r.transcript || "",
        duration_seconds: r.duration_seconds || 0,
        words_spoken: r.words_spoken || 0,
        words_per_minute: r.words_per_minute || 0
      };
    });

    const practiceLanguage = req.body?.language || presentation.preferred_language || presentation.language || "English";

    let aiEvaluation: any = null;
    try {
      aiEvaluation = await fastApiService.evaluatePractice({
        presentation_title: presentation.title,
        language: practiceLanguage,
        slide_eval_inputs: slideEvalInputs
      });
    } catch (aiErr: any) {
      console.warn("AI Practice evaluation fallback:", aiErr?.message);
      const avgWpm = session.slide_results.reduce((a, b) => a + b.words_per_minute, 0) / (session.slide_results.length || 1);

      aiEvaluation = {
        overall_score: session.completed_slides > 0 ? Math.min(95, Math.round((session.completed_slides / session.total_slides) * 85 + 10)) : 50,
        strengths: ["Completed practice run-through", "Maintained steady slide progression"],
        areas_for_improvement: ["Practice speaking more fluidly with slide bullet points", "Refine delivery pacing"],
        summary: "Good rehearsal effort. Continue practicing with live speech recognition.",
        slide_evaluations: session.slide_results.map(s => ({
          slide_number: s.slide_number,
          score: s.completion_status === "completed" ? 80 : 0,
          strengths: ["Attempted delivery"],
          improvements: ["Expand on key points"],
          feedback_notes: s.transcript ? "Speech captured successfully." : "Slide was skipped."
        }))
      };
    }

    if (aiEvaluation?.slide_evaluations) {
      aiEvaluation.slide_evaluations.forEach((evalItem: any) => {
        const match = session.slide_results.find(s => s.slide_number === evalItem.slide_number);
        if (match) {
          match.score = evalItem.score;
          match.feedback = evalItem;
        }
      });
    }

    session.completed_at = new Date();
    session.status = "completed";
    session.overall_score = typeof aiEvaluation?.overall_score === "number" ? aiEvaluation.overall_score : 75;
    session.report = {
      overall_score: typeof session.overall_score === "number" ? session.overall_score : 75,
      strengths: aiEvaluation?.strengths || [],
      areas_for_improvement: aiEvaluation?.areas_for_improvement || [],
      summary: aiEvaluation?.summary || "",
      wpm_average: Math.round((session.slide_results.reduce((a, b) => a + b.words_per_minute, 0) / (session.slide_results.length || 1)) * 10) / 10,
      total_time_seconds: session.duration_seconds,
      slide_evaluations: aiEvaluation?.slide_evaluations || []
    };

    await session.save();

    res.json({
      session_id: session._id.toString(),
      presentation_id: session.presentation_id.toString(),
      presentation_title: session.presentation_title,
      overall_score: typeof session.overall_score === "number" ? session.overall_score : 75,
      duration_seconds: session.duration_seconds,
      total_slides: session.total_slides,
      completed_slides: session.completed_slides,
      report: session.report,
      slide_results: session.slide_results
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to finish practice session." });
  }
});

// 5. Get report
router.get("/sessions/:id/report", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const session = await PracticeSession.findById(id).lean();
    if (!session) {
      res.status(404).json({ detail: "Session not found." });
      return;
    }

    res.json({
      session_id: session._id.toString(),
      presentation_id: session.presentation_id.toString(),
      presentation_title: session.presentation_title,
      overall_score: typeof session.overall_score === "number" ? session.overall_score : 75,
      duration_seconds: session.duration_seconds,
      total_slides: session.total_slides,
      completed_slides: session.completed_slides,
      report: session.report,
      slide_results: session.slide_results
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch report." });
  }
});

// 6. Practice history
router.get("/history", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {};
    if (req.auth?.userId) {
      filter.user_id = new Types.ObjectId(req.auth.userId);
    } else if (req.auth?.guestSessionId) {
      filter.guest_session_id = req.auth.guestSessionId;
      filter.$or = [{ user_id: null }, { user_id: { $exists: false } }];
    } else {
      res.json([]);
      return;
    }

    const history = await PracticeSession.find(filter)
      .sort({ created_at: -1 })
      .limit(30)
      .lean();

    const formatted = history.map(h => ({
      ...h,
      id: h._id.toString(),
      session_id: h._id.toString(),
      presentation_id: h.presentation_id.toString()
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch practice history." });
  }
});

export default router;

