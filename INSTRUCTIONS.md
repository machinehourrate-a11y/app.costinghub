
# Fixing "TypeError: Failed to fetch" (CORS Issue)

If you are seeing a `TypeError: Failed to fetch` error in the application, it means the browser is blocking requests to Supabase. This is almost always a Cross-Origin Resource Sharing (CORS) issue, especially when running the app in a development or sandboxed environment like this one.

To fix this, you need to tell your Supabase project to accept requests from this app's domain. The simplest way to ensure this works is to allow all origins.

**Warning:** Allowing all origins (`*`) is not recommended for a production application. For production, you should list only your specific application domains.

## Instructions

1.  **Navigate to API Settings:**
    *   Go to your Supabase Project dashboard.
    *   In the left sidebar, click on the **Project Settings** (cog) icon.
    *   Click on **API**.

2.  **Configure CORS:**
    *   Scroll down to the **CORS settings** section.
    *   In the **Allowed Origins (CORS)** input field, add `*` on a new line. If there are other URLs, make sure `*` is present.
    *   The field should look something like this:
        ```
        localhost:3000, localhost:3001
        *
        ```

3.  **Save:**
    *   Click **"Save"** at the bottom of the page.

4.  **Refresh Application:**
    *   Go back to the application and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). The data should now load correctly.

---

# Fixing "duplicate key value" Error for Regions

If you encounter the error `duplicate key value violates unique constraint "region_currency_map_region_key"`, it means your database has a constraint that allows only one user to define a region (like 'India') globally. To allow multiple users to define their own 'India' mapping, you must run the following SQL fix.

1.  **Open the SQL Fix Script:**
    *   In the project file explorer, open the `fix_constraints.sql` file.
    *   Copy the **entire content** of this file.

2.  **Run in Supabase SQL Editor:**
    *   Navigate to the **SQL Editor** section in your Supabase dashboard.
    *   Click on **"+ New query"**.
    *   Paste the copied SQL code into the editor.
    *   Click **"Run"**.

3.  **Verify:**
    *   You should see "Success. No rows returned."
    *   Try adding the region again in the application.

---

# Supabase Database Initialization

If you are encountering errors like "violates row-level security policy", "violates not-null constraint", or "Could not find the 'app_metadata' column", it means your database needs a one-time configuration. This setup involves running a single SQL script to create necessary functions, triggers, and permissions.

**Important:** When you run this script, Supabase will return "Success. No rows returned." This is the **correct** output. The fix requires two steps: running the script, and then logging out and back in.

## Instructions

1.  **Open the SQL Script:**
    *   In the project file explorer, open the `database_setup.sql` file.
    *   Copy the **entire content** of this file.

2.  **Run in Supabase SQL Editor:**
    *   Navigate to the **SQL Editor** section in your Supabase dashboard.
    *   Click on **"+ New query"**.
    *   Paste the copied SQL code into the editor.

3.  **Review Super Admins:**
    *   **Important:** In the SQL code you just pasted, find the `is_superadmin` function. Review the list of emails and ensure your super admin email addresses are included.

4.  **Execute the Script:**
    *   Click **"Run"**. You should see the message "Success. No rows returned."

5.  **Log Out and Back In:**
    *   **Crucial Step:** Go back to your application, **log out completely**, and then **log back in** using one of the super admin email addresses. This one-time action allows the application to seed the global library data correctly with the new database rules.

---

# Provider Configuration (Google & MFA)

For features like "Sign in with Google" and Multi-Factor Authentication (MFA) to work, you need to enable them in your Supabase project dashboard.

## Enabling Google Auth

Follow these steps to allow users to sign in with their Google accounts:

1.  **Navigate to Auth Providers:**
    *   Go to your Supabase Project dashboard.
    *   In the left sidebar, click on the **Authentication** icon.
    *   Click on **Providers**.

2.  **Enable Google:**
    *   Find **Google** in the list of providers and click on it.
    *   Toggle the **"Enabled"** switch to turn it on.

3.  **Configure Google Credentials:**
    *   You will see a **Redirect URL** provided by Supabase. Copy this URL.
    *   You need to get a **Client ID** and **Client Secret** from the Google Cloud Console. Follow Supabase's official guide for detailed steps: [Supabase Docs: Google OAuth](https://supabase.com/docs/guides/auth/social-login/google).
    *   During the setup in Google Cloud Console, you will be asked for an "Authorized redirect URI". Paste the URL you copied from Supabase here.
    *   Once you have your Client ID and Client Secret, paste them back into the Google provider settings in your Supabase dashboard.

4.  **Save:**
    *   Click **"Save"** in the Supabase dashboard.

"Sign in with Google" will now work in your application.

## Enabling Multi-Factor Authentication (MFA)

This application supports Time-based One-Time Passwords (TOTP) for MFA.

1.  **Navigate to Auth Providers:**
    *   Go to your Supabase Project dashboard.
    *   In the left sidebar, click on the **Authentication** icon.
    *   Click on **Providers**.

2.  **Enable TOTP:**
    *   Scroll down to the **Multi-Factor Authentication** section.
    *   Find **Time-based One-Time Password (TOTP)**.
    *   Toggle the **"Enabled"** switch to turn it on.

---

# Cloudflare Pages Configuration

To host this application on Cloudflare Pages and enable the subscription webhook, follow these steps.

## 1. Environment Variables
Go to your Cloudflare Pages Dashboard for this project: **Settings > Environment variables**. Add the following:

*   `API_KEY`: Your Google Gemini API Key.
*   `SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase **Service Role** API Key (Found in Project Settings > API). **Do not use the Anon key.**
*   `MARKETING_WEBHOOK_SECRET`: A secure random string (e.g., `my-secret-token-123`). This must match the token your marketing site sends in the `Authorization` header.

## 2. Subscription Webhook Setup

The database setup remains the same as before.

### Database Setup
1.  Open the file named `subscription_setup.sql` in this project.
2.  Copy the content.
3.  Go to your **Supabase Dashboard > SQL Editor**.
4.  Paste and **Run** the script. This creates the `subscription_plans` table and adds the required columns to `profiles`.

### Webhook Endpoint
On Cloudflare Pages, your webhook URL will be:
`https://<your-project-name>.pages.dev/provision-subscription`

Send a **POST** request with the following JSON body:
```json
{
  "user_email": "customer@example.com",
  "plan": "Pro", 
  "expiry_date": "2025-12-31T23:59:59Z",
  "payment_id": "pay_123456"
}
```
**Headers:**
`Authorization: Bearer <MARKETING_WEBHOOK_SECRET>`
