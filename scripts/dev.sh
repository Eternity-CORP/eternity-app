#!/bin/bash

# E-Y Development Start Script
# Starts API and Mobile app with automatic cleanup

set -e

echo "🚀 Starting E-Y Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠️  Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Clean up ports
echo -e "${YELLOW}🧹 Cleaning up ports...${NC}"
kill_port 3000  # API
kill_port 8081  # Metro bundler

# Check if dist exists and is valid
if [ ! -d "apps/api/dist" ] || [ ! -f "apps/api/dist/main.js" ]; then
    echo -e "${YELLOW}📦 Building API (dist not found)...${NC}"
    cd apps/api
    rm -rf dist
    pnpm build
    cd "$PROJECT_ROOT"
fi

# Cleanup function to kill API when script exits
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    if [ -n "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    kill_port 3000
    kill_port 8081
    echo -e "${GREEN}✅ Stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}✅ Starting services...${NC}"
echo ""

# Start API in background
echo -e "${YELLOW}📡 Starting API server...${NC}"
cd apps/api
pnpm start:dev > /dev/null 2>&1 &
API_PID=$!
cd "$PROJECT_ROOT"

# Wait for API to be ready
echo -e "${YELLOW}⏳ Waiting for API...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API ready${NC}"
        break
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  API:    http://localhost:3000 (background)${NC}"
echo -e "${GREEN}  Mobile: Interactive Expo below${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Expo commands: s=switch device, i=iOS, a=Android, r=reload${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start Expo in foreground (interactive)
cd apps/mobile
pnpm start
