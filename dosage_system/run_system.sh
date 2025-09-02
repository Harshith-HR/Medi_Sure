#!/bin/bash

echo "🚀 Starting Drug Interaction Detection System..."

# Start FastAPI backend in background
echo "Starting FastAPI backend on port 8000..."
cd "$(dirname "$0")"
python backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start Streamlit frontend
echo "Starting Streamlit frontend on port 8501..."
streamlit run app.py --server.port 8501 --server.address 0.0.0.0

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
