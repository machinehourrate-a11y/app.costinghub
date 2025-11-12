# Environment Variables Troubleshooting Guide

## Issue: "API key not valid" error from Gemini API

### Root Causes:
1. **API key not set in Netlify** - Environment variables aren't configured on Netlify
2. **API key is empty/undefined** - The variable exists but has no value
3. **API key format is incorrect** - Extra spaces or wrong key copied
4. **Site not rebuilt after setting env vars** - Need to redeploy after adding env vars

---

## Solution Steps:

### Step 1: Verify API Key is Set on Netlify

1. Go to https://app.netlify.com
2. Select your site (costinghub)
3. Click **Site settings** → **Build & deploy** → **Environment**
4. Look for these variables:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

✅ **If they exist:** Check they have values (not empty)
❌ **If missing:** Add them now

### Step 2: Set the API Keys on Netlify

You can use either method:

#### Method A: Netlify UI
1. Site settings → Build & deploy → Environment
2. Click "Edit variables"
3. Add each variable:
   ```
   GEMINI_API_KEY = [your actual key]
   SUPABASE_URL = [your supabase url]
   SUPABASE_KEY = [your supabase anon key]
   ```
4. Click "Save"

#### Method B: CLI
```bash
netlify env:set GEMINI_API_KEY 'your_actual_key'
netlify env:set SUPABASE_URL 'your_supabase_url'
netlify env:set SUPABASE_KEY 'your_supabase_key'
```

### Step 3: Trigger a New Deploy

After setting environment variables, you MUST redeploy:

```bash
npm run build
netlify deploy --prod --dir=dist
```

Or via Git:
```bash
git add -A
git commit -m "Update for env var verification"
git push origin main
```

Netlify will automatically detect the push and rebuild with the new env vars.

### Step 4: Verify Environment Variables are Working

#### Method 1: Browser Console (Fastest)
1. Open your deployed site in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Type: `process.env.GEMINI_API_KEY`
5. ✅ Should show your API key (not empty, not `undefined`)

#### Method 2: Check Netlify Build Logs
1. Site settings → **Deploys**
2. Click on the most recent deploy
3. Look for "Build log" 
4. Search for "API_KEY" or "GEMINI"
5. ✅ Should see your env vars being injected

#### Method 3: Test API Call
In browser console, try:
```javascript
// This will test if Gemini API is accessible
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Hello' }] }]
  })
}).then(r => r.json()).then(console.log).catch(console.error)
```

#### Method 4: Use the App Features
1. Try to use a feature that requires Gemini (e.g., "Suggest Machine")
2. If it works → env vars are correct ✅
3. If "API key not valid" error → env vars aren't set ❌

#### Method 5: Check Netlify Functions (if added)
Create a simple function to echo env vars (optional)

---

## Common Issues:

### Issue: "API key not valid" but env vars are set

**Causes:**
- API key has extra spaces/quotes
- API key is actually invalid (deleted from Google Cloud)
- Site cache not cleared

**Fixes:**
1. Double-check the API key in Netlify UI - no leading/trailing spaces
2. Verify API key is still valid at https://console.cloud.google.com
3. Hard refresh browser: `Ctrl+Shift+R`
4. Wait 2-5 minutes for CDN cache to clear

### Issue: env vars show as `undefined` in console

**Causes:**
- Env vars not set before initial deployment
- Vite didn't pick them up during build
- Site needs rebuild

**Fixes:**
1. Set env vars on Netlify
2. Manually trigger redeploy: Site settings → Deploys → Trigger deploy
3. Or push a git commit to auto-trigger deploy

### Issue: "404 Not Found" for process images

**Causes:**
- ibb.co image links expired or invalid
- Image URLs in constants.ts point to broken links

**Fix:**
Replace image URLs in `constants.ts` with working image hosting or remove imageUrl

---

## API Key Generation:

### Get Gemini API Key:
1. Go to https://ai.google.dev/
2. Click "Get API key"
3. Create new API key in your Google Cloud project
4. Copy the key (no spaces)
5. Paste in Netlify environment variables

### Get Supabase Keys:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy `URL` and `anon public` key
5. Paste in Netlify environment variables

---

## Quick Checklist:

- [ ] GEMINI_API_KEY set in Netlify (Site settings → Environment)
- [ ] SUPABASE_URL set in Netlify
- [ ] SUPABASE_KEY set in Netlify
- [ ] All values have no extra spaces
- [ ] Site redeployed AFTER setting env vars
- [ ] Browser shows correct values in console: `process.env.GEMINI_API_KEY`
- [ ] Tried hard refresh: `Ctrl+Shift+R`

