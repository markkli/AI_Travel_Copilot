#!/bin/bash
# Lopan — clean start script
# Kills any stale processes on 8000 / 5173, then starts backend + frontend

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧹  Clearing stale processes..."
lsof -ti :8000 | xargs kill -9 2>/dev/null && echo "  killed port 8000" || true
lsof -ti :5173 | xargs kill -9 2>/dev/null && echo "  killed port 5173" || true
sleep 1

echo ""
echo "🚀  Starting backend (port 8000)..."
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000\""

echo "🌐  Starting frontend (port 5173)..."
osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm run dev\""

echo ""
echo "✅  Done. Open http://localhost:5173 in your browser."
echo "    (Give the backend ~5s to finish starting.)"
