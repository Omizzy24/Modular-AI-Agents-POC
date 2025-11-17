#!/bin/bash
set -e

echo "🚀 Setting up AI Orchestration POC with Gemini..."

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }

echo "✓ Node.js $(node --version)"
echo "✓ Docker $(docker --version | cut -d' ' -f3)"
echo "✓ Docker Compose $(docker-compose --version | cut -d' ' -f4)"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your API keys (or leave GOOGLE_API_KEY=mock for development)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build all packages
echo "🔨 Building packages..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env if you want to use real Gemini API (optional)"
echo "  2. Run 'docker-compose up -d' to start services"
echo "  3. Visit http://localhost:8080 for Temporal UI"
echo "  4. Test with: curl http://localhost:3000/health"
echo ""
