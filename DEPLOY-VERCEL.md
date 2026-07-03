# Deploying Indian Waste Portal to Vercel (with Turso DB)

Vercel hosts the Next.js app; **Turso** (free, SQLite-compatible, serverless) is the
database. The Playwright filing **worker** does *not* run on Vercel — run it locally /
on a VPS only when you want to complete a real (or demo) filing.

---

## 1. Push the code to GitHub

```bash
# from the project folder
git push -u origin main
```
If you get `Permission denied`, you're logged in as the wrong GitHub account.
Either add that account as a repo collaborator, **or** push with a token:
```bash
git push "https://YOUR_GITHUB_TOKEN@github.com/amburax/Indian-WastePortal.git" main
```
(Token: GitHub → Settings → Developer settings → Personal access tokens → *classic* → scope `repo`.)

---

## 2. Create the Turso database (one-time, ~3 min)

Install the CLI and sign up (free): https://docs.turso.tech/quickstart

```bash
# macOS/Linux/WSL
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup            # or: turso auth login

turso db create indianwasteportal
turso db show --url indianwasteportal          # → copy the libsql://… URL
turso db tokens create indianwasteportal       # → copy the token
```

Put both in your local `.env.local`:
```
TURSO_DATABASE_URL=libsql://indianwasteportal-<you>.turso.io
TURSO_AUTH_TOKEN=<the token>
```

## 3. Seed the schema + admin + pricing into Turso

```bash
npm run init-turso
```
This copies your full local schema into Turso and creates the admin login
(from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local`).

---

## 4. Deploy on Vercel

1. Go to **vercel.com → Add New → Project** and import **Indian-WastePortal**.
2. Framework preset: **Next.js** (auto-detected) — leave build settings default.
3. Add **Environment Variables** (Project → Settings → Environment Variables). Minimum for a working demo:

   | Key | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | your libsql:// URL |
   | `TURSO_AUTH_TOKEN` | your Turso token |
   | `PASSWORD_SALT` | a long random string |
   | `ADMIN_EMAIL` | your admin email |
   | `ADMIN_PASSWORD` | your admin password (same one you seeded) |
   | `ADMIN_SECRET` | a long random string |
   | `CLIENT_SECRET` | a long random string |
   | `APP_BASE_URL` | `https://<your-project>.vercel.app` |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` |
   | `AGENT_DEMO_MODE` | `true` |
   | `NOTIFY_PROVIDER` | `log` |
   | `EMAIL_PROVIDER` | `log` |

   Add Razorpay keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_RAZORPAY_KEY_ID`) only when you want real payments; without them the
   admin's **Mark Balance Paid** button simulates payment.

4. **Deploy.** Your site is live at `https://<project>.vercel.app`.
   - Landing / register / login / dashboard / admin all work (backed by Turso).
   - Admin console: `https://<project>.vercel.app/admin/login`.

> After the first deploy, update `APP_BASE_URL` + `NEXT_PUBLIC_APP_URL` to the real
> Vercel URL (or your custom domain) and redeploy so email/payment links are correct.

---

## 5. Running a filing (optional — needs the worker)

The browser-automation agent can't run on Vercel. To demo a filing end-to-end:

```bash
# locally, pointed at the SAME Turso DB (TURSO_* in .env.local)
npm run worker:demo     # AGENT_DEMO_MODE=true → synthetic ACK, never touches the real portal
```
Flow: client registers → admin **Send Invoice** → **Mark Balance Paid** → **Start Filing**
→ the running worker picks it up → status reaches **Completed** with a demo ACK.

For real CPCB filing, run `npm run worker` (no demo) on a small VPS with Chromium
installed (`npm run pw:install`), pointed at the same Turso DB.

---

## What runs where

| Piece | Vercel | Turso | Local/VPS worker |
|---|:--:|:--:|:--:|
| Next.js pages + API | ✅ | — | — |
| Database (accounts, orgs, payments) | — | ✅ | — |
| Playwright filing agent | ❌ | — | ✅ |
