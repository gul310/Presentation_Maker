# PresentMaker — FYP Team Handover & Quickstart Guide

Welcome to the **PresentMaker** project repository! This guide provides everything an FYP team member needs to clone, configure, run, and develop the application independently on their own computer.

---

## 1. Quick Technical Summary

- **Frontend:** React 19 + TypeScript + Vite (Port `5173`)
- **Backend Gateway:** Node.js + Express + TypeScript + MongoDB (Port `5000`)
- **AI Microservice:** Python 3.10+ + FastAPI + Uvicorn (Port `8002`)
- **Database:** MongoDB Atlas (Cloud) or Local MongoDB
- **Primary AI:** Google Gemini (`gemini-2.5-flash`)
- **Secondary AI Fallback:** Groq Cloud (`llama-3.3-70b-versatile`)
- **Image Integration:** Unsplash API

---

## 2. Setting Up in 7 Simple Steps

### Step 1: Install Git, Node.js & Python
1. **Git:** Download and install from [git-scm.com](https://git-scm.com/).
2. **Node.js:** Install Node.js LTS (v20+ or v24) from [nodejs.org](https://nodejs.org/).
3. **Python:** Install Python 3.10, 3.11, or 3.12 from [python.org](https://www.python.org/). *Check "Add Python to PATH" during installation.*
4. **VS Code:** Install Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/).

### Step 2: Clone the Project Repository
Open PowerShell or your preferred terminal:
```powershell
git clone <repository-url>
cd PresentMaker
```
Open the folder in VS Code:
```powershell
code .
```

### Step 3: Install Frontend Dependencies
In your terminal:
```powershell
cd frontend
npm install
cd ..
```

### Step 4: Install Node Backend Dependencies
```powershell
cd backend-node
npm install
cd ..
```

### Step 5: Set Up Python AI Microservice
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### Step 6: Create Your Local Environment Files
Copy the example files:
```powershell
Copy-Item backend-node\.env.example backend-node\.env
Copy-Item backend\.env.example backend\.env
```

Open both `.env` files in VS Code:
1. **In `backend-node/.env`:**
   - Put your own MongoDB connection string under `MONGODB_URI`.
   - Put a random 32-character secret under `JWT_SECRET`.
   - (Optional) Put your free Unsplash API key.
2. **In `backend/.env`:**
   - Put your own Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/) under `GEMINI_API_KEY`.
   - Put your own Groq key from [console.groq.com](https://console.groq.com/keys) under `GROQ_API_KEY`.
   - Match `JWT_SECRET_KEY` with the secret used in `backend-node/.env`.

### Step 7: Run All 3 Services
Open **three separate terminals** in VS Code:

#### Terminal 1 — Frontend:
```powershell
cd frontend
npm run dev
```
> App UI will open at: **http://localhost:5173**

#### Terminal 2 — Node Gateway:
```powershell
cd backend-node
npm run dev
```
> Gateway runs at: **http://localhost:5000**

#### Terminal 3 — Python AI Service:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```
> AI Swagger docs available at: **http://127.0.0.1:8002/docs**

---

## 3. Stopping Services
To stop any service, press `CTRL + C` in its respective terminal window.

---

## 4. Key Rules for Team Members
- **NEVER commit `.env` files or API keys.** The root `.gitignore` protects them, but always check `git status` before committing.
- **Never push directly to `main`.** Create a feature branch (`git checkout -b feature/your-feature`) and open a Pull Request.
- **Each team member uses their own database.** Do not test against production or overwrite each other's data.
