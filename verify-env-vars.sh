#!/bin/bash
# Netlify Environment Variable Verification Script
# Run this to quickly check if your environment variables are properly set

echo "🔍 Checking Netlify Site Information..."
echo ""

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Install with: npm install -g netlify-cli"
    exit 1
fi

echo "📋 Reading Netlify environment variables..."
echo ""

# Get the site name (assumes it's in .netlify/state.json or netlify.toml)
SITE_NAME="costinghub"

echo "Site: $SITE_NAME"
echo ""

# Display environment variables set on Netlify
echo "Environment variables set on Netlify:"
echo "======================================="
netlify env:list --site $SITE_NAME 2>/dev/null || {
    echo "Tip: You need to be authenticated with Netlify"
    echo "Run: netlify login"
    echo "Then run this script again"
    exit 1
}

echo ""
echo "✅ Verification Steps:"
echo "1. Check that GEMINI_API_KEY has a value (not empty)"
echo "2. Check that SUPABASE_URL and SUPABASE_KEY exist"
echo "3. Go to https://app.costinghub.com and open DevTools (F12)"
echo "4. In Console, type: process.env.GEMINI_API_KEY"
echo "5. You should see your API key printed (not 'undefined')"
echo ""
echo "If all values are set and you still get API errors:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Reload page (F5)"
echo "4. Look for failed requests to generativelanguage.googleapis.com"
echo "5. Check the response for error details"
