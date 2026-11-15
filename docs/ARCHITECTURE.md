# PresentAI - Architectural Overview & Roadmap

PresentAI is an AI-powered presentation creation, learning, presentation, and practice platform.

## Core Flow
`CREATE → UNDERSTAND → PRESENT → PRACTICE → IMPROVE`

## Modular System Layers

```
+-------------------------------------------------------------------+
|                        React Frontend                             |
|               (Vite + TypeScript + Tailwind CSS)                  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        FastAPI Backend                            |
|             (Python 3.12 + SQLAlchemy + Pydantic)                |
+-------------------------------------------------------------------+
    |                   |                     |                 |
    v                   v                     v                 v
+----------+   +------------------+   +--------------+   +------------+
| MySQL DB |   | Document Parsers |   | Provider-    |   | Practice   |
|          |   | (PDF/DOCX/PPTX)  |   | Agnostic AI  |   | Speech     |
|          |   |                  |   | Service      |   | Metrics    |
+----------+   +------------------+   +--------------+   +------------+
```

## Modular Directory Layout

- `frontend/`: React 19 + TypeScript + Vite + Tailwind CSS UI components and pages.
- `backend/`: FastAPI application, database connectors, and API services.
- `docs/`: Technical specifications, schema design, and phase documentations.
