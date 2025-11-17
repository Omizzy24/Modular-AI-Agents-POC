#!/bin/bash

# Simple, direct Docker restart script
# No checks - just kill and restart

echo "🔧 Force Restarting Docker Desktop..."
echo ""

# Step 1: Kill Docker Desktop (no questions asked)
echo "1️⃣  Killing Docker Desktop processes..."
killall "Docker Desktop" 2>/dev/null || true
killall "com.docker.backend" 2>/dev/null || true
killall "com.docker.vpnkit" 2>/dev/null || true
killall "com.docker.driver.amd64-linux" 2>/dev/null || true

echo "   Waiting 3 seconds..."
sleep 3

# Step 2: Start Docker Desktop
echo "2️⃣  Starting Docker Desktop..."
open -a "Docker Desktop"

echo "   Waiting 10 seconds for Docker Desktop to launch..."
sleep 10

# Step 3: Wait for daemon with simple polling
echo "3️⃣  Waiting for Docker daemon (max 60 seconds)..."

for i in {1..30}; do
    if docker ps > /dev/null 2>&1; then
        echo ""
        echo "✅ Docker is ready!"
        echo ""
        docker version --format 'Server: {{.Server.Version}}'
        echo ""
        echo "🎉 Success! Docker is running."
        echo ""
        echo "Next steps:"
        echo "  cd poc"
        echo "  docker-compose up -d"
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo "❌ Docker did not start within 60 seconds"
echo ""
echo "Please check Docker Desktop manually:"
echo "  1. Open Docker Desktop app"
echo "  2. Check for error messages"
echo "  3. Try Settings → Troubleshoot → Reset to factory defaults"
exit 1
