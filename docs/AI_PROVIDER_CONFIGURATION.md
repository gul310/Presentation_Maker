# PresentMaker — AI Provider Configuration & Fallback Guide

This document explains how AI providers are configured, prioritized, and cascaded in **PresentMaker**.

---

## 1. AI Provider Hierarchy

PresentMaker features a 4-tier cascading AI architecture:

| Tier | Provider | Engine / Model | Trigger Condition |
| :---: | :--- | :--- | :--- |
| **Tier 1** | **Google Gemini** (Primary) | `gemini-2.5-flash` | Default for all presentation generation and analysis |
| **Tier 2** | **Groq Cloud LPU** (Secondary) | `llama-3.3-70b-versatile` | Automatically invoked on Gemini 429 rate limit, 5xx error, timeout, or circuit open |
| **Tier 3** | **DeepSeek** (Tertiary) | `deepseek-chat` | Invoked if configured and both Gemini and Groq fail |
| **Tier 4** | **Local Synthesizer** (Safety Net)| Python Built-in (`synthesizer.py`) | Deterministic fallback ensuring the app never crashes |

---

## 2. Configuration Settings in `backend/.env`

```env
# AI Provider Priority Settings
AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDER=groq
AI_FALLBACK_ENABLED=true

# 1. Google Gemini (Primary)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-2.5-flash

# 2. Groq Cloud LPU (Secondary Fallback)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# 3. DeepSeek (Tertiary - Optional)
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

---

## 3. Obtaining API Credentials

### 3.1 Google Gemini
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and create a key in a new project.
4. Paste the key into `backend/.env` under `GEMINI_API_KEY=`.

### 3.2 Groq Cloud LPU
1. Visit [Groq Console](https://console.groq.com/keys).
2. Create a free account.
3. Generate a new API key (starts with `gsk_...`).
4. Paste the key into `backend/.env` under `GROQ_API_KEY=`.

---

## 4. Modality Boundaries & Provider Compatibility

Not all features use external LLMs:

| Capability | Gemini | Groq | Edge-TTS | Unsplash | Synthesizer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Slide Deck Generation** | Yes | Yes | — | — | Yes |
| **Teach Me Explanations** | Yes | Yes | — | — | Yes |
| **Slide Refinement** | Yes | Yes | — | — | Yes |
| **Rehearsal Scoring** | Yes | Yes | — | — | Yes |
| **Multilingual Translation**| Yes | Yes | — | — | Yes |
| **Voice Narration (TTS)** | — | — | Yes | — | — |
| **Photography Search** | — | — | — | Yes | — |

- **Text-to-Speech:** Handled by Microsoft Edge-TTS via `app/services/tts_service.py`. Does not call Gemini or Groq.
- **Image Insertion:** Handled by Unsplash API via `backend-node/src/services/unsplash.service.ts`.

---

## 5. Circuit Breaker Behavior

The circuit breaker in `app/services/ai_circuit_breaker.py` protects against cascading timeouts:
- Tracks consecutive failures per provider.
- Trips to `OPEN` after 3 consecutive failures.
- When `OPEN`, requests skip Gemini immediately without waiting for a 15–30s timeout, executing directly on Groq.
- After 30 seconds, enters `HALF_OPEN` state to test if Gemini has recovered.

