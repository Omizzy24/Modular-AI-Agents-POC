#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Docker Desktop Restart Script${NC}"
echo ""

# Function to check if Docker daemon is responding
check_docker() {
    docker ps > /dev/null 2>&1
    return $?
}

# Function to wait for Docker to be ready
wait_for_docker() {
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}Waiting for Docker daemon to be ready...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if check_docker; then
            echo -e "${GREEN}✅ Docker daemon is ready!${NC}"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -ne "${YELLOW}Attempt $attempt/$max_attempts...${NC}\r"
        sleep 2
    done

    echo -e "${RED}❌ Docker daemon did not become ready after $max_attempts attempts${NC}"
    return 1
}

# Check current Docker status
echo "1️⃣  Checking current Docker status..."
if check_docker; then
    echo -e "${GREEN}✅ Docker is already running and responsive!${NC}"
    docker version --format 'Server Version: {{.Server.Version}}'
    exit 0
else
    echo -e "${YELLOW}⚠️  Docker daemon is not responding${NC}"
fi

# Check if Docker Desktop process is running
echo ""
echo "2️⃣  Checking Docker Desktop process..."
if pgrep -f "Docker Desktop" > /dev/null; then
    echo -e "${YELLOW}Docker Desktop process found (but daemon not responding)${NC}"
    echo -e "${YELLOW}Forcing Docker Desktop to quit...${NC}"

    # Try graceful quit first
    osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
    sleep 3

    # If still running, force kill
    if pgrep -f "Docker Desktop" > /dev/null; then
        echo -e "${YELLOW}Forcing kill...${NC}"
        killall "Docker Desktop" 2>/dev/null || true
        killall "com.docker.backend" 2>/dev/null || true
        killall "com.docker.vpnkit" 2>/dev/null || true
        sleep 2
    fi

    echo -e "${GREEN}✅ Docker Desktop stopped${NC}"
else
    echo -e "${YELLOW}Docker Desktop is not running${NC}"
fi

# Clean up any stale Docker socket
echo ""
echo "3️⃣  Cleaning up stale Docker resources..."
if [ -S "/var/run/docker.sock" ]; then
    echo "Removing stale Docker socket..."
    sudo rm -f /var/run/docker.sock 2>/dev/null || true
fi

# Start Docker Desktop
echo ""
echo "4️⃣  Starting Docker Desktop..."
open -a "Docker Desktop"

# Wait a moment for the app to launch
sleep 5

# Check if Docker Desktop launched
if ! pgrep -f "Docker Desktop" > /dev/null; then
    echo -e "${RED}❌ Failed to start Docker Desktop${NC}"
    echo "Please start Docker Desktop manually from Applications"
    exit 1
fi

echo -e "${GREEN}✅ Docker Desktop process started${NC}"

# Wait for daemon to be ready
echo ""
echo "5️⃣  Waiting for Docker daemon to initialize..."
if wait_for_docker; then
    # Show Docker info
    echo ""
    echo -e "${GREEN}🎉 Docker is ready!${NC}"
    echo ""
    docker version --format 'Client Version: {{.Client.Version}}'
    docker version --format 'Server Version: {{.Server.Version}}'
    echo ""
    docker info --format 'CPUs: {{.NCPU}}, Memory: {{.MemTotal}}'

    # Test with a simple command
    echo ""
    echo "6️⃣  Running test command..."
    if docker ps > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is fully operational!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "  1. Run: docker-compose up -d"
        echo "  2. Wait 30-60 seconds for services to initialize"
        echo "  3. Test: curl http://localhost:3000/health"
        exit 0
    else
        echo -e "${RED}❌ Docker test failed${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}❌ Docker failed to start properly${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "  1. Open Docker Desktop and check for errors"
    echo "  2. Go to Settings → Troubleshoot → Reset to factory defaults"
    echo "  3. Ensure you have at least 10GB free disk space"
    echo "  4. Check Docker Desktop → Settings → Resources"
    echo ""
    echo -e "${YELLOW}To view Docker Desktop logs:${NC}"
    echo "  Docker Desktop → Troubleshoot → Show logs"
    exit 1
fi
