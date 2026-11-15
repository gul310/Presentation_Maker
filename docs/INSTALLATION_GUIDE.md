# PresentMaker — Step-by-Step Installation Guide

This guide provides end-to-end instructions for installing and setting up **PresentMaker** on a new development machine (Windows, macOS, or Linux).

---

## 1. System Prerequisites

Ensure you have the following installed on your machine before starting:

| Tool | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `24.x LTS` | `node -v` |
| **npm** | `>= 9.0.0` | `11.x` | `npm -v` |
| **Python** | `>= 3.10.0` | `3.11.x` or `3.12.x` | `python --version` |
| **Git** | `>= 2.30.0` | Latest | `git --version` |
| **MongoDB** | MongoDB Atlas or Local Community Server | `7.x` | — |

---

## 2. Step 1: Clone the Repository

Open a terminal or command prompt and clone the repository:

```bash
git clone <repository-url>
cd PresentMaker
```

---

## 3. Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## 4. Step 3: Install Node Backend Dependencies

```bash
cd backend-node
npm install
cd ..
```

---

## 5. Step 4: Set Up Python AI Microservice

### On Windows (PowerShell):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### On macOS / Linux (Bash):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

---

## 6. Step 5: Configure Environment Files

You must create local `.env` files for both the Node backend and Python microservice.

### 6.1 Node Backend Configuration (`backend-node/.env`)
Copy the example file:
```powershell
Copy-Item backend-node\.env.example backend-node\.env
```
Edit `backend-node/.env` and supply:
1. `MONGODB_URI`: Your MongoDB Atlas connection URI or local MongoDB connection (`mongodb://127.0.0.1:27017/presentmaker`).
2. `JWT_SECRET`: Any random 32+ character string.
3. `UNSPLASH_ACCESS_KEY` & `UNSPLASH_SECRET_KEY`: (Optional) Free API credentials from [Unsplash Developers](https://unsplash.com/developers).

### 6.2 Python AI Service Configuration (`backend/.env`)
Copy the example file:
```powershell
Copy-Item backend\.env.example backend\.env
```
Edit `backend/.env` and supply:
1. `GEMINI_API_KEY`: API key from [Google AI Studio](https://aistudio.google.com/).
2. `GROQ_API_KEY`: (Optional secondary fallback) API key from [Groq Console](https://console.groq.com/keys).
3. `JWT_SECRET_KEY`: Same secret key configured in `backend-node/.env`.

---

## 7. Step 6: Start All Services

Open three separate terminals in VS Code or your terminal application:

### Terminal 1 — Frontend (Port 5173)
```powershell
cd frontend
npm run dev
```
*Access UI at:* [http://localhost:5173](http://localhost:5173)

### Terminal 2 — Node Backend Gateway (Port 5000)
```powershell
cd backend-node
npm run dev
```
*Gateway listening at:* `http://localhost:5000`

### Terminal 3 — Python FastAPI AI Microservice (Port 8002)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```
*API documentation available at:* [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)

---

## 8. Troubleshooting Common Issues

### Port Conflicts
- Port `5173`: Check if another Vite instance is running. Run `Get-Process node | Stop-Process` on Windows.
- Port `5000`: Check for other Express or server instances.
- Port `8002`: Check for old Python/Uvicorn processes: `Get-NetTCPConnection -LocalPort 8002`.

### MongoDB Connection Errors
- Verify your IP address is whitelisted in MongoDB Atlas Network Access (`0.0.0.0/0` for development or current IP).
- Check that username and password are correctly URL-encoded if they contain special symbols.

### Python Execution Policy on Windows
If `Activate.ps1` gives an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

