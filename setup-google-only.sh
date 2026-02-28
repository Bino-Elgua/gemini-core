#!/bin/bash

echo "🚀 Sacred Core - Google-Only Refactor Setup"
echo "==========================================="
echo ""

# Check Node version
echo "✓ Checking Node.js..."
node_version=$(node -v)
echo "  Node version: $node_version"

# Install dependencies
echo ""
echo "✓ Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
echo ""
echo "✓ Setting up environment..."
if [ ! -f .env.local ]; then
  echo "Creating .env.local..."
  cat > .env.local << 'EOF'
# Google Gemini API Key
# Get free key at: https://ai.google.dev
VITE_GEMINI_API_KEY=sk-your-api-key-here

# Optional: Firebase config (for real-time chat)
# VITE_FIREBASE_PROJECT_ID=your-project-id
# VITE_FIREBASE_API_KEY=your-firebase-key
EOF
  echo "  ✓ Created .env.local"
  echo "  ⚠️  Please add your Gemini API key to .env.local"
else
  echo "  ✓ .env.local already exists"
fi

# Build check
echo ""
echo "✓ Checking build..."
npm run build 2>&1 | tail -5

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Add your Gemini API key to .env.local"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3001"
echo "  4. Go to /settings to configure API"
echo ""
echo "🧬 Quick Start Flow:"
echo "  1. Settings → Add Gemini API key"
echo "  2. Intelligence Hub → Extract DNA"
echo "  3. Campaign Forge → Generate & Schedule"
echo "  4. Website Builder → Generate landing page"
echo "  5. Live Sessions → Chat with team"
echo ""
echo "📚 Read: GOOGLE_ONLY_REFACTOR.md for details"
echo ""
