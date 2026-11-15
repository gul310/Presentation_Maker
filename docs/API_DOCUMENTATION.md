# PresentMaker — API Documentation

This document catalogs the verified REST API routes in **PresentMaker**, detailing authentication requirements, parameters, and endpoints for both the Node.js API Gateway and Python FastAPI AI Microservice.

---

## 1. Node.js API Gateway (`http://localhost:5000/api`)

### 1.1 Authentication & User Management (`/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | No | Register new user account (`name`, `email`, `password`) |
| `POST` | `/auth/login` | No | Authenticate user, set session, return JWT token & user profile |
| `GET` | `/auth/me` | Yes | Retrieve profile and credits for currently authenticated user |
| `POST` | `/auth/refresh` | No | Refresh expired JWT access token |
| `POST` | `/auth/logout` | Yes | Invalidate user session |
| `PUT` | `/auth/profile` | Yes | Update user display name and profile settings |

### 1.2 Presentation Management (`/presentations`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/presentations` | Yes | List all presentations belonging to authenticated user |
| `GET` | `/presentations/:id` | Yes / Guest | Retrieve complete presentation document by ID |
| `POST` | `/presentations` | Yes | Create a new manual presentation |
| `PUT` | `/presentations/:id` | Yes | Update presentation title, settings, or theme |
| `DELETE` | `/presentations/:id` | Yes | Delete a presentation |
| `PUT` | `/presentations/:id/slides` | Yes | Reorder or batch-update slides |
| `PUT` | `/presentations/:id/slides/:slideId`| Yes | Update single slide content, layout, or visual elements |
| `POST` | `/presentations/:id/duplicate` | Yes | Clone an existing presentation |

### 1.3 AI Presentation Generation & Workflows (`/ai`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/ai/generate-async` | Yes / Guest | Start asynchronous deck generation job (`prompt` or `document`, `slide_count`, `audience`, `tone`, `language`) |
| `GET` | `/ai/job-status/:jobId` | Yes / Guest | Poll status and progress percentage of generation job |
| `POST` | `/ai/upload-source` | Yes / Guest | Upload PDF, DOCX, PPTX document to extract text and structure |
| `POST` | `/ai/teach-slide` | Yes / Guest | Generate "Teach Me" educational breakdown for a slide |
| `POST` | `/ai/refine-slide` | Yes / Guest | Refine slide text (improve clarity, expand, simplify, translate) |
| `POST` | `/ai/evaluate-practice`| Yes / Guest | Submit rehearsal transcripts for AI coaching evaluation |
| `POST` | `/ai/translate-slide` | Yes / Guest | Translate single slide into Urdu, Spanish, French, etc. |
| `POST` | `/ai/tts/synthesize` | Yes / Guest | Generate voice narration audio stream for slide notes |
| `POST` | `/ai/export/:format` | Yes / Guest | Export deck as PPTX, PDF, PNG archive, HTML, or JSON |

### 1.4 Unsplash Image Integration (`/images`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/images/search` | Yes | Query Unsplash for context-relevant photographs (`query`, `page`) |
| `POST` | `/images/track-download`| Yes | Trigger Unsplash download endpoint per API guidelines |

### 1.5 Community Discovery & Marketplace (`/marketplace`, `/public`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/marketplace/listings` | No | Browse public and premium presentation listings |
| `POST` | `/marketplace/listings` | Yes | Publish a presentation to the marketplace |
| `POST` | `/marketplace/purchase` | Yes | Purchase a premium template listing via NayaPay / Free checkout |
| `GET` | `/public/presentations/:id` | No | View a publicly shared presentation deck |
| `POST` | `/ratings` | Yes | Submit a 1–5 star rating for a presentation or template |
| `POST` | `/reviews` | Yes | Post a written review for a marketplace template |

### 1.6 Super Admin Panel (`/admin`)
*Requires `role: "admin"` in user JWT.*
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/admin/stats` | Admin | System dashboard metrics: total users, decks, revenue, jobs |
| `GET` | `/admin/users` | Admin | List, inspect, and update user roles and status |
| `GET` | `/admin/audit-logs` | Admin | View immutable security and administrative audit trail |
| `GET` | `/admin/marketplace`| Admin | Review, approve, or moderate marketplace listings |
| `GET` | `/admin/settings` | Admin | Retrieve and update platform-wide runtime configurations |

---

## 2. Python FastAPI AI Microservice (`http://127.0.0.1:8002`)

FastAPI exposes interactive OpenAPI documentation at `/docs` and JSON specification at `/openapi.json`.

### Core AI Endpoints
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/ai/generate` | `GenerateDeckRequest` | Generates verified slide deck with custom visual layouts |
| `POST` | `/ai/upload-source` | `multipart/form-data` | Parses text and outline from uploaded PDF, DOCX, or PPTX |
| `POST` | `/ai/teach-slide` | `TeachSlideRequest` | Generates key terms, analogies, and tutor explanations |
| `POST` | `/ai/refine-slide` | `RefineSlideRequest` | Polishes, shortens, or formats slide content |
| `POST` | `/ai/evaluate-practice`| `EvaluatePracticeRequest` | Scores spoken pace, clarity, and keyword coverage |
| `POST` | `/ai/translate-slide` | `TranslateSlideRequest` | Translates structured slide components and notes |
| `POST` | `/ai/tts/synthesize` | `SynthesizeTTSRequest` | Streams MP3 audio synthesized from slide speaker notes |
| `POST` | `/ai/export/{format}` | `ExportRequest` | Generates binary PPTX, PDF, PNG zip, HTML, or JSON |
| `GET` | `/api/health` | — | Returns service status and AI provider telemetry |
