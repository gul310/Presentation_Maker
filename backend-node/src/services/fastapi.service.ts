import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { config } from "../config/config.js";

let activeBaseUrl = config.pythonAiServiceUrl || "http://127.0.0.1:8002";

const getCandidateUrls = (): string[] => {
  const primary = activeBaseUrl;
  const list = [primary, "http://127.0.0.1:8002", "http://127.0.0.1:8001", "http://127.0.0.1:8000"];
  return [...new Set(list)];
};

async function executeRequest<T = any>(fn: (client: AxiosInstance) => Promise<T>): Promise<T> {
  const candidateUrls = getCandidateUrls();
  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    try {
      const client = axios.create({
        baseURL: baseUrl,
        timeout: 240000 // 4 minutes for heavy AI generation with fallback safety
      });
      const result = await fn(client);
      activeBaseUrl = baseUrl;
      return result;
    } catch (err: any) {
      lastError = err;
      // If it's a connection refused or not found error, try the alternative port
      const isConnError = err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ECONNRESET";
      if (!isConnError) {
        // If the server responded with 4xx, 5xx, or request timed out, do not retry other port
        throw err;
      }
    }
  }
  throw lastError;
}

export const fastApiService = {
  // 1. Generate structured presentation deck
  async generatePresentation(payload: {
    source_type: string;
    source_content: string;
    prompt?: string;
    title_hint?: string;
    source_name?: string;
    slide_count?: number;
    language?: string;
    audience?: string;
    presentation_type?: string;
    tone?: string;
    ai_provider?: string;
  }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/generate", payload);
      return res.data;
    });
  },

  // 2. Parse document upload (PDF, DOCX, PPTX)
  async uploadDocumentSource(fileBuffer: Buffer, originalname: string, mimetype: string) {
    return executeRequest(async (client) => {
      const formData = new FormData();
      formData.append("file", fileBuffer, { filename: originalname, contentType: mimetype });
      const res = await client.post("/ai/upload-source", formData, {
        headers: formData.getHeaders()
      });
      return res.data;
    });
  },

  // 3. Teach Me slide explanation
  async teachSlide(payload: {
    slide_title: string;
    slide_content_text: string;
    language?: string;
    audience?: string;
    ai_provider?: string;
  }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/teach-slide", payload);
      return res.data;
    });
  },

  // 4. Refine slide content
  async refineSlide(payload: {
    slide_title: string;
    current_content: string;
    action: string;
    custom_instruction?: string;
    language?: string;
    audience?: string;
    ai_provider?: string;
  }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/refine-slide", payload);
      return res.data;
    });
  },

  // 5. Evaluate practice session transcripts
  async evaluatePractice(payload: {
    presentation_title: string;
    language: string;
    slide_eval_inputs: any[];
    ai_provider?: string;
  }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/evaluate-practice", payload);
      return res.data;
    });
  },

  // 6. Translate slide content on-demand
  async translateSlide(payload: {
    slide_title: string;
    slide_content: any;
    speaker_notes?: string;
    source_language?: string;
    target_language: string;
    ai_provider?: string;
  }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/translate-slide", payload);
      return res.data;
    });
  },

  // 7. Multi-format export proxy
  async exportPresentation(format: string, presentationData: any, userTheme?: any, slideNumber?: number, exportLanguage?: string) {
    return executeRequest(async (client) => {
      const res = await client.post(
        `/ai/export/${format}`,
        {
          presentation: presentationData,
          user_theme: userTheme,
          slide_number: slideNumber,
          export_language: exportLanguage
        },
        {
          responseType: "arraybuffer"
        }
      );
      return {
        data: res.data,
        headers: res.headers
      };
    });
  },

  // 8. Voice Narration TTS synthesis
  async synthesizeTTS(payload: { text: string; language?: string; use_cache?: boolean }) {
    return executeRequest(async (client) => {
      const res = await client.post("/ai/tts/synthesize", payload, {
        responseType: "arraybuffer"
      });
      return {
        data: res.data,
        contentType: res.headers["content-type"] || "audio/mpeg"
      };
    });
  }
};

