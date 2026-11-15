import { config } from "../config/config.js";
import { ISlide, ISlideImage } from "../models/Presentation.js";

export interface UnsplashPhotoResult {
  photo_id: string;
  url: string;
  regular_url: string;
  small_url: string;
  thumb_url: string;
  download_location: string;
  photographer_name: string;
  photographer_profile_url: string;
  photo_page_url: string;
  alt_text: string;
  width: number;
  height: number;
  orientation?: "landscape" | "portrait" | "squarish";
  relevance_score?: number;
}

export interface ImageSelectionDecision {
  requires_image: boolean;
  image_search_query: string;
  fallback_search_query?: string;
  preferred_orientation: "landscape" | "portrait" | "squarish";
  image_position: "hero" | "split_left" | "split_right" | "card" | "background";
  image_alt_text: string;
  selection_reason: string;
  domain?: string;
}

interface CacheEntry {
  data: UnsplashPhotoResult[];
  total: number;
  expiresAt: number;
}

// Domain visual taxonomy with concrete photographic terms and negative rejection keywords
interface DomainProfile {
  domain: string;
  matchers: string[];
  defaultHeroQuery: string;
  visualKeywords: string[];
  negativeKeywords: string[];
}

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    domain: "healthcare",
    matchers: [
      "health", "healthcare", "medical", "medicine", "clinical", "doctor",
      "hospital", "patient", "disease", "biomedical", "diagnosis", "surgery",
      "radiology", "pharma", "clinic", "stethoscope", "physician", "mri"
    ],
    defaultHeroQuery: "medical healthcare artificial intelligence doctor hospital",
    visualKeywords: [
      "doctor", "hospital", "medical", "patient", "clinical", "surgery",
      "laboratory", "health", "nurse", "clinic", "stethoscope", "radiology",
      "scanner", "mri", "biomedical", "physician", "operating room", "medic"
    ],
    negativeKeywords: ["typewriter", "party", "car repair", "beach party", "animal pet", "fashion model", "snack"]
  },
  {
    domain: "cybersecurity",
    matchers: [
      "cyber", "cybersecurity", "security", "hacker", "firewall", "encryption",
      "network security", "infosec", "malware", "phishing", "ransomware",
      "vulnerability", "antivirus", "threat"
    ],
    defaultHeroQuery: "cybersecurity network security computer protection",
    visualKeywords: [
      "cybersecurity", "security", "network", "firewall", "hacker", "code",
      "server", "data", "encryption", "digital", "protection", "computer",
      "padlock", "matrix", "cloud", "database", "terminal", "cyber"
    ],
    negativeKeywords: ["door lock", "house key", "bicycle lock", "padlock door", "wardrobe", "gardening"]
  },
  {
    domain: "renewable_energy",
    matchers: [
      "renewable", "solar", "wind", "clean energy", "green energy", "turbines",
      "photovoltaic", "sustainability", "geothermal", "hydroelectric", "ecology",
      "carbon neutral", "zero emission"
    ],
    defaultHeroQuery: "solar panels wind turbines renewable energy",
    visualKeywords: [
      "solar", "wind", "turbine", "renewable", "energy", "clean", "panels",
      "green", "power", "ecology", "environment", "photovoltaic", "electricity",
      "generator", "landscape", "sunlight"
    ],
    negativeKeywords: ["oil spill", "coal mine", "factory smoke", "gas pump", "gasoline", "diesel"]
  },
  {
    domain: "education",
    matchers: [
      "education", "learning", "student", "school", "university", "teaching",
      "classroom", "e-learning", "online learning", "academic", "study", "teacher"
    ],
    defaultHeroQuery: "online learning student laptop digital education",
    visualKeywords: [
      "student", "classroom", "school", "education", "learning", "teacher",
      "university", "laptop", "study", "books", "library", "college", "academic"
    ],
    negativeKeywords: ["party", "nightclub", "gaming tournament", "toddler toy"]
  },
  {
    domain: "business_finance",
    matchers: [
      "business", "finance", "banking", "fintech", "investment", "stock",
      "economy", "market", "corporate", "venture", "startup", "commerce"
    ],
    defaultHeroQuery: "business technology finance modern corporate office",
    visualKeywords: [
      "business", "meeting", "office", "corporate", "finance", "team",
      "strategy", "handshake", "skyscraper", "conference", "investor", "financial"
    ],
    negativeKeywords: ["messy room", "casual party", "fast food", "bedroom"]
  },
  {
    domain: "artificial_intelligence",
    matchers: [
      "artificial intelligence", "ai", "machine learning", "deep learning",
      "neural network", "robotics", "automation", "algorithm", "data science"
    ],
    defaultHeroQuery: "artificial intelligence robotics technology neural network",
    visualKeywords: [
      "robot", "artificial intelligence", "technology", "neural", "circuit",
      "automation", "computer", "digital", "data", "algorithm", "science", "future"
    ],
    negativeKeywords: ["antique", "vintage typewriter", "old car", "nature flower"]
  }
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache
const searchCache = new Map<string, CacheEntry>();

let rateLimitRemaining: number | null = null;
let rateLimitTotal: number | null = null;

export class UnsplashService {
  private static instance: UnsplashService;

  private constructor() {
    this.verifyConfiguration();
  }

  public static getInstance(): UnsplashService {
    if (!UnsplashService.instance) {
      UnsplashService.instance = new UnsplashService();
    }
    return UnsplashService.instance;
  }

  public isConfigured(): boolean {
    const key = config.unsplashAccessKey;
    return Boolean(key && key.trim() !== "" && key !== "your_access_key" && key !== "your_unsplash_access_key_here");
  }

  public verifyConfiguration(): void {
    if (this.isConfigured()) {
      console.log("[Unsplash Service] Unsplash API credentials configured successfully.");
    } else {
      console.warn("[Unsplash Service] Unsplash API credentials are not configured or contain placeholder. Search will return a configuration notice.");
    }
  }

  public getStatus() {
    return {
      configured: this.isConfigured(),
      rate_limit_total: rateLimitTotal,
      rate_limit_remaining: rateLimitRemaining,
      cache_size: searchCache.size
    };
  }

  /**
   * Search photographs on Unsplash with caching, rate limit checking, and timeout.
   */
  public async searchPhotos(
    query: string,
    options: {
      page?: number;
      perPage?: number;
      orientation?: "landscape" | "portrait" | "squarish";
    } = {}
  ): Promise<{ results: UnsplashPhotoResult[]; total: number }> {
    if (!this.isConfigured()) {
      throw new Error("UNSPLASH_NOT_CONFIGURED: Unsplash Access Key is not configured in backend environment variables.");
    }

    const cleanQuery = (query || "").trim();
    if (!cleanQuery) {
      return { results: [], total: 0 };
    }

    const page = Math.max(1, options.page || 1);
    const perPage = Math.min(30, Math.max(1, options.perPage || 10));
    const orientation = options.orientation || "landscape";

    const cacheKey = `${cleanQuery.toLowerCase()}_${orientation}_${page}_${perPage}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { results: cached.data, total: cached.total };
    }

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", cleanQuery);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("content_filter", "high"); // Professional family-safe content

    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Client-ID ${config.unsplashAccessKey}`,
            "Accept-Version": "v1",
            "User-Agent": "PresentationMaker/1.0"
          },
          signal: controller.signal
        });

        // Update rate limits from headers
        const remainingHeader = response.headers.get("x-ratelimit-remaining");
        const totalHeader = response.headers.get("x-ratelimit-limit");
        if (remainingHeader) rateLimitRemaining = parseInt(remainingHeader, 10);
        if (totalHeader) rateLimitTotal = parseInt(totalHeader, 10);

        if (response.status === 401 || response.status === 403) {
          throw new Error(`UNSPLASH_AUTH_ERROR: Invalid or unauthorized Unsplash API key (HTTP ${response.status}).`);
        }

        if (response.status === 429) {
          throw new Error("UNSPLASH_RATE_LIMIT: Unsplash API hourly rate limit exceeded. Please try again shortly.");
        }

        if (!response.ok) {
          throw new Error(`UNSPLASH_API_ERROR: Unsplash API responded with HTTP ${response.status}`);
        }

        const data: any = await response.json();
        const rawResults = Array.isArray(data.results) ? data.results : [];

        const results: UnsplashPhotoResult[] = rawResults.map((item: any) => {
          const photographerName = item.user?.name || item.user?.username || "Photographer";
          const photographerUrl = item.user?.links?.html
            ? `${item.user.links.html}?utm_source=presentation_maker&utm_medium=referral`
            : "https://unsplash.com/?utm_source=presentation_maker&utm_medium=referral";
          const photoUrl = item.links?.html
            ? `${item.links.html}?utm_source=presentation_maker&utm_medium=referral`
            : "https://unsplash.com/?utm_source=presentation_maker&utm_medium=referral";

          return {
            photo_id: item.id,
            url: item.urls?.regular || item.urls?.full || item.urls?.small,
            regular_url: item.urls?.regular || item.urls?.full,
            small_url: item.urls?.small || item.urls?.regular,
            thumb_url: item.urls?.thumb || item.urls?.small,
            download_location: item.links?.download_location || "",
            photographer_name: photographerName,
            photographer_profile_url: photographerUrl,
            photo_page_url: photoUrl,
            alt_text: item.alt_description || item.description || cleanQuery,
            width: item.width || 1920,
            height: item.height || 1080,
            orientation
          };
        });

        // Store in cache
        searchCache.set(cacheKey, {
          data: results,
          total: data.total || results.length,
          expiresAt: Date.now() + CACHE_TTL_MS
        });

        clearTimeout(timeout);
        return { results, total: data.total || results.length };
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
        if (attempt < 2 && (err.code === "ECONNRESET" || err.message?.includes("fetch failed") || err.name === "AbortError")) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        if (err.name === "AbortError") {
          throw new Error("UNSPLASH_TIMEOUT: Unsplash API request timed out after 8 seconds.");
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Tracks photo download event as required by Unsplash API Guidelines.
   */
  public async trackDownload(downloadLocation: string): Promise<void> {
    if (!downloadLocation || !this.isConfigured()) return;
    try {
      await fetch(downloadLocation, {
        method: "GET",
        headers: {
          Authorization: `Client-ID ${config.unsplashAccessKey}`,
          "User-Agent": "PresentationMaker/1.0"
        }
      });
    } catch (e: any) {
      console.warn("[Unsplash Service] Download tracking notification error (non-fatal):", e.message);
    }
  }

  /**
   * Resolves the primary subject domain for a presentation topic and slide.
   */
  public resolveDomainProfile(text: string): DomainProfile | null {
    const normalized = text.toLowerCase();
    for (const profile of DOMAIN_PROFILES) {
      if (profile.matchers.some(m => normalized.includes(m))) {
        return profile;
      }
    }
    return null;
  }

  /**
   * Generates a context-specific, concise photographic search query.
   */
  public generateSearchQuery(
    slide: ISlide,
    deckTopic: string,
    slideIndex: number,
    profile: DomainProfile | null
  ): { primaryQuery: string; fallbackQuery: string } {
    const rawTitle = slide.title || "";
    const cleanTitle = rawTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !["the", "and", "for", "with", "overview", "introduction", "role", "understanding", "modern", "future"].includes(w));

    // Clean and normalize deck topic (strip filename artifacts, underscores, presentation boilerplate)
    let normalizedDeckTopic = (deckTopic || "")
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b(?:presentation|source|draft|final|v\d+|doc|notes|deck|slides?|mvp|capstone)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalizedDeckTopic) normalizedDeckTopic = "technology innovation";

    // Expand common abbreviations
    const expandedDeckTopic = normalizedDeckTopic
      .replace(/\bAI\b/gi, "artificial intelligence")
      .replace(/\bML\b/gi, "machine learning")
      .replace(/\bIoT\b/gi, "internet of things")
      .replace(/\bEV\b/gi, "electric vehicle")
      .replace(/\bUI\b/gi, "user interface");

    // 1. Cover / Title Slide (Slide Index 0)
    if (slideIndex === 0 || slide.layout_type === "title") {
      if (profile) {
        return {
          primaryQuery: profile.defaultHeroQuery,
          fallbackQuery: `${profile.domain.replace("_", " ")} technology innovation`
        };
      }
      return {
        primaryQuery: `${expandedDeckTopic} technology professional`,
        fallbackQuery: `${expandedDeckTopic} overview`
      };
    }

    // 2. Slide specific queries
    const specificTerms = cleanTitle.slice(0, 3).join(" ");

    if (profile) {
      // Pick 2 prominent visual anchors
      const anchor1 = profile.visualKeywords[0];
      const anchor2 = profile.visualKeywords[1];
      const domainLabel = profile.domain.replace("_", " ");

      const primaryQuery = `${domainLabel} ${specificTerms} ${anchor1}`.trim();
      const fallbackQuery = `${anchor1} ${anchor2} ${domainLabel}`.trim();

      return { primaryQuery, fallbackQuery };
    }

    const primaryQuery = `${expandedDeckTopic} ${specificTerms}`.trim();
    const fallbackQuery = `${expandedDeckTopic} innovation`.trim();
    return { primaryQuery, fallbackQuery };
  }

  /**
   * Strictly scores and validates photo relevance against slide topic and quality requirements.
   */
  public validateAndScorePhoto(
    photo: UnsplashPhotoResult,
    domainProfile: DomainProfile | null,
    slideKeywords: string[]
  ): { valid: boolean; score: number; reason: string } {
    // 1. Aspect ratio check: Must be widescreen landscape (1.20 to 2.20)
    const aspect = photo.width / photo.height;
    if (aspect < 1.20 || aspect > 2.20) {
      return { valid: false, score: 0, reason: `Unsuitable aspect ratio (${aspect.toFixed(2)}). Landscape required.` };
    }

    // 2. Minimum resolution check (prevent blurry pixelated images)
    if (photo.width < 1000 || photo.height < 550) {
      return { valid: false, score: 0, reason: `Image resolution too low (${photo.width}x${photo.height}).` };
    }

    // 3. URL validity check
    if (!photo.url || !photo.url.startsWith("http")) {
      return { valid: false, score: 0, reason: "Missing or invalid image asset URL." };
    }

    const metaText = `${photo.alt_text || ""} ${photo.photo_id}`.toLowerCase();

    // 4. Negative term rejection (filter out out-of-context stock clichés)
    if (domainProfile) {
      for (const neg of domainProfile.negativeKeywords) {
        if (metaText.includes(neg)) {
          return { valid: false, score: 0, reason: `Matches negative domain cliché: "${neg}".` };
        }
      }
    }

    // Generic negative terms (reject clipart, drawings, memes)
    const genericNegatives = ["clipart", "cartoon", "drawing", "sketch", "illustration vector", "render 3d abstract"];
    for (const gNeg of genericNegatives) {
      if (metaText.includes(gNeg)) {
        return { valid: false, score: 0, reason: `Contains non-photographic artifact: "${gNeg}".` };
      }
    }

    // 5. Positive semantic relevance scoring
    let domainMatches = 0;
    let score = 0;
    if (domainProfile) {
      for (const kw of domainProfile.visualKeywords) {
        if (metaText.includes(kw)) {
          domainMatches++;
          score += 2;
        }
      }
    }

    // Require at least 1 verified domain visual keyword match
    if (domainProfile && domainMatches === 0) {
      return { valid: false, score: 0, reason: "No domain visual keywords matched photo metadata." };
    }

    const STOP_WORDS = new Set([
      "a", "an", "the", "in", "on", "at", "of", "for", "to", "with", "by", "and", "or",
      "is", "are", "was", "were", "be", "this", "that", "these", "those", "from", "into",
      "care", "role", "part", "have", "been", "has", "had", "will", "would", "can", "could",
      "overview", "introduction", "conclusion", "summary", "key", "points", "takeaways",
      "slide", "deck", "presentation", "transforming", "operational", "efficiency"
    ]);

    for (const sk of slideKeywords) {
      const cleanSk = sk.trim().toLowerCase();
      if (cleanSk.length > 2 && !STOP_WORDS.has(cleanSk) && metaText.includes(cleanSk)) {
        score += 3;
      }
    }

    return { valid: true, score, reason: `Valid photo with relevance score ${score} (${domainMatches} domain matches).` };
  }

  /**
   * Intelligent slide analyzer deciding whether a slide genuinely benefits from photography.
   */
  public analyzeSlideForImage(
    slide: ISlide,
    deckTopic: string,
    slideIndex: number,
    totalSlides: number
  ): ImageSelectionDecision {
    const layout = (slide.layout_type || slide.content?.visual_type || "standard").toLowerCase();
    const title = (slide.title || "").toLowerCase();
    const bullets = slide.content?.bullet_points || [];
    const profile = this.resolveDomainProfile(`${deckTopic} ${title}`);

    // 1. STRICT EXCLUSIONS: Never add photographs to analytical, diagrammatic, or data-dense layouts
    const analyticalLayouts = [
      "stats_grid",
      "table",
      "comparison",
      "process_flow",
      "flowchart",
      "timeline",
      "hierarchy",
      "architecture"
    ];
    if (analyticalLayouts.includes(layout)) {
      return {
        requires_image: false,
        image_search_query: "",
        preferred_orientation: "landscape",
        image_position: "card",
        image_alt_text: "",
        selection_reason: `Preserve clean data visualization and structured diagram for ${layout} layout.`
      };
    }

    // 2. Section headers and dividers remain clean and typographic
    if (layout === "section_header") {
      return {
        requires_image: false,
        image_search_query: "",
        preferred_orientation: "landscape",
        image_position: "card",
        image_alt_text: "",
        selection_reason: "Section dividers remain clean and minimalist."
      };
    }

    // 3. Dense text slides with more than 4 bullet points do not force photographs
    if (bullets.length > 4) {
      return {
        requires_image: false,
        image_search_query: "",
        preferred_orientation: "landscape",
        image_position: "split_right",
        image_alt_text: "",
        selection_reason: "Slide contains dense structured text; avoiding photo clutter."
      };
    }

    // 4. Slide 1 (Title / Hero opening): Highest priority candidate for hero photograph
    if (slideIndex === 0 || layout === "title") {
      const { primaryQuery, fallbackQuery } = this.generateSearchQuery(slide, deckTopic, slideIndex, profile);
      return {
        requires_image: true,
        image_search_query: primaryQuery,
        fallback_search_query: fallbackQuery,
        preferred_orientation: "landscape",
        image_position: "hero",
        image_alt_text: `${deckTopic} overview hero photography`,
        selection_reason: "Opening title slide benefits from high-impact conceptual hero photography.",
        domain: profile?.domain
      };
    }

    // 5. Conceptual, Narrative, and Real-World Application Slides
    // Check if slide title or bullet points suggest an application, case study, concept, or real-world scenario
    const isConceptOrApplication =
      title.includes("introduction") ||
      title.includes("overview") ||
      title.includes("foundation") ||
      title.includes("concept") ||
      title.includes("application") ||
      title.includes("clinical") ||
      title.includes("diagnostic") ||
      title.includes("threat") ||
      title.includes("solar") ||
      title.includes("wind") ||
      title.includes("case study") ||
      title.includes("scenario") ||
      title.includes("industry") ||
      title.includes("practice") ||
      title.includes("implementation") ||
      title.includes("real world");

    // Only allow up to 2-3 supporting image slides across a typical 6-8 slide deck
    if (isConceptOrApplication && layout !== "conclusion") {
      const { primaryQuery, fallbackQuery } = this.generateSearchQuery(slide, deckTopic, slideIndex, profile);
      return {
        requires_image: true,
        image_search_query: primaryQuery,
        fallback_search_query: fallbackQuery,
        preferred_orientation: "landscape",
        image_position: "split_right",
        image_alt_text: `${slide.title} photographic illustration`,
        selection_reason: "Conceptual or application slide benefits from visual photographic anchoring.",
        domain: profile?.domain
      };
    }

    // 6. Concluding / Future Vision slide: Only if concise (<= 3 bullets) and has inspirational focus
    if ((slideIndex === totalSlides - 1 || layout === "conclusion") && bullets.length <= 3) {
      const isVision = title.includes("future") || title.includes("vision") || title.includes("outlook") || title.includes("next");
      if (isVision) {
        const { primaryQuery, fallbackQuery } = this.generateSearchQuery(slide, deckTopic, slideIndex, profile);
        return {
          requires_image: true,
          image_search_query: primaryQuery,
          fallback_search_query: fallbackQuery,
          preferred_orientation: "landscape",
          image_position: "split_right",
          image_alt_text: `${slide.title} closing takeaway visual`,
          selection_reason: "Future outlook slide visual complement.",
          domain: profile?.domain
        };
      }
    }

    return {
      requires_image: false,
      image_search_query: "",
      preferred_orientation: "landscape",
      image_position: "split_right",
      image_alt_text: "",
      selection_reason: "Balanced presentation layout; photograph not required."
    };
  }

  /**
   * Automatically processes a generated deck, identifying slides needing images,
   * searching Unsplash, validating metadata relevance, and attaching distinct relevant photographs.
   */
  public async autoAttachImagesToDeck(slides: ISlide[], deckTopic: string): Promise<ISlide[]> {
    if (!this.isConfigured()) {
      console.log("[Unsplash Service] Skipping auto-image attachment: Unsplash API is not configured.");
      return slides;
    }

    const usedPhotoIds = new Set<string>();
    const totalSlides = slides.length;
    let attachedCount = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const decision = this.analyzeSlideForImage(slide, deckTopic, i, totalSlides);

      if (!decision.requires_image) {
        continue;
      }

      // Max 3 images per deck to prevent photo clutter and preserve presentation balance
      if (attachedCount >= 3 && i > 0) {
        console.log(`[Unsplash Service] Deck reached optimal photograph limit (3 photos). Leaving slide #${slide.slide_number} clean.`);
        continue;
      }

      const domainProfile = decision.domain ? DOMAIN_PROFILES.find(p => p.domain === decision.domain) || null : this.resolveDomainProfile(deckTopic);
      const slideWords = (slide.title || "").toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/);

      let selectedPhoto: UnsplashPhotoResult | null = null;

      // 1. Attempt primary search query
      try {
        console.log(`[Unsplash Service] Searching primary query for slide #${slide.slide_number}: "${decision.image_search_query}"`);
        const { results } = await this.searchPhotos(decision.image_search_query, {
          orientation: decision.preferred_orientation,
          perPage: 8
        });

        // Filter and score candidates
        const scoredCandidates = results
          .filter(r => !usedPhotoIds.has(r.photo_id))
          .map(photo => {
            const evaluation = this.validateAndScorePhoto(photo, domainProfile, slideWords);
            return { photo, evaluation };
          })
          .filter(c => c.evaluation.valid)
          .sort((a, b) => b.evaluation.score - a.evaluation.score);

        if (scoredCandidates.length > 0) {
          selectedPhoto = scoredCandidates[0].photo;
          console.log(`[Unsplash Service] Selected photo '${selectedPhoto.photo_id}' with score ${scoredCandidates[0].evaluation.score} for slide #${slide.slide_number}.`);
        }
      } catch (err: any) {
        console.warn(`[Unsplash Service] Primary search query failed for slide #${slide.slide_number}:`, err.message);
      }

      // 2. If primary query yielded no valid candidate, attempt fallback query
      if (!selectedPhoto && decision.fallback_search_query) {
        try {
          console.log(`[Unsplash Service] Trying fallback query for slide #${slide.slide_number}: "${decision.fallback_search_query}"`);
          const { results } = await this.searchPhotos(decision.fallback_search_query, {
            orientation: decision.preferred_orientation,
            perPage: 6
          });

          const fallbackCandidates = results
            .filter(r => !usedPhotoIds.has(r.photo_id))
            .map(photo => {
              const evaluation = this.validateAndScorePhoto(photo, domainProfile, slideWords);
              return { photo, evaluation };
            })
            .filter(c => c.evaluation.valid)
            .sort((a, b) => b.evaluation.score - a.evaluation.score);

          if (fallbackCandidates.length > 0) {
            selectedPhoto = fallbackCandidates[0].photo;
            console.log(`[Unsplash Service] Selected fallback photo '${selectedPhoto.photo_id}' with score ${fallbackCandidates[0].evaluation.score} for slide #${slide.slide_number}.`);
          }
        } catch (fbErr: any) {
          console.warn(`[Unsplash Service] Fallback search query failed for slide #${slide.slide_number}:`, fbErr.message);
        }
      }

      // 3. Attach if valid photo found, otherwise leave clean without image
      if (selectedPhoto) {
        usedPhotoIds.add(selectedPhoto.photo_id);
        attachedCount++;

        const slideImg: ISlideImage = {
          provider: "unsplash",
          photo_id: selectedPhoto.photo_id,
          url: selectedPhoto.regular_url || selectedPhoto.url,
          regular_url: selectedPhoto.regular_url,
          small_url: selectedPhoto.small_url,
          thumb_url: selectedPhoto.thumb_url,
          download_location: selectedPhoto.download_location,
          photographer_name: selectedPhoto.photographer_name,
          photographer_profile_url: selectedPhoto.photographer_profile_url,
          photo_page_url: selectedPhoto.photo_page_url,
          alt_text: selectedPhoto.alt_text || decision.image_alt_text,
          width: selectedPhoto.width,
          height: selectedPhoto.height,
          orientation: decision.preferred_orientation,
          position: decision.image_position,
          selection_reason: decision.selection_reason,
          selected_at: new Date()
        };

        slide.image = slideImg;
        if (!slide.content) slide.content = {};
        slide.content.image = slideImg;

        // For non-title standard slides, set visual_type to image_text
        if (i > 0 && (slide.layout_type === "standard" || !slide.layout_type)) {
          slide.layout_type = "image_text";
          slide.content.visual_type = "image_text";
        }

        // Trigger compliance download tracking
        if (selectedPhoto.download_location) {
          this.trackDownload(selectedPhoto.download_location).catch(() => {});
        }
      } else {
        console.log(`[Unsplash Service] Strict relevance check: No photo passed relevance threshold for slide #${slide.slide_number}. Slide left clean without image.`);
      }
    }

    console.log(`[Unsplash Service] Auto-attachment finished: Attached ${attachedCount} relevant photograph(s) across ${totalSlides} slides.`);
    return slides;
  }
}

export const unsplashService = UnsplashService.getInstance();
