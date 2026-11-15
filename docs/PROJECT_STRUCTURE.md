# PresentMaker — Project Structure Reference

This document maps the complete directory and file structure of **PresentMaker**, explaining the purpose of each directory and core module.

---

## 1. Top-Level Directory Layout

```
PresentMaker/
├── .gitignore                      # Root Git exclusion rules (secrets, venv, node_modules)
├── README.md                       # Master project overview and quickstart
├── CONTRIBUTING.md                 # Development workflow and PR guidelines
├── SECURITY.md                     # Security policy, JWT rules, and data scoping
├── docs/                           # Comprehensive technical documentation
│   ├── PROJECT_ARCHITECTURE.md     # 3-tier architecture, system diagram, fallback
│   ├── INSTALLATION_GUIDE.md       # Step-by-step setup for all operating systems
│   ├── API_DOCUMENTATION.md        # Full REST endpoint reference for Node and FastAPI
│   ├── DATABASE_SETUP.md           # MongoDB models, schema, and connection guide
│   ├── AI_PROVIDER_CONFIGURATION.md# Gemini, Groq, circuit breaker, and keys
│   ├── TEAM_HANDOVER.md            # FYP team quickstart and onboarding
│   └── PROJECT_STRUCTURE.md        # This codebase map
├── frontend/                       # React 19 + TypeScript + Vite frontend
├── backend-node/                   # Node.js + Express + TypeScript API gateway
└── backend/                        # Python + FastAPI + Uvicorn AI microservice
```

---

## 2. Frontend Structure (`frontend/`)

```
frontend/
├── package.json                    # React 19, Lucide React, Tailwind v4, Vite 8
├── vite.config.ts                  # Vite configuration & /api reverse proxy to port 5000
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Frontend environment template
└── src/
    ├── main.tsx                    # Application entry point
    ├── App.tsx                     # Route definitions and layout wrapper
    ├── index.css / App.css         # Global styles and Tailwind imports
    ├── assets/                     # Non-secret static assets (hero.png, svgs)
    ├── components/                 # Reusable UI widgets
    │   ├── Navbar.tsx              # Top navigation bar with auth status
    │   ├── ProtectedRoute.tsx      # Route guard for authenticated pages
    │   ├── VisualSlideRenderer.tsx # Renders 14 visual layout types
    │   ├── UnsplashImageModal.tsx  # Modal to search and replace slide photos
    │   ├── DesignStudioModal.tsx   # Color palette and typography designer
    │   ├── GuestLimitModal.tsx     # Limit prompt when guest reaches 2 generations
    │   ├── ShareModal.tsx          # Public link generator and embed codes
    │   └── RatingReviewModal.tsx   # Modal for rating and reviewing templates
    ├── pages/                      # Application route views
    │   ├── LandingPage.tsx         # Marketing landing page with showcase
    │   ├── LoginPage.tsx           # Authentication login form
    │   ├── SignupPage.tsx          # New user registration
    │   ├── DashboardPage.tsx       # User's saved presentations & stats
    │   ├── CreatePage.tsx          # AI generation studio (topic or document)
    │   ├── PresentationStudioPage.tsx # WYSIWYG slide editor and designer
    │   ├── PresentationModePage.tsx# Widescreen presentation viewer with TTS
    │   ├── PracticeModePage.tsx    # Live rehearsal with microphone STT
    │   ├── PracticeReportPage.tsx  # Practice performance scorecard & coaching
    │   ├── MarketplacePage.tsx     # Template marketplace and listing purchases
    │   ├── DiscoveryPage.tsx       # Community presentation explorer
    │   ├── PublicPresentationViewPage.tsx # Public view for unauthenticated viewers
    │   ├── AdminPage.tsx           # Super Admin metrics, users, orders
    │   └── SettingsPage.tsx        # Profile, password, and credit balance
    ├── context/                    # React Context providers (AuthContext, ThemeContext)
    ├── hooks/                      # Custom React hooks (useZoomImmunity, etc.)
    ├── services/                   # API client modules
    │   ├── api.ts                  # Core Axios client
    │   ├── presentationApi.ts      # Presentation CRUD calls
    │   ├── adminApi.ts             # Super admin endpoint calls
    │   ├── communityApi.ts         # Marketplace and review calls
    │   ├── practiceApi.ts          # Practice rehearsal submission
    │   ├── speechService.ts        # Browser TTS voice synthesis
    │   └── speechRecognitionService.ts # Browser Web Speech API listener
    ├── constants/                  # Languages and themes
    └── types/                      # TypeScript definitions (auth, presentation, practice, community)
```

---

## 3. Node Backend Gateway Structure (`backend-node/`)

```
backend-node/
├── package.json                    # Express, Mongoose, JWT, bcrypt, multer
├── tsconfig.json                   # TypeScript build settings
├── .env.example                    # Backend environment configuration template
└── src/
    ├── server.ts                   # Gateway bootstrap, middleware, and route mounting
    ├── config/
    │   ├── config.ts               # Environment variable loader
    │   └── db.ts                   # Mongoose MongoDB connection manager
    ├── middleware/
    │   └── auth.ts                 # JWT verification and RBAC middleware
    ├── models/                     # Mongoose ODM schemas
    │   ├── User.ts                 # User accounts, hashed passwords, credits
    │   ├── Presentation.ts         # Presentations, slides array, layouts, themes
    │   ├── GenerationJob.ts        # Asynchronous generation queue status
    │   ├── MarketplaceListing.ts   # Community templates and listings
    │   ├── MarketplaceOrder.ts     # Purchases and NayaPay transactions
    │   ├── PracticeSession.ts      # Rehearsal transcripts and feedback
    │   ├── GuestSession.ts         # Unauthenticated user rate limiting
    │   ├── AuditLog.ts             # Administrative audit trail
    │   └── PlatformSettings.ts     # Platform runtime parameters
    ├── routes/                     # Express REST route controllers
    │   ├── auth.routes.ts          # Register, login, me, refresh, logout
    │   ├── presentation.routes.ts  # Presentation CRUD, duplicate, reorder
    │   ├── ai.routes.ts            # Generation job queue, Teach Me, Refine, Export
    │   ├── image.routes.ts         # Unsplash photo search and tracking
    │   ├── marketplace.routes.ts   # Listings, publishing, checkout
    │   ├── practice.routes.ts      # Practice session recording
    │   ├── admin.routes.ts         # Super Admin panel routes
    │   ├── user.routes.ts          # Profile and credit balance
    │   └── public.routes.ts        # Unauthenticated public presentation viewing
    └── services/
        ├── fastapi.service.ts      # HTTP client communicating with Python microservice
        ├── unsplash.service.ts     # Context-aware Unsplash photo search & auto-attach
        └── adminSeed.ts            # Safe initial admin profile bootstrapper
```

---

## 4. Python AI Microservice Structure (`backend/`)

```
backend/
├── requirements.txt                # FastAPI, Uvicorn, Pydantic, python-pptx, reportlab
├── .env.example                    # AI microservice environment template
└── app/
    ├── main.py                     # FastAPI application factory and route registration
    ├── core/
    │   └── config.py               # Pydantic BaseSettings loading API keys and models
    ├── api/
    │   ├── ai_microservice.py      # Endpoints: /generate, /teach-slide, /refine, /export
    │   └── health.py               # /health and /api/health provider telemetry
    ├── schemas/
    │   ├── ai_schemas.py           # Decoupled slide layout models (timeline, stats, cards)
    │   ├── presentation.py         # Request/response schemas for slides and teaching
    │   └── practice.py             # Practice feedback and speech evaluation schemas
    └── services/
        ├── ai_service.py           # Gemini primary client, dynamic timeouts, cascade
        ├── groq_service.py         # Groq secondary fallback client (native JSON mode)
        ├── ai_circuit_breaker.py   # Circuit breaker (CLOSED, OPEN, HALF_OPEN)
        ├── document_service.py     # PDF, DOCX, PPTX structure and text extraction
        ├── export_service.py       # Exporters: PPTX, PDF, PNG archive, HTML, JSON
        ├── tts_service.py          # Edge-TTS voice synthesis engine
        └── synthesizer.py          # Local deterministic content generator (safety net)
```

