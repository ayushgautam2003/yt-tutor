#!/bin/bash

# Load nvm so node/npm are available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Add Python user scripts to PATH
export PATH="$HOME/Library/Python/3.9/bin:$PATH"

echo "Starting YT Tutor..."
echo ""

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
  source "$(dirname "$0")/backend/.env" 2>/dev/null
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
  echo "ERROR: Set your OpenAI API key in backend/.env"
  echo "  OPENAI_API_KEY=sk-..."
  exit 1
fi

# Start backend
echo ">> Backend  → http://localhost:8000"
cd "$(dirname "$0")/backend"
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo ">> Frontend → http://localhost:5173"
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Open http://localhost:5173 in your browser."
echo "Press Ctrl+C to stop both servers."
echo ""

# Shut both down on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
