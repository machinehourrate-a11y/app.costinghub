reDeploying this Vite + React app

This repository builds with Vite. The production build output is placed in the `dist` directory.

Recommended deploy target: Netlify

1) Netlify web UI (continuous deploy from Git):
   - Push the repo to GitHub (or Git provider).
   - In Netlify, choose "New site from Git" and connect your repo.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variables (e.g., `GEMINI_API_KEY`) in Site settings > Environment.
   - Netlify will run builds and publish automatically on push.

2) One-off CLI deploy (quick manual deploy):
   - Ensure you built the project: `npm install` then `npm run build` (creates `dist`).
   - Install Netlify CLI or use npx: `npm install -g netlify-cli` or `npx netlify-cli`.
   - Login: `netlify login`
   - Deploy: `netlify deploy --prod --dir=dist` (or `npx netlify-cli deploy --prod --dir=dist`).

## Environment Variables

Set the following environment variables in Netlify for the app to function correctly.

### Via Netlify Web UI
1. Go to your site on Netlify.
2. Click **Site settings** → **Build & deploy** → **Environment**.
3. Click **Add environment variable** and set each of:
   - `GEMINI_API_KEY` — your Gemini API key
   - `SUPABASE_URL` — your Supabase project URL (e.g., `https://xyz.supabase.co`)
   - `SUPABASE_KEY` — your Supabase service role or anon key
   - Any other environment variables your app requires
4. Save and Netlify will re-trigger a build.

### Via Netlify CLI
```bash
netlify env:set GEMINI_API_KEY 'your_key_here' --site costinghub
netlify env:set SUPABASE_URL 'https://your-project.supabase.co' --site costinghub
netlify env:set SUPABASE_KEY 'your_key_here' --site costinghub
```

## Continuous Deploy

Your repository is now linked to Netlify and GitHub. Netlify will automatically:
- Trigger a build whenever you push to the connected branch (usually `main` or `main`).
- Use the build command and publish directory from `netlify.toml`.
- Deploy the built site to production.

To verify, go to your Netlify site's **Deploys** tab to see build history and logs.

## Bundle Size Optimization

The `vite.config.ts` includes a `manualChunks` configuration that splits the build into separate vendor chunks:
- `vendor-react` — React and React DOM
- `vendor-charts` — Chart.js and charting libraries
- `vendor-supabase` — Supabase SDK
- `vendor-genai` — Google GenAI SDK
- `vendor` — other dependencies

This reduces the main application chunk size and enables better caching. If the main chunk is still large, consider:
- Using dynamic `import()` for large features (e.g., heavy modals, pages).
- Analyzing the bundle with `rollup-plugin-visualizer` for further insights.

## Custom Domain Setup (app.costinghub.com)

To connect a custom domain to your Netlify site:

### Step 1: Add Domain in Netlify UI
1. Go to your Netlify site dashboard.
2. Click **Site settings** → **Domain management** → **Custom domains**.
3. Click **Add domain** and enter `app.costinghub.com`.
4. Netlify will check domain availability and show you two options:
   - **Use Netlify DNS** — simpler; Netlify manages DNS for you.
   - **Set up externally** — if you manage DNS elsewhere (e.g., GoDaddy, Route53).

### Step 2a: Using Netlify DNS (Recommended)
1. After adding the domain, Netlify displays **Nameservers** to add to your registrar.
2. Go to your domain registrar (where you bought `costinghub.com`).
3. Update the domain's **Nameservers** to the Netlify nameservers provided (usually 4 NS records).
4. Wait 24–48 hours for DNS propagation.
5. Netlify will auto-provision an **SSL/TLS certificate** (free, via Let's Encrypt).
6. Once verified, your site will be accessible at `https://app.costinghub.com`.

### Step 2b: Using External DNS (e.g., GoDaddy, Route53)
1. In Netlify, select **Set up externally**.
2. Netlify provides an **ALIAS** or **ANAME** record (or **CNAME** if subdomain).
3. Go to your DNS provider and add a record:
   - **Type**: CNAME (for subdomain `app`) or ALIAS/ANAME (for root domain)
   - **Name**: `app`
   - **Value**: your Netlify subdomain (e.g., `costinghub.netlify.app` or the ALIAS Netlify provides)
4. Save and wait for DNS propagation (usually 15 minutes to 24 hours).
5. Netlify will auto-provision SSL/TLS once DNS is confirmed.

### Step 3: Verify and Test
- Once DNS propagates, visit `https://app.costinghub.com` in your browser.
- You should see your site (same as `costinghub.netlify.app`).
- Check the SSL certificate by clicking the lock icon in your browser address bar.
- Monitor Netlify **Domain management** for any warnings.

### Troubleshooting
- **Site not loading**: DNS may still be propagating (can take 24–48 hours). Use `nslookup app.costinghub.com` or online DNS checkers to verify.
- **SSL certificate not provisioning**: Ensure DNS is properly configured. Netlify may take a few hours to detect the change and issue the certificate.
- **Existing DNS records**: If you have existing records for `costinghub.com`, ensure they don't conflict with the new `app` subdomain.

### Notes
- Once custom domain is set up, `costinghub.netlify.app` will automatically redirect to `app.costinghub.com`.
- SSL/TLS is **free and automatic** on Netlify (auto-renewal included).
- You can also add additional custom domains (e.g., `www.costinghub.com`) in the same Domain management section.

---

## Notes
- A minimal `netlify.toml` is included in the repo setting the build command and publish directory.
- Build logs and function logs are available in the Netlify dashboard under **Logs**.
