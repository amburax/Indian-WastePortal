# Deploying Indian Waste Portal on DigitalOcean

This is the production setup: a **Droplet** runs the Next.js app (and, if you enable
automated filing, the Playwright worker), and a **Managed PostgreSQL** database holds
all data durably. Postgres is the right choice for real traffic — it handles many
concurrent registrations/payments safely, unlike a single SQLite file.

> **Why Postgres and not SQLite here?** SQLite is one file with a single writer — great
> for local dev, risky under concurrent web traffic and impossible to scale past one
> machine. Managed Postgres gives you concurrent writers, automated backups, and
> failover. The app auto-detects it: set `DATABASE_URL` and it uses Postgres; leave it
> unset locally and it uses the SQLite file. No code changes to switch.

---

## Architecture

```
                 ┌─────────────────────────────┐
   Internet ───► │  Droplet (Ubuntu 22.04)     │
      :443       │   nginx  → Next.js :3000     │──┐
                 │   PM2: app  (+ worker*)      │  │  private network (SSL)
                 └─────────────────────────────┘  │
                                                   ▼
                 ┌─────────────────────────────────────────┐
                 │  Managed PostgreSQL (DATABASE_URL)        │
                 │   organizations, payments, users, …       │
                 └─────────────────────────────────────────┘
   * worker only if NEXT_PUBLIC_ENABLE_AUTO_FILING=true (automated CPCB filing)
```

---

## 1. Create the Managed PostgreSQL database

1. DigitalOcean ▸ **Databases** ▸ Create ▸ **PostgreSQL** (v15+). Pick the same region
   as your Droplet.
2. Once created, open **Connection details** ▸ *Connection string*. It looks like:
   ```
   postgres://doadmin:PASSWORD@db-xxx.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```
   Keep `?sslmode=require` — the app enables SSL automatically for `.ondigitalocean.com`.
3. Under **Settings ▸ Trusted Sources**, add your Droplet (or its VPC) so only it can connect.

---

## 2. Provision the Droplet

- **Ubuntu 22.04**, 2 GB RAM minimum (4 GB if you run the Playwright worker — Chromium is heavy).
- Add your SSH key. SSH in, then:

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm i -g pm2

# App
sudo mkdir -p /var/www/iwp && sudo chown $USER /var/www/iwp
cd /var/www/iwp
git clone <YOUR_REPO_URL> .
npm ci
```

---

## 3. Configure environment

Create `/var/www/iwp/.env.local` (copy from `.env.example` and fill in real values). The
essentials for production:

```ini
NEXT_PUBLIC_APP_URL=https://yourdomain.in
APP_BASE_URL=https://yourdomain.in
PASSWORD_SALT=<long random string>

# PostgreSQL — this is what switches the app off SQLite:
DATABASE_URL=postgres://doadmin:PASSWORD@db-xxx.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require

ADMIN_EMAIL=admin@yourdomain.in
ADMIN_PASSWORD=<strong password>
ADMIN_SECRET=<long random hmac secret>
CLIENT_SECRET=<long random secret>

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...

EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=Indian Waste Portal <no-reply@yourdomain.in>

# Keep manual filing on unless the worker is running:
NEXT_PUBLIC_ENABLE_AUTO_FILING=false
```

> `.env.local` is gitignored — it never leaves the server.

---

## 4. Initialise the database (one time)

This applies the Postgres schema and seeds the admin user, example pricing, and the queue
counter. Add `--pincodes` to also load the ~155k-row LGD pincode directory used by the
address dropdowns in the registration form:

```bash
cd /var/www/iwp
node --env-file=.env.local scripts/init-postgres.mjs --pincodes
```

Idempotent — safe to re-run (it skips objects/rows that already exist). To force-replace
the pincode data later: `... scripts/init-postgres.mjs --pincodes --reseed`.

---

## 5. Build & run with PM2

```bash
cd /var/www/iwp
npm run build
pm2 start "npm run start" --name iwp-app
# Automated filing only (needs Chromium): npm run pw:install first, then:
# pm2 start "npm run worker" --name iwp-worker
pm2 save
pm2 startup            # run the command it prints, so PM2 survives reboots
```

The app now listens on `127.0.0.1:3000`.

---

## 6. nginx reverse proxy + HTTPS

`/etc/nginx/sites-available/iwp`:

```nginx
server {
    server_name yourdomain.in www.yourdomain.in;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/iwp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Free TLS certificate
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.in -d www.yourdomain.in
```

Point your domain's A record at the Droplet IP first. Certbot auto-renews.

---

## 7. Razorpay webhook

In the Razorpay dashboard set the webhook URL to:
```
https://yourdomain.in/api/payment-webhook
```
with the same secret you put in `RAZORPAY_WEBHOOK_SECRET`.

---

## Deploying updates

```bash
cd /var/www/iwp
git pull
npm ci
npm run build
pm2 reload iwp-app          # zero-downtime reload
# If the pull changed the schema: re-run init-postgres (idempotent).
```

---

## Backups & safety

- Managed Postgres does **automated daily backups** + point-in-time recovery — verify it's
  enabled under the DB's **Settings ▸ Backups**. This is the main reason to use it.
- Take a manual snapshot before big schema changes.
- Never expose the DB publicly — keep **Trusted Sources** restricted to the Droplet/VPC.
- Rotate `ADMIN_PASSWORD` / secrets before go-live; keep `.env.local` off git (it already is).

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Internal server error` on every page | `DATABASE_URL` unset or wrong → app can't reach Postgres. Check `pm2 logs iwp-app`. |
| `no pg_hba.conf entry` / connection refused | Droplet not in the DB's **Trusted Sources**, or missing `?sslmode=require`. |
| Address dropdowns empty in `/register` | Pincode directory not seeded → run `init-postgres.mjs --pincodes`. |
| Dates show as "Invalid Date" | You're on an old build — pull latest (the pg adapter returns ISO timestamps). |
| App won't start after reboot | `pm2 startup` step not completed — re-run it. |
