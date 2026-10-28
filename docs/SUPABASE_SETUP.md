# Supabase Authentication & Setup Guide for AI Toon

This document guides you through setting up a **free tier** Supabase project for **AI Toon**.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or sign up for free).
2. Click **New project**.
3. Choose an organization, enter a name (e.g. `ai-toon`), set a strong database password, and pick a region near you.
4. Select the **Free Tier** plan.
5. Click **Create new project** and wait ~1 minute for provisioning.

---

## 2. Obtain Your API Keys

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) → **API**.
2. Locate the following values:
   - **Project URL**: e.g. `https://xyzproject.supabase.co`
   - **Project API Keys**: Copy the **`anon` `public`** key.
     > ⚠️ **IMPORTANT**: NEVER copy or expose the `service_role` secret key to the frontend! Only use the `anon` key in client applications.

---

## 3. Configure Your Frontend Environment

In your `frontend/` directory, create a local `.env.local` file (which is git-ignored):

```bash
# In frontend/.env.local:
VITE_API_BASE_URL=/api
VITE_APP_TITLE=AI Toon
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## 4. Email Verification Configuration in Supabase Dashboard

By default, Supabase requires new users to confirm their email address before they can sign in.

### For Local Development / Testing (Recommended):
To allow instant sign-ups and logins without waiting for confirmation emails during local development:
1. In the Supabase Dashboard, go to **Authentication** → **Providers** → **Email**.
2. Scroll to **Confirm email**.
3. Toggle **Confirm email** to **OFF** (Disabled).
4. Click **Save**.

*Note: If you leave "Confirm email" ON, when users register they will see a notification to check their inbox. You can still test by clicking the verification link sent by Supabase.*

---

## 5. Site URL & Redirect URLs

1. In the Supabase Dashboard, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to:
   ```
   http://localhost:5173
   ```
3. Under **Redirect URLs**, add:
   ```
   http://localhost:5173/**
   ```
4. Click **Save**.

---

## 6. How AI Toon Handles Sessions & Security

- **Client-Side Persistence**: The official `@supabase/supabase-js` client automatically persists sessions to the browser's `localStorage` and handles token refreshes.
- **Protected Routing**: The `<ProtectedRoute>` component verifies active sessions before rendering `/dashboard`. Unauthenticated attempts are safely redirected to `/login` while saving the attempted destination URL.
- **Public-Only Routing**: Authenticated users visiting `/login` or `/signup` are automatically redirected to `/dashboard`.
- **Zero Secrets in Code**: All sensitive keys remain in git-ignored `.env.local`.
