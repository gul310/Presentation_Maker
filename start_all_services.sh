#!/usr/bin/env bash
# ==============================================================================
# PresentMaker — Development Environment Launcher (macOS / Linux)
# ==============================================================================

echo "=========================================================="
echo "   PresentMaker — AI-Powered Presentation Maker Launcher   "
echo "=========================================================="
echo ""

# 1. Start Python FastAPI AI Microservice (Port 8002)
echo "[1/3] Launching Python FastAPI AI Microservice on Port 8002..."
(cd backend && source venv/bin/activate 2>/dev/null; python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8002) &
PID_FASTAPI=$!

# 2. Start Node.js API Gateway (Port 5000)
echo "[2/3] Launching Node.js Backend Gateway on Port 5000..."
(cd backend-node && npm run dev) &
PID_GATEWAY=$!

# 3. Start React Frontend (Port 5173)
echo "[3/3] Launching React 19 Frontend on Port 5173..."
(cd frontend && npm run dev) &
PID_FRONTEND=$!

echo ""
echo "All 3 services are running in background."
echo "Frontend: http://localhost:5173"
echo "Gateway:  http://localhost:5000"
echo "FastAPI:  http://127.0.0.1:8002/docs"
echo "Press Ctrl+C to terminate all services."

trap "kill $PID_FASTAPI $PID_GATEWAY $PID_FRONTEND; exit" SIGINT SIGTERM
wait

