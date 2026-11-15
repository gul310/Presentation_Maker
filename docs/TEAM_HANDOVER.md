# PresentMaker — Team Handover & Collaboration Guide

This document establishes the collaboration standards, Git branching model, pull-request workflow, environment policies, and responsibility boundaries for all team members contributing to **PresentMaker**.

---

## 1. Project Overview & Repository

- **Project Name:** PresentMaker — AI-Powered Presentation Maker
- **Repository URL:** `https://github.com/gul310/Presentation_Maker.git`
- **Primary Branch:** `main`
- **Project Owner:** `gul310`
- **Team Collaborators:**
  - Lybah Zahid — GitHub: `lybah-gif`
  - Zubair Awan — GitHub: `zawan1`

---

## 2. Team Account Roles & Access Permissions

PresentMaker maintains a clear separation between **GitHub repository permissions** and **application runtime roles**:

| Member | GitHub Username | GitHub Permission | Application Login | Application Role | `is_admin` | Notes |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| **Project Owner** | `gul310` | Owner / Admin | `admin@presentai.com` | `admin` | `true` | Sole Super Administrator. Controls production merges and releases. |
| **Lybah Zahid** | `lybah-gif` | Collaborator (Write) | `laiba@example.com` | `student` | `false` | Standard user. Isolated to own presentations and generation jobs. |
| **Zubair Awan** | `zawan1` | Collaborator (Write) | `zawan9624@gmail.com` | `student` | `false` | Standard user. Isolated to own presentations and generation jobs. |

> [!IMPORTANT]
> GitHub `Write` access allows pushing branches and opening Pull Requests on the repository. It **never** grants application-level administrative privileges (`is_admin: true`) in the database.

---

## 3. Clone & Onboarding Quickstart

Each collaborator can get their local environment running in 5 steps:

### Step 1: Clone Repository
```powershell
git clone https://github.com/gul310/Presentation_Maker.git
cd Presentation_Maker
```

### Step 2: Install Dependencies
```powershell
# Frontend
cd frontend
npm install
cd ..

# Backend Node Gateway
cd backend-node
npm install
cd ..

# Python AI Microservice
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### Step 3: Set Up Private Environment Files
```powershell
Copy-Item backend-node\.env.example backend-node\.env
Copy-Item backend\.env.example backend\.env
```
*(Configure your own private `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY` in the newly created `.env` files. See [docs/INSTALLATION_GUIDE.md](file:///c:/Users/admin/Downloads/PresentMaker/docs/INSTALLATION_GUIDE.md) for full details).*

### Step 4: Run Services
Launch each service in a separate terminal:
- **Terminal 1 (Frontend):** `cd frontend; npm run dev` $\rightarrow$ `http://localhost:5173`
- **Terminal 2 (Node Gateway):** `cd backend-node; npm run dev` $\rightarrow$ `http://localhost:5000`
- **Terminal 3 (Python AI):** `cd backend; .\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --port 8002` $\rightarrow$ `http://127.0.0.1:8002`

---

## 4. Git Branching & Contribution Workflow

To maintain code quality and prevent regressions, all collaborators must adhere to the following workflow:

### 4.1 Branching Rules
- **Direct Pushes to `main` Are Prohibited:** Collaborators must never push directly to `origin/main`.
- **Feature Branches:** Create a dedicated branch for every feature, fix, or documentation update:
  - `feat/feature-name` (e.g., `feat/audio-playback-controls`)
  - `fix/bug-description` (e.g., `fix/slide-padding-overflow`)
  - `docs/doc-update` (e.g., `docs/update-api-reference`)

### 4.2 Pull & Sync Workflow
Before starting new work or submitting a branch:
```powershell
# Fetch latest main from remote
git checkout main
git pull origin main

# Branch from the latest main
git checkout -b feat/your-feature-name

# Work on changes...
git status
```

### 4.3 Commit Naming Conventions
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat: <description>` — A new feature
- `fix: <description>` — A bug fix
- `docs: <description>` — Documentation only changes
- `refactor: <description>` — Code change that neither fixes a bug nor adds a feature
- `style: <description>` — Formatting, whitespace, semicolon changes
- `chore: <description>` — Build process, auxiliary tools, dependency upgrades

*Example:* `feat: add custom color picker to slide background editor`

### 4.4 Submitting a Pull Request (PR)
1. Push your branch to GitHub:
   ```powershell
   git push origin feat/your-feature-name
   ```
2. Navigate to `https://github.com/gul310/Presentation_Maker` and open a Pull Request targeting `main`.
3. Provide a clear description of changes, screenshots (for UI changes), and local verification notes.
4. Request review from the project owner (`gul310`).
5. Merges into `main` require project owner review and approval.

---

## 5. Security & Isolation Rules

1. **Never Commit Secrets:** `.env` files, API keys (Gemini, Groq, Unsplash), JWT secrets, and database connection strings with passwords must never be staged or committed. Verify with `git status` before committing.
2. **Preserve User Data Isolation:** When writing database queries or endpoints, never omit the `user_id: req.user._id` filter on user-owned collections (`presentations`, `generationjobs`, etc.).
3. **No Automatic Role Elevation:** Never introduce code or seed scripts that automatically grant `admin` roles or `is_admin: true` to normal users or email patterns.
4. **Use Personal Database Instances:** Collaborators should use their own isolated MongoDB database or Atlas collection for local development to avoid corrupting shared test data.

---

## 6. What Must NOT Be Changed Without Project Owner Approval

The following architectural components require explicit prior approval from `gul310` before modification:
- **Authentication & RBAC Logic:** `backend-node/src/middleware/auth.middleware.ts`, `backend-node/src/routes/auth.routes.ts`, and role verification routines.
- **Super Administrator Seed:** `backend-node/src/services/adminSeed.ts`.
- **Database Schemas:** Core Mongoose schemas in `backend-node/src/models/` (`User.ts`, `Presentation.ts`, `GenerationJob.ts`).
- **AI Microservice Architecture:** The primary-to-fallback cascade hierarchy (Gemini $\rightarrow$ Groq $\rightarrow$ DeepSeek $\rightarrow$ Synthesizer) in `backend/app/services/ai_circuit_breaker.py` and `backend/app/services/synthesizer.py`.
- **Repository Visibility and Collaborator Settings:** Any changes to GitHub access levels or branch protection rules.

---

## 7. How to Report Bugs & Coordinate Changes

- **GitHub Issues:** Open an issue on GitHub detailing:
  - Clear summary of the problem.
  - Steps to reproduce the issue.
  - Expected vs. actual behavior.
  - Screenshots or terminal error logs.
- **Team Communication:** For immediate coordination or clarification on architectural decisions, contact project owner `gul310` directly before beginning major refactoring.
