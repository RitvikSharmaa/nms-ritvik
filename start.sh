#!/bin/bash

echo "🚀 Starting NetPulse NMS..."

# Start backend in background
cd server
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Go back and start frontend
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Backend started (PID: $BACKEND_PID)"
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "📊 Access application at: http://localhost:5173"
echo "🔧 API running at: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for Ctrl+C
wait
