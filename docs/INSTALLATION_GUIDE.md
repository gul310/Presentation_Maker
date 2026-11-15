# PresentMaker — Complete Installation & Setup Guide

This guide provides end-to-end, reproducible instructions for setting up **PresentMaker** on a new development machine. Instructions are presented **Windows-first** using standard PowerShell commands, followed by **Linux / macOS** instructions.

---

## 1. System Prerequisites & Software Versions

Before starting, confirm that your system meets the minimum software requirements:

| Component | Minimum Version | Recommended Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `24.x LTS` | `node -v` | Required for frontend (Vite) and Node.js gateway |
| **npm** | `>= 9.0.0` | `11.x` | `npm -v` | Node package manager bundled with Node.js |
| **Python** | `3.10.x` | `3.11.x` / `3.12.x` / `3.14.x` | `python --version` | Required for FastAPI microservice |
| **Git** | `>= 2.30.0` | Latest | `git --version` | Source control management |
| **MongoDB** | `7.x` | MongoDB Atlas (Cloud) | — | Local MongoDB Community Server is also supported |

---

## 2. Step 1: Clone the Repository

Clone the official repository from GitHub and navigate into the project directory:

### Windows (PowerShell) / Linux / macOS:
```bash
git clone https://github.com/gul310/Presentation_Maker.git
cd Presentation_Maker
```

> [!IMPORTANT]
> The cloned directory is named `Presentation_Maker`. Always verify that your active shell directory is `Presentation_Maker` before proceeding.

---

## 3. Step 2: Install Frontend Dependencies

The frontend is built with React 19, TypeScript, Vite, and Tailwind CSS.

### Windows (PowerShell) / Linux / macOS:
```bash
cd frontend
npm install
cd ..
```

---

## 4. Step 3: Install Node.js Backend Gateway Dependencies

The backend gateway handles authentication, data isolation, MongoDB interaction, and AI service proxying.

### Windows (PowerShell) / Linux / macOS:
```bash
cd backend-node
npm install
cd ..
```

---

## 5. Step 4: Set Up Python AI Microservice

The Python microservice handles document text extraction, LLM prompt synthesis, multi-layout slide generation, speech coaching evaluation, and file exports.

### On Windows (PowerShell):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

> [!TIP]
> If you encounter a PowerShell script execution error when running `Activate.ps1`, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### On Linux / macOS (Bash):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

## 6. Step 5: Environment Variable Configuration

Each collaborator must create their own local, private `.env` files. Template `.env.example` files are provided in each service directory. **Never commit `.env` files to Git.**

### 6.1 Creating Environment Files

#### On Windows (PowerShell):
```powershell
# In backend-node:
Copy-Item backend-node\.env.example backend-node\.env

# In backend:
Copy-Item backend\.env.example backend\.env

# In frontend (optional):
Copy-Item frontend\.env.example frontend\.env
```

#### On Linux / macOS (Bash):
```bash
cp backend-node/.env.example backend-node/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

### 6.2 Environment Variable Reference

#### A. Node.js Backend Gateway (`backend-node/.env`)
| Variable | Description | Default / Example Value | Required? |
| :--- | :--- | :--- | :---: |
| `PORT` | HTTP port for the Node.js API Gateway | `5000` | Yes |
| `NODE_ENV` | Runtime environment | `development` | Yes |
| `MONGODB_URI` | MongoDB Atlas URI or local MongoDB connection string | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/presentmaker` | Yes |
| `JWT_SECRET` | Secret key used for signing JWT tokens | `32+_character_random_string` | Yes |
| `JWT_EXPIRES_IN` | JWT token lifespan | `7d` | Yes |
| `CORS_ORIGIN` | Allowed cross-origin domains | `http://localhost:5173,http://127.0.0.1:5173` | Yes |
| `PYTHON_AI_SERVICE_URL` | Internal URL of the Python FastAPI microservice | `http://127.0.0.1:8002` | Yes |
| `MAX_GUEST_GENERATIONS` | Maximum free presentation generations for unauthenticated visitors | `2` | Yes |
| `UNSPLASH_ACCESS_KEY` | Unsplash Developer API access key for stock photography | (Obtain from unsplash.com/developers) | Optional |
| `UNSPLASH_SECRET_KEY` | Unsplash Developer API secret key | (Obtain from unsplash.com/developers) | Optional |
| `AI_PRIMARY_PROVIDER` | Primary AI provider name | `gemini` | Yes |
| `AI_FALLBACK_PROVIDER` | Fallback AI provider name | `groq` | Yes |
| `AI_FALLBACK_ENABLED` | Toggle for fallback provider failover | `true` | Yes |
| `GROQ_API_KEY` | Groq Cloud API key for gateway fallback check | (Obtain from console.groq.com/keys) | Optional |
| `GROQ_MODEL` | Groq LLM model name | `llama-3.3-70b-versatile` | Yes |

#### B. Python FastAPI AI Microservice (`backend/.env`)
| Variable | Description | Default / Example Value | Required? |
| :--- | :--- | :--- | :---: |
| `PROJECT_NAME` | Service identifier | `PresentAI API` | Yes |
| `PROJECT_VERSION` | Microservice semantic version | `1.0.0` | Yes |
| `API_V1_STR` | API prefix string | `/api` | Yes |
| `ENVIRONMENT` | Operational environment | `development` | Yes |
| `DEBUG` | Enable debug logs and tracebacks | `True` | Yes |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:5173,http://127.0.0.1:5173` | Yes |
| `JWT_SECRET_KEY` | Secret key for verifying tokens (must match `JWT_SECRET` in Node) | Same secret as `backend-node` | Yes |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` | Yes |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes | `10080` (7 days) | Yes |
| `AI_PRIMARY_PROVIDER` | Primary AI provider | `gemini` | Yes |
| `AI_FALLBACK_PROVIDER` | Secondary AI provider | `groq` | Yes |
| `AI_FALLBACK_ENABLED` | Enable automatic circuit-breaker fallback | `true` | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | (Obtain from aistudio.google.com) | Yes |
| `GEMINI_MODEL_NAME` | Primary Gemini model identifier | `gemini-2.5-flash` | Yes |
| `GROQ_API_KEY` | Groq Cloud LPU API key for secondary fallback | (Obtain from console.groq.com/keys) | Recommended |
| `GROQ_MODEL` | Secondary model identifier | `llama-3.3-70b-versatile` | Yes |
| `DEEPSEEK_API_KEY` | Tertiary AI provider API key | (Optional from deepseek.com) | Optional |
| `DEEPSEEK_MODEL` | Tertiary model identifier | `deepseek-chat` | Optional |

#### C. Frontend (`frontend/.env`)
| Variable | Description | Default Value | Required? |
| :--- | :--- | :--- | :---: |
| `VITE_API_URL` | Base API gateway endpoint | `/api` (proxied to `:5000` by Vite) | Optional |

---

## 7. Step 6: Running All Three Services

PresentMaker requires all three services to run concurrently.

### Option A: One-Click Startup Script

- **On Windows (PowerShell):**
  ```powershell
  .\start_all_services.ps1
  ```
- **On Linux / macOS (Bash):**
  ```bash
  chmod +x start_all_services.sh
  ./start_all_services.sh
  ```

---

### Option B: Individual Terminals (Recommended for Development)

Open three separate terminals in VS Code:

#### Terminal 1 — Frontend UI
```powershell
cd frontend
npm run dev
```
- **Local URL:** `http://localhost:5173`
- Vite automatically proxies `/api` calls to `http://localhost:5000`.

#### Terminal 2 — Node.js Backend Gateway
```powershell
cd backend-node
npm run dev
```
- **Gateway Endpoint:** `http://localhost:5000`
- Interacts with MongoDB Atlas and handles incoming client requests.

#### Terminal 3 — Python FastAPI AI Microservice
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```
*(On Linux/macOS, run `source venv/bin/activate` then `python -m uvicorn app.main:app --host 127.0.0.1 --port 8002`)*
- **Microservice Endpoint:** `http://127.0.0.1:8002`
- **Interactive Swagger Docs:** `http://127.0.0.1:8002/docs`

---

## 8. Application Ports & URLs Summary

| Service | Port | Base URL | Documentation / Health |
| :--- | :---: | :--- | :--- |
| **Frontend UI** | `5173` | `http://localhost:5173` | Application Dashboard & Editor |
| **Node.js Gateway** | `5000` | `http://localhost:5000` | `http://localhost:5000/api/health` |
| **Python AI Microservice** | `8002` | `http://127.0.0.1:8002` | `http://127.0.0.1:8002/docs` |

---

## 9. Common Setup Errors & Troubleshooting

| Error / Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **`EADDRINUSE: address already in use :::5000`** | Another Node process is running on port 5000 | In PowerShell, run `Get-Process node \| Stop-Process` or find the PID using `netstat -ano \| findstr :5000` and kill it. |
| **`[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8002)`** | Another Uvicorn/Python process is holding port 8002 | In PowerShell, run `Get-Process python \| Stop-Process`. |
| **`MongoServerSelectionError: connection timed out`** | Your public IP address is not whitelisted in MongoDB Atlas | Navigate to MongoDB Atlas $\rightarrow$ Network Access $\rightarrow$ Add IP Address $\rightarrow$ Add Current IP (or `0.0.0.0/0` for development). |
| **`Unauthorized: Invalid or expired token`** | JWT mismatch between Node.js and Python microservice | Verify that `JWT_SECRET` in `backend-node/.env` matches `JWT_SECRET_KEY` in `backend/.env`. |
| **`Script execution is disabled on this system`** | Windows PowerShell Execution Policy restricts unverified scripts | Execute `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell. |
| **`AI Generation Error 429: Resource Exceeded`** | Google Gemini free-tier rate limits reached | Ensure `GROQ_API_KEY` is configured in `backend/.env`. The AI microservice automatically routes generation requests to Groq Cloud (`llama-3.3-70b-versatile`). |
| **Vite proxy error: `[vite] http proxy error: /api/...`** | Node.js backend gateway is not running on port 5000 | Confirm Terminal 2 is running `npm run dev` in `backend-node/`. |
