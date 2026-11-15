# ==============================================================================
# PresentMaker — One-Click Development Environment Launcher (Windows PowerShell)
# ==============================================================================
# This script opens three separate terminal windows to run all application tiers:
#   1. Python FastAPI AI Microservice (Port 8002)
#   2. Node.js Express Gateway (Port 5000)
#   3. React Vite Frontend (Port 5173)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   PresentMaker — AI-Powered Presentation Maker Launcher   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Get-Location

# 1. Start Python FastAPI Microservice
Write-Host "[1/3] Launching Python FastAPI AI Microservice (Port 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\backend'; if (Test-Path '.\venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python -m uvicorn app.main:app --host 127.0.0.1 --port 8002"

# 2. Start Node.js API Gateway
Write-Host "[2/3] Launching Node.js Backend Gateway (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\backend-node'; npm run dev"

# 3. Start React Frontend
Write-Host "[3/3] Launching React 19 Frontend (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\frontend'; npm run dev"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  All services launched in separate terminal windows!     " -ForegroundColor Cyan
Write-Host "  - Frontend UI:       http://localhost:5173              " -ForegroundColor Yellow
Write-Host "  - API Gateway:       http://localhost:5000              " -ForegroundColor Yellow
Write-Host "  - FastAPI Swagger:   http://127.0.0.1:8002/docs         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

