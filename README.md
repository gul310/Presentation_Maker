# PresentMaker — AI-Powered Presentation Maker

> An enterprise-grade, full-stack AI presentation platform that automates the complete presentation lifecycle: **Create** $\rightarrow$ **Understand** $\rightarrow$ **Practice** $\rightarrow$ **Present** $\rightarrow$ **Share**.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Presentation__Maker-blue.svg)](https://github.com/gul310/Presentation_Maker.git)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Tailwind-blue)](https://react.dev/)
[![Node](https://img.shields.io/badge/Gateway-Node.js%20Express%20%2B%20TypeScript-green)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/AI%20Microservice-Python%20FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen)](https://www.mongodb.com/)
[![AI Providers](https://img.shields.io/badge/AI%20Engines-Gemini%202.5%20%7C%20Groq%20LPU-orange)](https://aistudio.google.com/)

---

## Table of Contents
1. [Project Overview & Purpose](#1-project-overview--purpose)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Key Features & MVP Scope](#4-key-features--mvp-scope)
5. [Target Users](#5-target-users)
6. [Technology Stack](#6-technology-stack)
7. [System Architecture](#7-system-architecture)
8. [Complete Folder Structure](#8-complete-folder-structure)
9. [Prerequisites & Software Versions](#9-prerequisites--software-versions)
10. [Step-by-Step Installation Instructions](#10-step-by-step-installation-instructions)
11. [Environment Variable Configuration](#11-environment-variable-configuration)
12. [Running All Three Services](#12-running-all-three-services)
13. [Application Ports & URLs](#13-application-ports--urls)
14. [Authentication & Account Roles](#14-authentication--account-roles)
15. [User Data Isolation & Security](#15-user-data-isolation--security)
16. [Document Ingestion & Generation Workflow](#16-document-ingestion--generation-workflow)
17. [AI Provider Integration & Circuit-Breaker Fallback](#17-ai-provider-integration--circuit-breaker-fallback)
18. [Presentation Export Capabilities](#18-presentation-export-capabilities)
19. [Troubleshooting & Common Errors](#19-troubleshooting--common-errors)
20. [GitHub Collaboration Workflow](#20-github-collaboration-workflow)
21. [Team Responsibilities & Ownership](#21-team-responsibilities--ownership)
22. [Known Limitations & Pending Database Items](#22-known-limitations--pending-database-items)
23. [Manual Verification Status](#23-manual-verification-status)
24. [Future Enhancements](#24-future-enhancements)
25. [License & Contribution Instructions](#25-license--contribution-instructions)

---

## 1. Project Overview & Purpose

**PresentMaker** is an end-to-end, AI-powered presentation creation and rehearsal platform. Rather than generating simple, static text summaries, PresentMaker orchestrates document intelligence, natural language understanding, layout ergonomics, and multimedia enrichment to transform raw user prompts or uploaded reference documents (Word DOCX, Adobe PDF, PowerPoint PPTX) into structured, professional slide decks.

The platform provides a unified studio that bridges presentation generation with learning and rehearsal:
- **Create:** Rapidly generate slide decks using prompts or existing documents with automated contextual layout assignment and stock photography insertion.
- **Understand ("Teach Me"):** An interactive AI tutor explains technical slide concepts with real-world analogies, simplified breakdowns, and terminology definitions.
- **Practice ("Practice Mode"):** A real-time speech rehearsal studio that uses browser Speech-to-Text (STT) to analyze spoken pace (Words Per Minute), delivery clarity, keyword coverage, and presentation performance.
- **Present ("Present Mode"):** A widescreen, distraction-free presentation viewer with automated voice narration powered by Text-to-Speech (TTS).
- **Share:** A community template marketplace where users can share, discover, rate, and clone presentation templates.

---

## 2. Problem Statement

Creating impactful, professional presentations is traditionally time-consuming and fragmented:
1. **Manual Slide Structuring:** Users spend hours formatting bullet points, aligning visual elements, and searching for relevant stock imagery.
2. **Document Dumping in Existing AI Tools:** Most generic AI presentation generators copy large, unformatted blocks of document text into individual slides, creating overwhelming walls of text without structural narrative flow.
3. **Disconnected Learning & Rehearsal:** Presentation authoring tools do not prepare presenters to deliver or understand their content; practice requires third-party timers, memorization, or ad-hoc coaching.
4. **Fragile Cloud AI Services:** Reliance on a single LLM provider frequently causes production outages or generation failures due to strict rate limits (HTTP 429) or sudden cloud downtimes.

---

## 3. Proposed Solution

PresentMaker resolves these problems through an integrated, multi-tier software architecture:
- **Intelligent Document Ingestion:** Custom document parsers extract structured headlines, remove boilerplate noise, intelligently detect the real document title, and balance key insights across the requested slide count.
- **14 Contextual Visual Layouts:** An intelligent layout engine assigns appropriate visual structures (e.g., Two-Column, Cards Grid, Timeline, Process Flow, Comparison Table, Metrics Callout) based on the semantic nature of each slide's content.
- **Automated Visual Enrichment:** Direct integration with the Unsplash API contextually selects and embeds high-resolution photography matched to slide keywords.
- **Integrated Rehearsal & Tutoring:** Built-in speech analysis tracks pacing (WPM) and keyword recall during practice, while the "Teach Me" tutor enables deep comprehension before stepping onto the stage.
- **4-Tier High-Availability AI Pipeline:** A resilient cascading AI architecture with Google Gemini as primary, Groq Cloud LPU as secondary fallback, DeepSeek as tertiary, and a local deterministic synthesizer ensuring zero server crashes.

---

## 4. Key Features & MVP Scope

| Feature Area | Implemented Functionality | Status |
| :--- | :--- | :---: |
| **Topic Generation** | Generates tailored presentations from natural language prompts with tone and audience selectors | Verified |
| **Document Ingestion** | Ingests Word (`.docx`), PDF (`.pdf`), and PowerPoint (`.pptx`) documents with intelligent title extraction | Verified |
| **14 Slide Layouts** | Renders Title, Two-Column, Cards Grid, Vertical Timeline, Metrics Callout, Process Flow, Comparison Table, Matrix, Hierarchy, and Profile layouts | Verified |
| **Stock Photography** | Dynamic Unsplash integration for context-aware photo matching and replacement | Verified |
| **Interactive Editor** | WYSIWYG slide editor with real-time text updates, layout switching, and theme selection | Verified |
| **AI Tutor ("Teach Me")** | Slide-by-slide educational tutor providing analogies, simplified concepts, and glossaries | Verified |
| **Practice Mode** | Speech rehearsal studio measuring spoken WPM pace, clarity, keyword coverage, and delivery scoring | Verified |
| **Present Mode** | Full-screen widescreen delivery mode with multi-voice Edge-TTS audio narration | Verified |
| **Multi-Format Exports** | Native export to Microsoft PowerPoint (`.pptx`), Adobe PDF (`.pdf`), PNG zip archives, interactive HTML, and JSON | Verified |
| **Template Marketplace** | Public discovery, template publishing, community ratings, reviews, and template copying | Verified |
| **Super Admin Panel** | User management, audit logs, system statistics, and template moderation | Verified |
| **AI Circuit Breaker** | Automated failover from Google Gemini $\rightarrow$ Groq Cloud LPU $\rightarrow$ DeepSeek $\rightarrow$ Local Synthesizer | Verified |

---

## 5. Target Users

- **Students & Academics:** Quickly convert research papers, theses, and study guides into structured presentation decks with built-in tutoring.
- **Educators & Trainers:** Generate comprehensive lecture slides and step-by-step curriculum modules with relevant visual layouts.
- **Professionals & Executives:** Turn briefs, project reports, and strategy documents into pitch decks, status updates, and executive briefings.
- **Public Speakers:** Rehearse presentation delivery with real-time speech pacing and delivery feedback.

---

## 6. Technology Stack

PresentMaker is built with modern, battle-tested open-source frameworks across all three layers:

| Layer | Framework / Library | Detected Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **React** | `19.2.8` | Declarative component-based UI framework |
| | **TypeScript** | `5.7.2` | End-to-end static type safety |
| | **Vite** | `8.2.0` | Ultra-fast build tool and development server |
| | **Tailwind CSS** | `4.3.3` | Utility-first responsive styling and layout system |
| | **Lucide React** | `^1.16.0` | Modern UI icon library |
| **API Gateway** | **Node.js** | `>= 20.0.0` (LTS `24.x`) | JavaScript runtime environment |
| | **Express** | `4.21.2` | RESTful API server routing and middleware |
| | **TypeScript** | `5.7.3` | Type-safe backend architecture |
| | **Mongoose** | `8.9.5` | MongoDB Object Data Modeling (ODM) |
| | **jsonwebtoken** | `^9.0.2` | Cryptographic JWT authentication |
| | **bcryptjs** | `^2.4.3` | Password salting and hashing |
| **AI Microservice** | **Python** | `3.10–3.14` | High-performance Python backend runtime |
| | **FastAPI** | `>= 0.110.0` | Modern, asynchronous REST API framework |
| | **Uvicorn** | `>= 0.28.0` | ASGI high-concurrency web server |
| | **Pydantic** | `>= 2.6.4` | Strict data validation and schema serialization |
| | **python-docx / pypdf** | Latest | Native document ingestion and parsing |
| | **python-pptx / reportlab** | Latest | Binary presentation and PDF export compilation |
| | **edge-tts** | Latest | High-fidelity text-to-speech audio synthesis |
| **Data Layer** | **MongoDB Atlas** | `7.x` | Cloud NoSQL document database |
| **AI Providers** | **Google Gemini** | `gemini-2.5-flash` | Primary generative LLM engine |
| | **Groq Cloud LPU** | `llama-3.3-70b-versatile` | Ultra-low latency secondary circuit-breaker fallback |
| | **DeepSeek** | `deepseek-chat` | Optional tertiary fallback |
| | **Local Synthesizer** | Offline Engine | Deterministic offline guarantee |
| **Media API** | **Unsplash REST API** | Official API | Contextual high-resolution photography search |

---

## 7. System Architecture

The following diagram illustrates the inter-service communication and fallback mechanisms:

```mermaid
flowchart TD
    Client["Client Browser (React 19 / Vite)\nhttp://localhost:5173"]
    ViteProxy["Vite Dev Server Proxy\n(/api/* -> http://localhost:5000)"]
    Gateway["Node.js Express Gateway\nhttp://localhost:5000"]
    Database[("MongoDB Atlas Database\n(Users, Decks, Jobs, Orders)")]
    UnsplashAPI["Unsplash REST API\n(Stock Photography)"]
    FastAPI["Python FastAPI AI Microservice\nhttp://127.0.0.1:8002"]
    
    subgraph AI Provider Hierarchy
        Gemini["Google Gemini 2.5 Flash\n(Primary Engine)"]
        Groq["Groq Cloud LPU (Llama-3.3-70b)\n(Secondary Circuit-Breaker Fallback)"]
        DeepSeek["DeepSeek Chat\n(Tertiary Fallback)"]
        Synthesizer["Local Synthesizer Engine\n(Deterministic Offline Safety Net)"]
    end

    Client --> ViteProxy
    ViteProxy --> Gateway
    Gateway --> Database
    Gateway --> UnsplashAPI
    Gateway -->|HTTP REST / JSON| FastAPI
    FastAPI --> Gemini
    Gemini -.->|Circuit Breaker (3 Failures / 429)| Groq
    Groq -.->|Failure Fallback| DeepSeek
    DeepSeek -.->|Failure Fallback| Synthesizer
```

---

## 8. Complete Folder Structure

```
Presentation_Maker/
├── .gitignore                          # Git exclusions (env files, node_modules, venv, caches)
├── README.md                           # Master project documentation and quickstart
├── CONTRIBUTING.md                     # Contribution standards, branch rules, and PR workflow
├── SECURITY.md                         # Security policy, secret protection, RBAC, and reporting
├── start_all_services.ps1              # One-click Windows PowerShell startup script
├── start_all_services.sh               # One-click Linux/macOS Bash startup script
├── docs/                               # Detailed technical documentation
│   ├── ACCOUNT_ROLES.md                # RBAC specification, user isolation, and admin boundaries
│   ├── INSTALLATION_GUIDE.md           # Step-by-step setup guide for all operating systems
│   ├── ARCHITECTURE.md                 # 3-tier architectural specification and sequence flows
│   ├── TEAM_HANDOVER.md                # Team onboarding, branch model, and member guidelines
│   ├── API_DOCUMENTATION.md            # Comprehensive REST endpoint specifications
│   ├── DATABASE_SETUP.md               # MongoDB schema designs and connection instructions
│   └── AI_PROVIDER_CONFIGURATION.md    # Gemini, Groq, and circuit breaker configuration
├── frontend/                           # React 19 Frontend Application
│   ├── .env.example                    # Frontend environment template
│   ├── package.json                    # Frontend dependencies and build scripts
│   ├── vite.config.ts                  # Vite build configuration and /api proxy
│   └── src/
│       ├── components/                 # VisualSlideRenderer, Navbar, Layouts, Modals
│       ├── context/                    # AuthContext, PresentationContext
│       ├── pages/                      # CreatePage, EditorPage, TeachMePage, PracticeModePage, etc.
│       └── services/                   # Frontend API client modules
├── backend-node/                       # Node.js Express API Gateway
│   ├── .env.example                    # Node gateway environment template
│   ├── package.json                    # Node dependencies and scripts
│   ├── tsconfig.json                   # TypeScript compiler configuration
│   └── src/
│       ├── middleware/                 # auth.middleware (JWT & requireAdmin)
│       ├── models/                     # Mongoose schemas (User, Presentation, GenerationJob, etc.)
│       ├── routes/                     # auth, presentation, ai, image, admin, marketplace
│       └── services/                   # adminSeed, unsplash.service
└── backend/                            # Python FastAPI AI Microservice
    ├── .env.example                    # Python microservice environment template
    ├── requirements.txt                # Python dependencies
    └── app/
        ├── main.py                     # FastAPI application setup and middleware
        ├── api/                        # ai_microservice endpoints, auth, practice, export
        ├── core/                       # config, security, circuit breaker
        ├── models/                     # Pydantic schemas and data models
        └── services/                   # document_service, synthesizer, export_service
```

---

## 9. Prerequisites & Software Versions

Before starting, verify your local development environment:

| Tool | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `24.x LTS` | `node -v` |
| **npm** | `>= 9.0.0` | `11.x` | `npm -v` |
| **Python** | `3.10.x` | `3.11.x` / `3.12.x` / `3.14.x` | `python --version` |
| **Git** | `>= 2.30.0` | Latest | `git --version` |
| **MongoDB** | `7.x` | MongoDB Atlas (Cloud) | — |

---

## 10. Step-by-Step Installation Instructions

### Step 1: Clone the Repository
```powershell
git clone https://github.com/gul310/Presentation_Maker.git
cd Presentation_Maker
```

### Step 2: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

### Step 3: Install Node.js Backend Gateway Dependencies
```powershell
cd backend-node
npm install
cd ..
```

### Step 4: Set Up Python AI Microservice
- **On Windows (PowerShell):**
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  cd ..
  ```
- **On Linux / macOS (Bash):**
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..
  ```

---

## 11. Environment Variable Configuration

Copy the example template files into your own private `.env` files:

- **Windows (PowerShell):**
  ```powershell
  Copy-Item backend-node\.env.example backend-node\.env
  Copy-Item backend\.env.example backend\.env
  Copy-Item frontend\.env.example frontend\.env
  ```
- **Linux / macOS (Bash):**
  ```bash
  cp backend-node/.env.example backend-node/.env
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  ```

### Key Variables to Configure:
1. **`backend-node/.env`:**
   - `MONGODB_URI`: Your MongoDB Atlas URI or local MongoDB connection (`mongodb://127.0.0.1:27017/presentmaker`).
   - `JWT_SECRET`: Random 32+ character string.
   - `UNSPLASH_ACCESS_KEY` & `UNSPLASH_SECRET_KEY`: (Optional) Free keys from [Unsplash Developers](https://unsplash.com/developers).
2. **`backend/.env`:**
   - `GEMINI_API_KEY`: API key from [Google AI Studio](https://aistudio.google.com/).
   - `GROQ_API_KEY`: (Optional secondary fallback) API key from [Groq Console](https://console.groq.com/keys).
   - `JWT_SECRET_KEY`: Must match `JWT_SECRET` in `backend-node/.env`.
3. **`frontend/.env`:**
   - `VITE_API_URL`: `/api` (proxied by Vite in dev mode).

*For the complete variable reference, see [docs/INSTALLATION_GUIDE.md](file:///c:/Users/admin/Downloads/PresentMaker/docs/INSTALLATION_GUIDE.md).*

---

## 12. Running All Three Services

PresentMaker operates with three concurrent services.

### Option A: One-Click Startup Script
- **Windows PowerShell:**
  ```powershell
  .\start_all_services.ps1
  ```
- **Linux / macOS Bash:**
  ```bash
  chmod +x start_all_services.sh
  ./start_all_services.sh
  ```

---

### Option B: Three Dedicated Terminals (Recommended for Development)

Open three separate terminals in VS Code:

#### Terminal 1 — Frontend UI
```powershell
cd frontend
npm run dev
```

#### Terminal 2 — Node.js Backend Gateway
```powershell
cd backend-node
npm run dev
```

#### Terminal 3 — Python FastAPI AI Microservice
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

---

## 13. Application Ports & URLs

| Service | Port | Local URL | Documentation / Health |
| :--- | :---: | :--- | :--- |
| **Frontend UI** | `5173` | [http://localhost:5173](http://localhost:5173) | Main Application Interface |
| **Node.js Gateway** | `5000` | [http://localhost:5000](http://localhost:5000) | `http://localhost:5000/api/health` |
| **Python Microservice** | `8002` | [http://127.0.0.1:8002](http://127.0.0.1:8002) | [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs) |

---

## 14. Authentication & Account Roles

PresentMaker enforces a strict role-based access control (RBAC) policy:

- **Super Administrator:**
  - Designated Email: `admin@presentai.com`
  - Display Name: `Super Administrator`
  - Role: `admin` | `is_admin: true`
  - Access: Full access to the Super Admin panel (`/admin`), user accounts, audit logs, and marketplace moderation.
- **Standard Users:**
  - Team Collaborators: Lybah Zahid (`laiba@example.com`, `role: student`, `is_admin: false`) and Zubair Awan (`zawan9624@gmail.com`, `role: student`, `is_admin: false`).
  - Access: Presentation generation, editing, AI tutoring, speech coaching, and template marketplace.
  - Standard users cannot access administrative endpoints (`/api/admin/*`); requests return `HTTP 403 Forbidden`.

*For complete details, see [docs/ACCOUNT_ROLES.md](file:///c:/Users/admin/Downloads/PresentMaker/docs/ACCOUNT_ROLES.md).*

---

## 15. User Data Isolation & Security

- **Strict Tenant Query Scoping:** Every presentation and generation job in MongoDB is strictly tied to the owner's `user_id`. Queries strictly enforce `{ _id: presentationId, user_id: req.user._id }`.
- **Cross-Account Privacy:** Standard users cannot view, edit, or delete another user's presentations, even by directly specifying known object IDs.
- **GitHub Permission vs. Runtime Role:** GitHub `Write` access allows contributing code; it does not grant administrative privileges inside the application database.
- **No Secrets in Public Commits:** Passwords, API keys, and connection strings are excluded by `.gitignore` and must never be committed.

*For complete details, see [SECURITY.md](file:///c:/Users/admin/Downloads/PresentMaker/SECURITY.md).*

---

## 16. Document Ingestion & Generation Workflow

When an uploaded document (DOCX, PDF, PPTX) is submitted:
1. **Intelligent Title Extraction (`extract_intelligent_title`):** The parser evaluates document metadata, structural Heading 1 elements, and non-header headlines to extract the genuine title (e.g., "PresentMaker MVP Capstone") rather than defaulting to the raw filename.
2. **Noise Elimination:** Strips table of contents dotted lines, author blocks, repeated headers, footers, and page numbers.
3. **Structured Content Chunking:** Intelligently summarizes and distributes key takeaways across the requested number of slides, preventing raw document text dumps.
4. **Visual Layout Selection:** Selects appropriate contextual layouts (e.g., cards, comparisons, metrics, timelines) for each slide based on content semantics.
5. **Photographic Enrichment:** Enriches slides with contextually relevant imagery retrieved from Unsplash.

---

## 17. AI Provider Integration & Circuit-Breaker Fallback

PresentMaker implements a resilient 4-tier cascading fallback system to guarantee high availability:

1. **Tier 1 — Google Gemini (Primary):** `gemini-2.5-flash` provides fast, structured presentation synthesis.
2. **Tier 2 — Groq Cloud LPU (Secondary Fallback):** Ultra-fast inference with `llama-3.3-70b-versatile`. Automatically engaged via circuit-breaker if Gemini returns HTTP 429 (quota exceeded) or experiences cloud outages.
3. **Tier 3 — DeepSeek Chat (Tertiary Fallback):** Optional third-line fallback when configured.
4. **Tier 4 — Deterministic Local Synthesizer (`synthesizer.py`):** An offline engine that runs locally with zero external network dependencies, ensuring the server never crashes or returns an unhandled exception.

*Circuit Breaker Logic:* The circuit trips to `OPEN` after 3 consecutive primary failures, routing requests immediately to Groq for a 30-second cooldown window before testing primary recovery.

---

## 18. Presentation Export Capabilities

PresentMaker includes native export capabilities implemented in `backend/app/services/export_service.py` and exposed via `POST /ai/export/{format}`:

- **Microsoft PowerPoint (`.pptx`):** Generates valid PowerPoint files using `python-pptx`, including custom title and content shapes, bullet formatting, and embedded speaker notes.
- **Adobe PDF (`.pdf`):** Produces multi-page PDF documents using `reportlab`.
- **High-Resolution PNG Archive (`.png`):** Packages rendered slide images into a downloadable ZIP archive.
- **Interactive HTML Presentation (`.html`):** Compiles a self-contained, responsive HTML/JS slide deck playable in any web browser without server dependencies.
- **Raw Presentation Data (`.json`):** Exports structured slide hierarchy, layout tags, and theme data.

---

## 19. Troubleshooting & Common Errors

| Error | Probable Cause | Recommended Resolution |
| :--- | :--- | :--- |
| `EADDRINUSE: address already in use :::5000` | Existing Node process running on port 5000 | In PowerShell, run `Get-Process node \| Stop-Process`. |
| `[Errno 10048] error binding on 127.0.0.1:8002` | Existing Python process holding port 8002 | In PowerShell, run `Get-Process python \| Stop-Process`. |
| `MongoServerSelectionError: timed out` | IP not whitelisted in MongoDB Atlas | Add current IP or `0.0.0.0/0` in MongoDB Atlas Network Access. |
| `PowerShell execution policy error` | Restrictive Windows PowerShell execution policy | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`. |
| `AI Generation 429: Resource Exceeded` | Gemini rate limit reached | Add `GROQ_API_KEY` in `backend/.env`. The system fails over to Groq automatically. |

---

## 20. GitHub Collaboration Workflow

Collaborators must adhere to the standard Git feature-branch workflow:
1. **Never commit directly to `main`.**
2. Create a feature branch: `git checkout -b feat/your-feature-name`.
3. Keep commits atomic and follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
4. Push your branch: `git push origin feat/your-feature-name`.
5. Open a Pull Request targeting `main` and request review from project owner `gul310`.

*For detailed instructions, see [docs/TEAM_HANDOVER.md](file:///c:/Users/admin/Downloads/PresentMaker/docs/TEAM_HANDOVER.md).*

---

## 21. Team Responsibilities & Ownership

- **Project Owner (`gul310`):** Repository administrator, Super Administrator (`admin@presentai.com`), architectural oversight, PR approvals, and production releases.
- **Collaborator (`lybah-gif` — Lybah Zahid):** Frontend and presentation UI development, slide layout styling, and user experience enhancements.
- **Collaborator (`zawan1` — Zubair Awan):** Backend integration, service orchestration, API validation, and microservice testing.

*Note: Core authentication logic, database models, and the single Super Admin configuration require explicit owner approval prior to modification.*

---

## 22. Known Limitations & Pending Database Items

- **Guest Session Expiration:** Guest generation quotas (2 decks) are tracked via session tokens. Clearing browser cookies resets guest session state.
- **Export Styling Fidelity:** While PPTX and PDF exports accurately render slide titles, text, bullet hierarchies, and notes, complex CSS gradients and fluid web layouts are approximated in static slide shapes.
- **Legacy Database Record:** A historical test account (`rogue_1794717223080@test.com`) with `role: admin` and `is_admin: false` exists in the database from automated testing. It cannot exercise Super Admin privileges because `is_admin` is `false`, and it is cataloged as a pending database cleanup item for the project owner.

---

## 23. Manual Verification Status

> [!NOTE]
> **Owner Testing Policy:** In accordance with project instructions, **all automated unit tests, browser tests, API integration suites, and test presentation generations have been deferred**. The application codebase has undergone static code review and architectural verification; live functional testing will be conducted manually by the project owner.

---

## 24. Future Enhancements

- Multi-user real-time collaborative slide editing via WebSockets.
- Custom corporate branding kits and font file uploads.
- Automated generation of AI voice-over video exports (`.mp4`).
- Cloud storage integrations (Google Drive, Microsoft OneDrive, Dropbox).

---

## 25. License & Contribution Instructions

- **License:** Licensed under the [MIT License](LICENSE).
- **Contributing:** Please review [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/TEAM_HANDOVER.md](docs/TEAM_HANDOVER.md) before submitting code changes.
