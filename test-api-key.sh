y#!/bin/bash
# Quick test to verify Gemini API key is working

echo "🔍 Testing Gemini API Key Configuration"
echo "========================================"
echo ""

# Check if the key is in .env.local
if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2)
    if [ -z "$KEY" ]; then
        echo "❌ GEMINI_API_KEY is empty in .env.local"
    else
        echo "✅ GEMINI_API_KEY is set (starts with: ${KEY:0:10}...)"
    fi
else
    echo "❌ .env.local not found"
fi

echo ""
echo "📋 Checking Netlify Environment:"
echo ""

# Check Netlify environment
if command -v netlify &> /dev/null; then
    echo "Netlify environment variables:"
    netlify env:list | grep -i gemini || echo "⚠️  Could not read Netlify env (may need authentication)"
else
    echo "⚠️  netlify-cli not found in PATH"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Run: npm run build"
echo "2. Open: https://app.costinghub.com"
echo "3. Press F12 → Console"
echo "4. Type: process.env.GEMINI_API_KEY"
echo "5. Should see your API key (not 'undefined')"
