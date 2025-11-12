# Fix for "API key not valid" Error

## Summary of Changes

I've identified and fixed the environment variable issue causing the Gemini API 400 error. The problem was that environment variables weren't being properly passed to the production build.

### Changes Made:

1. **Updated `vite.config.ts`**
   - Added proper fallback handling for environment variables
   - Now supports both Netlify environment variables and .env files
   - Included SUPABASE_URL and SUPABASE_KEY in the Vite config

2. **Created `.env.example`**
   - Template for local development environment variables
   - Documents required keys for local setup

3. **Created `ENV_VARS_TROUBLESHOOTING.md`**
   - Comprehensive troubleshooting guide
   - Step-by-step verification methods
   - Common issues and solutions

4. **Redeployed to Netlify**
   - New production build: https://app.costinghub.com
   - All changes live and ready

---

## Quick Fix Checklist

### ✅ Step 1: Verify Netlify Environment Variables

1. Go to https://app.netlify.com
2. Click your site **costinghub**
3. Go to **Site settings** → **Build & deploy** → **Environment**
4. Verify these variables exist with values:
   - `GEMINI_API_KEY` = (your actual key, not empty)
   - `SUPABASE_URL` = (your URL)
   - `SUPABASE_KEY` = (your key)

**If any are missing or empty:**
- Click "Edit variables" and add/update them
- Make sure there are NO extra spaces before or after the values

### ✅ Step 2: Trigger a New Deploy

If you just added/updated env vars on Netlify, you must redeploy:

**Option A: Auto-deploy via Git**
```bash
git pull origin main
# This will trigger automatic rebuild on Netlify
```

**Option B: Manual deploy**
```bash
npm run build
netlify deploy --prod --dir=dist
```

**Option C: Via Netlify UI**
- Go to Site settings → Deploys
- Click "Trigger deploy" button

### ✅ Step 3: Verify Environment Variables Are Working

**Fastest way (2 seconds):**
1. Open https://app.costinghub.com in browser
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Type: `process.env.GEMINI_API_KEY`
5. Press Enter

**Expected result:**
- You should see your API key printed (e.g., `"AIza...xyz"`)
- If you see `undefined` → env vars not set, go back to Step 1
- If you see empty string `""` → env var is set but empty

**Try a feature that uses Gemini:**
1. Go to any page with "Suggest" buttons (e.g., Machine, Tool, Material)
2. Click a suggest button
3. If it works → env vars are correct ✅
4. If "API key not valid" error → go to Step 1

---

## Image URLs Issue

You may see 404 errors for process images (chamfer-milling.png, etc.). These are hosted on ibb.co which may have expired links.

**To fix image loading:**
Replace the image URLs in `constants.ts` with:
- Working image hosting (Imgur, Cloudinary, etc.)
- Local images in `/public` folder
- Or remove imageUrl to display placeholder

Example in constants.ts:
```typescript
{ 
  id: 'proc_cncmill_002', 
  name: 'Peripheral Milling',
  // Remove or replace this:
  imageUrl: 'https://i.ibb.co/C1dC2F9/peripheral-milling.png',
}
```

---

## Still Having Issues?

See the detailed guide: **`ENV_VARS_TROUBLESHOOTING.md`**

It includes:
- 5 different verification methods
- Detailed troubleshooting for each error
- API key generation instructions
- Browser console testing examples

