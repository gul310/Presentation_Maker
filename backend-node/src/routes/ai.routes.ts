import { Router, Response } from "express";
import multer from "multer";
import { Types } from "mongoose";
import { Presentation, ISlide } from "../models/Presentation.js";
import { User } from "../models/User.js";
import { GuestSession } from "../models/GuestSession.js";
import { GenerationJob } from "../models/GenerationJob.js";
import { config } from "../config/config.js";
import { fastApiService } from "../services/fastapi.service.js";
import { unsplashService } from "../services/unsplash.service.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// 1. Upload source document (PDF, DOCX, PPTX)
router.post("/upload-source", upload.single("file"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ detail: "No file uploaded." });
      return;
    }

    const result = await fastApiService.uploadDocumentSource(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json(result);
  } catch (err: any) {
    console.error("Document upload error:", err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json(err?.response?.data || { detail: "Failed to process document." });
  }
});

// Helper: Parse and separate user prompt commands from the actual presentation topic
interface ParsedPromptInstructions {
  cleanSubject: string;
  professionalTitle: string;
  slideCount?: number;
  audience?: string;
  sections: string[];
}

export function isRawFilename(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (/\.(docx?|pdf|pptx?|txt|md|rtf)$/i.test(s)) return true;
  if (/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)+$/i.test(s) && (s.includes("_") || /draft|final|source|presentation|doc|mvp|capstone/i.test(s))) {
    return true;
  }
  return false;
}

export function cleanFilenameToTitle(filename: string): string {
  if (!filename) return "Executive Presentation";
  let name = filename.trim().replace(/\.[^/.]+$/, "");
  name = name.replace(/[_-]+/g, " ");
  name = name.replace(/\b(?:presentation|source|draft|final|v\d+|doc|notes|deck|slides?|mvp|capstone)\b/gi, " ");
  name = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  name = name.replace(/\s+/g, " ").trim();
  if (!name || name.length < 3) return "Executive Presentation";
  const minorWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "with", "in", "of"]);
  return name.split(" ").map((w, idx) => {
    const lw = w.toLowerCase();
    if (lw === "ai") return "AI";
    if (lw === "ui" || lw === "ux") return lw.toUpperCase();
    if (idx > 0 && minorWords.has(lw)) return lw;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

export function parsePromptInstructions(text: string): ParsedPromptInstructions {
  let raw = (text || "").trim();
  let slideCount: number | undefined;
  const countMatch = raw.match(/\b(\d+)\s*[-]?\s*(?:slide|slides|page|pages)\b/i);
  if (countMatch) {
    const num = parseInt(countMatch[1], 10);
    if (!isNaN(num) && num >= 3 && num <= 30) slideCount = num;
  }
  let audience: string | undefined;
  const audMatch = raw.match(/\bfor\s+(university students|students|executives|developers|engineers|investors|beginners|professionals)\b/i);
  if (audMatch) {
    audience = audMatch[1].split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  const sections: string[] = [];
  const secMatch = raw.match(/[,;]?\s*(?:explain|covering|highlighting|including|focus\s+on|with)\s+(?:its\s+)?(.*?)(?:\.|$)/i);
  if (secMatch) {
    let secText = secMatch[1];
    secText = secText.replace(/(?:relevant\s+|high\s*quality\s+|stock\s+)?(?:images|photos|pictures|visuals|diagrams)/gi, "");
    secText = secText.replace(/^[\s,]+|[\s,]+$/g, "");
    const rawSecs = secText.split(/,|\band\b/i);
    for (const s of rawSecs) {
      const cleanS = s.trim();
      if (cleanS.length > 2 && !/^(images|photos|visuals|diagrams|etc)$/i.test(cleanS)) {
        sections.push(cleanS.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "));
      }
    }
  }

  // 1. Strip conversational and procedural prompt boilerplate
  let cleaned = raw;
  cleaned = cleaned.replace(/^(?:please|can you|could you|i want you to|i would like to|kindly)\s+/i, "");
  cleaned = cleaned.replace(
    /^(?:create|make|prepare|generate|design|build|write|give\s+me|produce|develop|draft|present|explain|discuss|analyze|teach\s+me\s+about|talk\s+about|provide\s+(?:an?\s+)?(?:overview\s+of)?)\s+(?:a\s+|an\s+)?(?:\d+\s*[-]?\s*(?:slides?|pages?)?\s+)?(?:professional\s+|executive\s+|informative\s+|modern\s+|clean\s+|simple\s+)?(?:presentation|deck|slides?|pitch|overview)?(?:\s+(?:on|about|explaining|discussing|covering|regarding|for|with\s+regards?\s+to))?\s*/i,
    ""
  );
  cleaned = cleaned.replace(/^(?:presentation|slides?|deck|overview)\s+(?:on|about|covering|regarding)\s+/i, "");

  // Clean trailing image requests
  cleaned = cleaned.replace(/[,.]?\s*(?:with|including)\s+(?:relevant\s+|high\s*quality\s+|stock\s+)?(?:images|photos|pictures|visuals|diagrams).*$/i, "");

  // Clean sections clause from subject only if explicitly followed by section breakdown
  const secCleanMatch = cleaned.match(/[,;]?\s*(?:explain|covering|highlighting|including|focus\s+on)\s+(?:its\s+)?.*?(?:\.|$)/i);
  if (secCleanMatch && secCleanMatch.index !== undefined && secCleanMatch.index > 0) {
    cleaned = cleaned.substring(0, secCleanMatch.index).trim();
  }
  if (audience) {
    cleaned = cleaned.replace(new RegExp(`\\s+for\\s+${audience}`, "i"), "").trim();
  }
  // DO NOT arbitrarily cut off commas (e.g. 'Media: Architecture, Applications & Future Potential')
  cleaned = cleaned.replace(/[.,;:]+$/, "").trim();

  // If prompt was literally 'write a presentation' with no topic, fallback cleanly
  if (!cleaned || cleaned.length < 2) {
    cleaned = "Executive Strategy & Project Overview";
  }

  // Normalize casing for cleanSubject
  const minorWords = new Set(["in", "on", "of", "and", "the", "for", "with", "at", "to", "by", "&"]);
  const words = cleaned.split(/\s+/);
  const subjectWords = words.map((w, idx) => {
    const lw = w.toLowerCase();
    if (lw === "ai") return "AI";
    if (lw === "ui" || lw === "ux") return lw.toUpperCase();
    if (idx > 0 && minorWords.has(lw)) return lw;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
  const cleanSubject = subjectWords.join(" ") || "Strategic Presentation";

  let professionalTitle = cleanSubject;
  // If cleanSubject already has an explicit subtitle (e.g. 'Media: Architecture, Applications & Future Potential'), preserve it!
  const hasExistingSubtitle = cleanSubject.includes(":") || cleanSubject.includes(" - ");

  if (hasExistingSubtitle) {
    professionalTitle = cleanSubject;
  } else if (sections.length > 0) {
    let secPreview = sections.slice(0, 2).join(", ");
    if (sections.length > 2) {
      secPreview += ` & ${sections[sections.length - 1]}`;
    }
    professionalTitle = `${cleanSubject}: ${secPreview}`;
  } else {
    // Only append contextual subtitle if the subject is short (<= 3 words) and lacks colon
    const wordCount = cleanSubject.split(/\s+/).length;
    if (wordCount <= 3) {
      if (/fundamental/i.test(cleanSubject) || /introduction/i.test(cleanSubject)) {
        professionalTitle = `${cleanSubject}: Principles, Architecture & Strategic Impact`;
      } else if (/\b(ai|intelligence|machine learning|deep learning)\b/i.test(cleanSubject)) {
        professionalTitle = `${cleanSubject}: Innovations, Applications & Future Horizon`;
      } else if (/renewable|energy|solar|wind/i.test(cleanSubject)) {
        professionalTitle = `${cleanSubject}: Sustainable Technologies, Transition & Future Horizon`;
      } else if (/cloud|devops|cyber|security|blockchain/i.test(cleanSubject)) {
        professionalTitle = `${cleanSubject}: Architecture, Security & Enterprise Adoption`;
      } else {
        professionalTitle = `${cleanSubject}: Strategic Overview & Key Insights`;
      }
    } else {
      professionalTitle = cleanSubject;
    }
  }

  return { cleanSubject, professionalTitle, slideCount, audience, sections };
}

// Helper: Execute presentation generation job asynchronously with status tracking
async function executeGenerationJob(jobId: string): Promise<void> {
  const job = await GenerationJob.findById(jobId);
  if (!job) return;

  try {
    // 1. Progress: Generating slide content
    job.status = "processing";
    job.progress_stage = "generating";
    job.progress_message = job.source_type === "document"
      ? (job.custom_prompt ? "Analyzing document with your custom focus instructions..." : "Understanding document and extracting presentation outline...")
      : "Generating slide content...";
    await job.save();

    let cleanSubject: string;
    let professionalTitle: string;
    let effectiveSlideCount: number;
    let effectiveAudience: string;

    if (job.source_type === "document") {
      // For uploaded documents, prompt contains extracted text; do NOT treat entire text as a prompt string
      effectiveSlideCount = Number(job.slide_count) || 6;
      effectiveAudience = job.audience || "General";
      let docTitle = job.source_name ? job.source_name.trim() : "";
      if (isRawFilename(docTitle) || docTitle.includes("_") || !docTitle) {
        docTitle = cleanFilenameToTitle(docTitle);
      }
      cleanSubject = docTitle || "Executive Document Presentation";
      professionalTitle = docTitle || "Strategic Document Presentation";
    } else {
      const parsed = parsePromptInstructions(job.prompt);
      cleanSubject = parsed.cleanSubject;
      professionalTitle = parsed.professionalTitle;
      effectiveSlideCount = parsed.slideCount || Number(job.slide_count) || 6;
      effectiveAudience = parsed.audience || job.audience || "General";
    }

    let title_hint = job.source_name || cleanSubject;
    if (isRawFilename(title_hint) || title_hint.includes("_")) {
      title_hint = cleanFilenameToTitle(title_hint);
    }

    const aiResult = await fastApiService.generatePresentation({
      source_type: job.source_type,
      source_content: job.prompt,
      prompt: job.prompt,
      custom_prompt: job.custom_prompt || undefined,
      title_hint,
      source_name: title_hint,
      slide_count: effectiveSlideCount,
      language: job.language,
      audience: effectiveAudience,
      presentation_type: job.presentation_type || "Informative",
      tone: job.tone || "Professional"
    });

    // 2. Progress: Creating presentation layouts
    job.progress_stage = "layouts";
    job.progress_message = "Creating presentation layouts...";
    await job.save();

    const slides: ISlide[] = (aiResult.slides || []).map((s: any, idx: number) => {
      let bullets: string[] = Array.isArray(s.bullet_points) ? s.bullet_points : [];
      // Defensive: normalize bullets if oversized
      bullets = bullets.flatMap((b: string) => {
        const cleaned = String(b || "").trim().replace(/^[-*•\d.]+\s*/, "");
        if (!cleaned) return [];
        // If bullet is an oversized paragraph, split into sentences
        if (cleaned.length > 220) {
          const sents = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
          if (sents.length > 1) {
            return sents.slice(0, 2).map(sent => sent.length > 180 ? sent.substring(0, 177) + "..." : sent);
          }
          return [cleaned.substring(0, 217) + "..."];
        }
        return [cleaned];
      });

      // Defensive: Slide 1 Anti-Dumping Safeguard
      if (idx === 0) {
        const totalWords = bullets.join(" ").split(/\s+/).length;
        if (totalWords > 100 || (bullets.length > 0 && bullets[0].length > 180)) {
          bullets = [
            `Comprehensive executive briefing exploring foundational concepts and scope.`,
            `Detailed evaluation of architectural framework, methodology, and implementation.`,
            `Strategic analysis of key findings, performance benchmarks, and future horizon.`
          ];
        }
      }

      // Defensive: speaker notes limit
      let speakerNotes = String(s.speaker_notes || "").trim();
      if (speakerNotes.length > 550) {
        const sents = speakerNotes.split(/(?<=[.!?])\s+/);
        speakerNotes = sents.slice(0, 3).join(" ");
        if (speakerNotes.length > 500) {
          speakerNotes = speakerNotes.substring(0, 497) + "...";
        }
      }

      return {
        slide_number: s.slide_number || idx + 1,
        title: s.title || `Slide ${idx + 1}`,
        content: {
          subtitle: s.subtitle ? String(s.subtitle).substring(0, 150) : undefined,
          bullet_points: bullets.slice(0, 5),
          body: s.body ? String(s.body).substring(0, 300) : undefined,
          visual_type: s.visual_type || s.layout_type || "standard",
          steps: s.steps || undefined,
          timeline_items: s.timeline_items || undefined,
          comparison_columns: s.comparison_columns || undefined,
          stats: s.stats || undefined,
          cards: s.cards || undefined,
          table_data: s.table_data || undefined,
          hierarchy_levels: s.hierarchy_levels || undefined,
          ...(s.content || {})
        },
        layout_type: s.layout_type || s.visual_type || "standard",
        speaker_notes: speakerNotes,
        source_reference: s.source_reference || null
      };
    });

    // 2.5. Intelligent AI Image Selection & Automatic Unsplash Image Insertion
    if (unsplashService.isConfigured()) {
      job.progress_stage = "images" as any;
      job.progress_message = "Selecting context-aware visual photography...";
      await job.save().catch(() => {});
      try {
        const imageTopic = aiResult.title || cleanSubject || professionalTitle;
        await unsplashService.autoAttachImagesToDeck(slides, imageTopic);
      } catch (imgErr: any) {
        console.warn("[Async Job] Image attachment warning (non-fatal):", imgErr.message);
      }
    }

    // 3. Progress: Finalizing presentation and saving
    job.progress_stage = "saving";
    job.progress_message = "Finalizing your presentation...";
    await job.save();

    let presentationTitle = aiResult.title || professionalTitle || cleanSubject || "Generated Presentation";
    if (isRawFilename(presentationTitle) || presentationTitle.includes("_")) {
      presentationTitle = cleanFilenameToTitle(presentationTitle);
    }
    if (/^(?:please\s+)?(?:create|make|prepare|generate|design|build|write|give\s+me)\s+/i.test(presentationTitle)) {
      presentationTitle = professionalTitle || cleanSubject;
    }
    presentationTitle = presentationTitle.replace(/[_-]+/g, " ").replace(/\.[^/.]+$/, "").trim();

    const presentation = new Presentation({
      user_id: job.user_id || null,
      guest_session_id: job.user_id ? null : (job.guest_session_id || null),
      title: presentationTitle,
      source_type: job.source_type,
      source_name: job.source_type === "document" ? (cleanFilenameToTitle(job.source_name || cleanSubject)) : null,
      language: aiResult.language || job.language,
      preferred_language: aiResult.language || job.language,
      audience: effectiveAudience,
      presentation_type: job.presentation_type,
      tone: job.tone,
      slide_count: slides.length,
      status: "ready",
      visibility: "private",
      slides
    });

    await presentation.save();

    // Deduct user credits or increment guest generation count ONLY upon verified success
    if (job.user_id) {
      const user = await User.findById(job.user_id);
      if (user) {
        user.ai_credits.used += 1;
        user.ai_credits.remaining = Math.max(0, user.ai_credits.remaining - 1);
        await user.save();
      }
    } else if (job.guest_session_id) {
      const guestSession = await GuestSession.findOne({ session_id: job.guest_session_id });
      if (!guestSession) {
        await GuestSession.create({ session_id: job.guest_session_id, generation_count: 1 });
      } else {
        guestSession.generation_count += 1;
        await guestSession.save();
      }
    }

    // 4. Mark job as completed
    job.status = "completed";
    job.progress_stage = "completed";
    job.progress_message = "Presentation ready!";
    job.presentation_id = presentation._id as Types.ObjectId;
    await job.save();
    console.log(`[GenerationJob ${jobId}] Successfully completed presentation: ${presentation._id}`);

  } catch (err: any) {
    console.error(`[GenerationJob ${jobId}] Failed:`, err?.response?.data || err.message);
    const errorData = err?.response?.data;
    const detail = typeof errorData === "string"
      ? errorData
      : (errorData?.detail || errorData?.message || err?.message || "Failed to generate presentation.");

    job.status = "failed";
    job.progress_stage = "failed";
    job.progress_message = "Generation failed. Please try again.";
    job.error_message = detail;
    job.error_code = errorData?.error_code || (err?.code === "ECONNREFUSED" ? "AI_SERVICE_UNAVAILABLE" : "GENERATION_ERROR");
    await job.save();
  }
}

// 2. Submit or start presentation generation job
router.post("/generate", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      source_type = "prompt",
      source_content: raw_source_content,
      prompt,
      custom_prompt,
      title_hint: raw_title_hint,
      source_name,
      slide_count = 6,
      language = "English",
      audience = "General",
      presentation_type = "Informative",
      tone = "Professional"
    } = req.body;

    const source_content = (raw_source_content || prompt || "").trim();
    // In document mode, custom_prompt is the user's specific guidance/focus
    const effectiveCustomPrompt = (custom_prompt || "").trim() || (source_type === "document" && prompt && prompt !== raw_source_content ? prompt.trim() : null);
    let effectiveSlideCount: number;
    let effectiveAudience: string;
    let title_hint: string;

    if (source_type === "document") {
      effectiveSlideCount = Number(slide_count) || 6;
      effectiveAudience = audience || "General";
      const candidateTitle = raw_title_hint || source_name || "";
      title_hint = isRawFilename(candidateTitle) || candidateTitle.includes("_")
        ? cleanFilenameToTitle(candidateTitle)
        : (candidateTitle || "Executive Presentation");
    } else {
      const parsed = parsePromptInstructions(source_content);
      effectiveSlideCount = parsed.slideCount || Number(slide_count) || 6;
      effectiveAudience = parsed.audience || audience || "General";
      const candidateTitle = raw_title_hint || (source_name && !isRawFilename(source_name) ? source_name : parsed.cleanSubject);
      title_hint = isRawFilename(candidateTitle) || candidateTitle.includes("_")
        ? cleanFilenameToTitle(candidateTitle)
        : candidateTitle;
    }

    if (!source_content) {
      res.status(400).json({ detail: "Please enter a presentation topic or upload a document." });
      return;
    }

    // Credit and guest verification
    if (req.auth?.userId) {
      const user = await User.findById(req.auth.userId);
      if (user && user.ai_credits.remaining <= 0) {
        res.status(403).json({
          detail: "You have run out of AI credits. Please upgrade your plan in Settings to generate more decks!"
        });
        return;
      }
    } else {
      const sessionId = req.auth?.guestSessionId;
      if (sessionId) {
        const guestSession = await GuestSession.findOne({ session_id: sessionId });
        if (guestSession && guestSession.generation_count >= config.maxGuestGenerations) {
          res.status(403).json({
            status_code: "GUEST_GENERATION_LIMIT_REACHED",
            message: `You have used your ${config.maxGuestGenerations} free guest generations. Please create an account to generate unlimited presentations!`,
            detail: {
              status_code: "GUEST_GENERATION_LIMIT_REACHED",
              message: `You have used your ${config.maxGuestGenerations} free guest generations. Please create an account to generate unlimited presentations!`
            }
          });
          return;
        }
      }
    }

    // Duplicate submission prevention: Check if an active pending/processing job exists in last 30s
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    const existingJob = await GenerationJob.findOne({
      prompt: source_content,
      user_id: req.auth?.userId ? new Types.ObjectId(req.auth.userId) : null,
      guest_session_id: req.auth?.userId ? null : (req.auth?.guestSessionId || null),
      status: { $in: ["pending", "processing"] },
      created_at: { $gte: thirtySecsAgo }
    });

    if (existingJob) {
      res.status(200).json({
        job_id: existingJob._id.toString(),
        status: existingJob.status,
        progress_stage: existingJob.progress_stage,
        progress_message: existingJob.progress_message
      });
      return;
    }

    // Create new GenerationJob
    const job = new GenerationJob({
      user_id: req.auth?.userId ? new Types.ObjectId(req.auth.userId) : null,
      guest_session_id: req.auth?.userId ? null : (req.auth?.guestSessionId || null),
      prompt: source_content,
      custom_prompt: effectiveCustomPrompt,
      source_type,
      source_name: (source_name && (isRawFilename(source_name) || source_name.includes("_")) ? cleanFilenameToTitle(source_name) : source_name) || title_hint,
      slide_count: effectiveSlideCount,
      language,
      audience: effectiveAudience,
      presentation_type,
      tone,
      status: "pending",
      progress_stage: "preparing",
      progress_message: source_type === "document" ? "Understanding document and planning slides..." : "Preparing your presentation..."
    });

    await job.save();

    // Launch worker asynchronously
    executeGenerationJob(job._id.toString()).catch((e) => {
      console.error("[Async Job Unhandled Error]", e);
    });

    // Check if synchronous mode requested (e.g. for backward compatibility or automated scripts)
    const isSync = req.query.sync === "true" || req.headers["x-sync-mode"] === "true";
    if (isSync) {
      const startWait = Date.now();
      while (Date.now() - startWait < 180000) {
        await new Promise((r) => setTimeout(r, 1000));
        const current = await GenerationJob.findById(job._id);
        if (current?.status === "completed" && current.presentation_id) {
          const pres = await Presentation.findById(current.presentation_id);
          if (pres) {
            const formattedSlides = pres.slides.map((s: any) => ({
              ...(s.toObject ? s.toObject() : s),
              id: s._id ? s._id.toString() : String(s.slide_number)
            }));
            res.status(201).json({
              ...pres.toObject(),
              id: pres._id.toString(),
              user_id: pres.user_id ? pres.user_id.toString() : null,
              slides: formattedSlides
            });
            return;
          }
        } else if (current?.status === "failed") {
          res.status(500).json({
            detail: current.error_message || "Failed to generate presentation.",
            status_code: current.error_code || "GENERATION_ERROR"
          });
          return;
        }
      }
    }

    // Return 202 Accepted with job metadata
    res.status(202).json({
      job_id: job._id.toString(),
      status: "pending",
      progress_stage: "preparing",
      progress_message: "Preparing your presentation..."
    });
  } catch (err: any) {
    console.error("AI Generation initialization error:", err);
    res.status(500).json({ detail: err.message || "Failed to initialize generation job." });
  }
});

// 2b. Query generation job progress and retrieve completed presentation
router.get(["/generate/job/:jobId", "/jobs/:jobId"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = getParam(req.params.jobId);
    if (!jobId || !Types.ObjectId.isValid(jobId)) {
      res.status(400).json({ detail: "Invalid job ID." });
      return;
    }

    const job = await GenerationJob.findById(jobId);
    if (!job) {
      res.status(404).json({ detail: "Generation job not found." });
      return;
    }

    if (job.status === "completed" && job.presentation_id) {
      const presentation = await Presentation.findById(job.presentation_id);
      if (presentation) {
        const formattedSlides = presentation.slides.map((s: any) => ({
          ...(s.toObject ? s.toObject() : s),
          id: s._id ? s._id.toString() : String(s.slide_number)
        }));

        res.json({
          job_id: job._id.toString(),
          status: "completed",
          progress_stage: "completed",
          progress_message: "Presentation ready!",
          presentation: {
            ...presentation.toObject(),
            id: presentation._id.toString(),
            user_id: presentation.user_id ? presentation.user_id.toString() : null,
            slides: formattedSlides
          }
        });
        return;
      }
    }

    if (job.status === "failed") {
      res.json({
        job_id: job._id.toString(),
        status: "failed",
        progress_stage: "failed",
        progress_message: job.progress_message || "Generation failed.",
        error: job.error_message || "Failed to generate presentation.",
        error_code: job.error_code || "GENERATION_ERROR"
      });
      return;
    }

    res.json({
      job_id: job._id.toString(),
      status: job.status,
      progress_stage: job.progress_stage,
      progress_message: job.progress_message
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to fetch job status." });
  }
});

const LANG_MAP: Record<string, { code: string; name: string }> = {
  en: { code: "en", name: "English" }, english: { code: "en", name: "English" },
  ur: { code: "ur", name: "Urdu" }, urdu: { code: "ur", name: "Urdu" },
  zh: { code: "zh", name: "Chinese" }, chinese: { code: "zh", name: "Chinese" },
  ar: { code: "ar", name: "Arabic" }, arabic: { code: "ar", name: "Arabic" },
  es: { code: "es", name: "Spanish" }, spanish: { code: "es", name: "Spanish" },
  fr: { code: "fr", name: "French" }, french: { code: "fr", name: "French" },
  de: { code: "de", name: "German" }, german: { code: "de", name: "German" },
  pt: { code: "pt", name: "Portuguese" }, portuguese: { code: "pt", name: "Portuguese" },
  ru: { code: "ru", name: "Russian" }, russian: { code: "ru", name: "Russian" },
  ja: { code: "ja", name: "Japanese" }, japanese: { code: "ja", name: "Japanese" },
  ko: { code: "ko", name: "Korean" }, korean: { code: "ko", name: "Korean" },
  hi: { code: "hi", name: "Hindi" }, hindi: { code: "hi", name: "Hindi" },
  bn: { code: "bn", name: "Bengali" }, bengali: { code: "bn", name: "Bengali" },
  tr: { code: "tr", name: "Turkish" }, turkish: { code: "tr", name: "Turkish" },
  id: { code: "id", name: "Indonesian" }, indonesian: { code: "id", name: "Indonesian" },
  fil: { code: "fil", name: "Filipino" }, filipino: { code: "fil", name: "Filipino" }, tl: { code: "fil", name: "Filipino" },
  it: { code: "it", name: "Italian" }, italian: { code: "it", name: "Italian" },
  nl: { code: "nl", name: "Dutch" }, dutch: { code: "nl", name: "Dutch" },
  vi: { code: "vi", name: "Vietnamese" }, vietnamese: { code: "vi", name: "Vietnamese" },
  th: { code: "th", name: "Thai" }, thai: { code: "th", name: "Thai" }
};

const resolveLang = (input?: string) => {
  if (!input) return { code: "en", name: "English" };
  const clean = input.trim().toLowerCase();
  if (LANG_MAP[clean]) return LANG_MAP[clean];
  const prefix = clean.split("-")[0];
  if (LANG_MAP[prefix]) return LANG_MAP[prefix];
  return { code: clean, name: input.trim() };
};

// 3. Teach Me slide explanation
router.post(["/presentation/:id/slides/:slideId/teach", "/presentations/:id/slides/:slideId/teach"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const reqLang = req.body?.language || req.query?.language || req.query?.lang;

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

    const targetLang = (reqLang as string) || presentation.preferred_language || presentation.language || "English";

    let contentText = `Title: ${slide.title}\n`;
    if (slide.content) {
      if (slide.content.subtitle) contentText += `Subtitle: ${slide.content.subtitle}\n`;
      if (slide.content.bullet_points) {
        contentText += "Bullet Points:\n" + slide.content.bullet_points.map((bp: string) => `- ${bp}`).join("\n");
      }
    }
    if (slide.speaker_notes) {
      contentText += `\nSpeaker Notes: ${slide.speaker_notes}`;
    }

    const aiResult = await fastApiService.teachSlide({
      slide_title: slide.title,
      slide_content_text: contentText,
      language: targetLang,
      audience: presentation.audience || "General"
    });

    res.json({
      presentation_id: id,
      slide_id: slideId,
      slide_title: slide.title,
      explanation: aiResult.explanation,
      key_terms: aiResult.key_terms || [],
      simple_example: aiResult.simple_example || "",
      summary: aiResult.summary || "",
      language: targetLang
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to generate Teach Me explanation." });
  }
});

// 4. Refine slide content
router.post(["/presentation/:id/slides/:slideId/refine", "/presentations/:id/slides/:slideId/refine"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const slideId = getParam(req.params.slideId);
    const { action, custom_instruction } = req.body;

    const presentation = await Presentation.findById(id);
    if (!presentation) {
      res.status(404).json({ detail: "Presentation not found." });
      return;
    }

    const slide: any = presentation.slides.find(
      s => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
    );

    if (!slide) {
      res.status(404).json({ detail: "Slide not found." });
      return;
    }

    let contentStr = "";
    if (slide.content) {
      if (slide.content.subtitle) contentStr += `Subtitle: ${slide.content.subtitle}\n`;
      if (slide.content.bullet_points) {
        contentStr += "Bullet Points:\n" + slide.content.bullet_points.map((bp: string) => `- ${bp}`).join("\n");
      }
    }
    if (slide.speaker_notes) {
      contentStr += `\nCurrent Speaker Notes: ${slide.speaker_notes}`;
    }

    const refined = await fastApiService.refineSlide({
      slide_title: slide.title,
      current_content: contentStr,
      action: action || "improve_clarity",
      custom_instruction,
      language: presentation.language,
      audience: presentation.audience || "General"
    });

    const existingContent = slide.content?.toObject ? slide.content.toObject() : (slide.content || {});
    slide.title = refined.title || slide.title;
    slide.content = {
      ...existingContent,
      subtitle: refined.subtitle !== undefined ? refined.subtitle : existingContent?.subtitle,
      bullet_points: refined.bullet_points || existingContent?.bullet_points || []
    };
    if (refined.speaker_notes) {
      slide.speaker_notes = refined.speaker_notes;
    }

    await presentation.save();

    res.json({
      ...(slide.toObject ? slide.toObject() : slide),
      id: slide._id ? slide._id.toString() : String(slide.slide_number)
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || "Failed to refine slide." });
  }
});

// 5. On-Demand Multilingual Slide Translation with MongoDB Dual-Key Caching
router.post(
  ["/presentation/:id/slides/:slideId/translate", "/presentations/:id/slides/:slideId/translate"],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const slideId = getParam(req.params.slideId);
      const { target_language } = req.body;

      if (!target_language || !target_language.trim()) {
        res.status(400).json({ detail: "target_language is required." });
        return;
      }

      const presentation = await Presentation.findById(id);
      if (!presentation) {
        res.status(404).json({ detail: "Presentation not found." });
        return;
      }

      const slide: any = presentation.slides.find(
        s => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
      );

      if (!slide) {
        res.status(404).json({ detail: "Slide not found." });
        return;
      }

      const targetLangInfo = resolveLang(target_language);
      const primaryLang = presentation.preferred_language || presentation.language || "English";
      const primaryLangInfo = resolveLang(primaryLang);

      // If requested language matches primary language, return original slide
      if (
        targetLangInfo.code === primaryLangInfo.code ||
        targetLangInfo.name.toLowerCase() === primaryLangInfo.name.toLowerCase()
      ) {
        res.json({
          presentation_id: id,
          slide_id: slideId,
          title: slide.title,
          content: slide.content || {},
          speaker_notes: slide.speaker_notes || "",
          target_language: targetLangInfo.name,
          target_language_code: targetLangInfo.code,
          is_original: true,
          cached: true
        });
        return;
      }

      // Check MongoDB translation cache for either code or name
      const cached = slide.translations?.[targetLangInfo.code] || slide.translations?.[targetLangInfo.name];
      if (cached) {
        res.json({
          presentation_id: id,
          slide_id: slideId,
          title: cached.title,
          content: cached.content || {},
          speaker_notes: cached.speaker_notes || "",
          target_language: targetLangInfo.name,
          target_language_code: targetLangInfo.code,
          is_original: false,
          cached: true
        });
        return;
      }

      let contentToSend = slide.content || {};
      if (typeof contentToSend === 'string') {
        contentToSend = { bullet_points: [contentToSend] };
      } else if (Array.isArray(contentToSend)) {
        contentToSend = { bullet_points: contentToSend };
      }

      // Call Python Microservice for AI Translation
      const translated = await fastApiService.translateSlide({
        slide_title: slide.title,
        slide_content: contentToSend,
        speaker_notes: slide.speaker_notes || "",
        source_language: primaryLang,
        target_language: targetLangInfo.name
      });

      const translatedPayload = {
        title: translated.title || slide.title,
        content: translated.content || slide.content || {},
        speaker_notes: translated.speaker_notes !== undefined ? translated.speaker_notes : slide.speaker_notes
      };

      // Cache under BOTH language code ('fr', 'ur') AND language name ('French', 'Urdu')
      if (!slide.translations) {
        slide.translations = {};
      }
      slide.translations[targetLangInfo.code] = translatedPayload;
      slide.translations[targetLangInfo.name] = translatedPayload;

      presentation.markModified("slides");
      await presentation.save();

      res.json({
        presentation_id: id,
        slide_id: slideId,
        title: translatedPayload.title,
        content: translatedPayload.content,
        speaker_notes: translatedPayload.speaker_notes,
        target_language: targetLangInfo.name,
        target_language_code: targetLangInfo.code,
        is_original: false,
        cached: false
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Failed to translate slide.";
      console.error("Translation error [presentation:", req.params.id, "slide:", req.params.slideId, "target:", req.body?.target_language, "]:", errorMsg);
      res.status(502).json({ detail: "Unable to translate the presentation into the selected language. Please try again." });
    }
  }
);

// 5b. Batch Full-Deck Translation Route
router.post(
  ["/presentation/:id/translate-deck", "/presentations/:id/translate-deck"],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const { target_language } = req.body;

      if (!target_language || !target_language.trim()) {
        res.status(400).json({ detail: "target_language is required." });
        return;
      }

      const presentation = await Presentation.findById(id);
      if (!presentation) {
        res.status(404).json({ detail: "Presentation not found." });
        return;
      }

      const targetLangInfo = resolveLang(target_language);
      const primaryLang = presentation.preferred_language || presentation.language || "English";
      const primaryLangInfo = resolveLang(primaryLang);

      const isOriginal = targetLangInfo.code === primaryLangInfo.code || targetLangInfo.name.toLowerCase() === primaryLangInfo.name.toLowerCase();

      const translatedSlides = [];
      let didModify = false;

      for (const slide of presentation.slides) {
        const slideId = slide._id ? slide._id.toString() : String(slide.slide_number);

        if (isOriginal) {
          translatedSlides.push({
            slide_id: slideId,
            slide_number: slide.slide_number,
            title: slide.title,
            content: slide.content || {},
            speaker_notes: slide.speaker_notes || "",
            target_language: targetLangInfo.name,
            target_language_code: targetLangInfo.code,
            is_original: true,
            cached: true
          });
          continue;
        }

        const cached = slide.translations?.[targetLangInfo.code] || slide.translations?.[targetLangInfo.name];
        if (cached) {
          translatedSlides.push({
            slide_id: slideId,
            slide_number: slide.slide_number,
            title: cached.title,
            content: cached.content || {},
            speaker_notes: cached.speaker_notes || "",
            target_language: targetLangInfo.name,
            target_language_code: targetLangInfo.code,
            is_original: false,
            cached: true
          });
          continue;
        }

        let contentToSend = slide.content || {};
        if (typeof contentToSend === 'string') {
          contentToSend = { bullet_points: [contentToSend] };
        } else if (Array.isArray(contentToSend)) {
          contentToSend = { bullet_points: contentToSend };
        }

        try {
          const translated = await fastApiService.translateSlide({
            slide_title: slide.title,
            slide_content: contentToSend,
            speaker_notes: slide.speaker_notes || "",
            source_language: primaryLang,
            target_language: targetLangInfo.name
          });

          const translatedPayload = {
            title: translated.title || slide.title,
            content: translated.content || slide.content || {},
            speaker_notes: translated.speaker_notes !== undefined ? translated.speaker_notes : slide.speaker_notes
          };

          if (!slide.translations) {
            slide.translations = {};
          }
          slide.translations[targetLangInfo.code] = translatedPayload;
          slide.translations[targetLangInfo.name] = translatedPayload;
          didModify = true;

          translatedSlides.push({
            slide_id: slideId,
            slide_number: slide.slide_number,
            title: translatedPayload.title,
            content: translatedPayload.content,
            speaker_notes: translatedPayload.speaker_notes,
            target_language: targetLangInfo.name,
            target_language_code: targetLangInfo.code,
            is_original: false,
            cached: false
          });
        } catch (slideErr: any) {
          console.warn(`Deck translate error for slide ${slideId}:`, slideErr?.message);
          // Fallback to original if single slide translation encounters issue
          translatedSlides.push({
            slide_id: slideId,
            slide_number: slide.slide_number,
            title: slide.title,
            content: slide.content || {},
            speaker_notes: slide.speaker_notes || "",
            target_language: targetLangInfo.name,
            target_language_code: targetLangInfo.code,
            is_original: true,
            cached: false
          });
        }
      }

      if (didModify) {
        presentation.markModified("slides");
        await presentation.save();
      }

      res.json({
        presentation_id: id,
        target_language: targetLangInfo.name,
        target_language_code: targetLangInfo.code,
        slides: translatedSlides
      });
    } catch (err: any) {
      console.error("Batch translate deck error:", err?.message);
      res.status(502).json({ detail: "Unable to translate the presentation into the selected language. Please try again." });
    }
  }
);


// 6. Multi-format Exports (PPTX, PDF, PNG, HTML, JSON, Notes, Package)
router.get(
  ["/presentation/:id/export/:format", "/presentations/:id/export/:format", "/presentation/:id/export", "/presentations/:id/export"],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = getParam(req.params.id);
    const format = getParam(req.params.format) || (req.query.format as string) || "pptx";
    const { slide, language, lang } = req.query;

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
      res.status(403).json({ detail: "You do not have permission to export this presentation." });
      return;
    }

    const userTheme = req.auth?.user
      ? {
          app_color_theme: req.auth.user.app_color_theme,
          custom_primary_color: req.auth.user.custom_primary_color
        }
      : null;

    const slideNum = slide ? parseInt(slide as string, 10) : undefined;
    const requestedLang = (language as string) || (lang as string) || presentation.preferred_language || presentation.language || "English";

    const exportResponse = await fastApiService.exportPresentation(
      format.toLowerCase(),
      presentation,
      userTheme,
      slideNum,
      requestedLang
    );

    if (exportResponse.headers["content-type"]) {
      res.setHeader("Content-Type", String(exportResponse.headers["content-type"]));
    }
    if (exportResponse.headers["content-disposition"]) {
      res.setHeader("Content-Disposition", String(exportResponse.headers["content-disposition"]));
    }

    res.send(Buffer.from(exportResponse.data));
  } catch (err: any) {
    console.error("Export error:", err?.response?.data || err.message);
    res.status(500).json({ detail: "Failed to export presentation." });
  }
});

// 7. Voice Narration Speech Synthesis (Multilingual Backend TTS)
router.post(["/tts/synthesize", "/narration/synthesize"], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text, language = "English", use_cache = true } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ detail: "Text is required for narration synthesis." });
      return;
    }

    const ttsResult = await fastApiService.synthesizeTTS({
      text: text.trim(),
      language,
      use_cache
    });

    res.setHeader("Content-Type", String(ttsResult.contentType || "audio/mpeg"));
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(ttsResult.data));
  } catch (err: any) {
    console.error("TTS Synthesis error:", err?.response?.data || err.message);
    res.status(500).json({ detail: "Failed to synthesize voice narration." });
  }
});

// 8. Slide-Specific Narration Stream
router.get(
  ["/presentation/:id/slides/:slideId/narration", "/presentations/:id/slides/:slideId/narration"],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const slideId = getParam(req.params.slideId);
      const requestedLang = (req.query.language as string) || (req.query.lang as string) || "";

      const presentation = await Presentation.findById(id).lean();
      if (!presentation) {
        res.status(404).json({ detail: "Presentation not found." });
        return;
      }

      const slide: any = presentation.slides.find(
        (s: any) => (s._id && s._id.toString() === slideId) || String(s.slide_number) === slideId
      );

      if (!slide) {
        res.status(404).json({ detail: "Slide not found." });
        return;
      }

      const activeLang = requestedLang.trim() || presentation.preferred_language || presentation.language || "English";
      let speechText = "";

      // Check for translated notes if viewing in non-original language
      if (
        requestedLang &&
        slide.translations &&
        slide.translations[requestedLang] &&
        slide.translations[requestedLang].speaker_notes
      ) {
        speechText = slide.translations[requestedLang].speaker_notes;
      } else if (slide.speaker_notes && slide.speaker_notes.trim()) {
        speechText = slide.speaker_notes.trim();
      } else {
        // Fallback to title and bullet points
        const bullets = slide.content?.bullet_points?.join(". ") || "";
        speechText = `${slide.title}. ${slide.content?.subtitle ? slide.content.subtitle + '. ' : ''}${bullets}`;
      }

      if (!speechText.trim()) {
        res.status(400).json({ detail: "No speech content available for this slide." });
        return;
      }

      const ttsResult = await fastApiService.synthesizeTTS({
        text: speechText.trim(),
        language: activeLang,
        use_cache: true
      });

      res.setHeader("Content-Type", String(ttsResult.contentType || "audio/mpeg"));
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(ttsResult.data));
    } catch (err: any) {
      console.error("Slide narration error:", err?.response?.data || err.message);
      res.status(500).json({ detail: "Failed to generate slide narration." });
    }
  }
);

export default router;

