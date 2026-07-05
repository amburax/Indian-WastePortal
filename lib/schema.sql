-- ═══════════════════════════════════════════════════════════════
--  Indian Waste Portal V2 — SQLite / Cloudflare D1 Schema
--  Compatible with: better-sqlite3 (local dev) + Cloudflare D1 (prod)
--
--  V2 additions marked with -- [V2]
--  Run locally:  node scripts/init-db.js
--  Run on D1:    wrangler d1 execute indianwasteportal-db --file=lib/schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Organizations (core table) ────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                TEXT PRIMARY KEY,              -- UUID v4

  -- CPCB Step 1: Account fields (exact field names from SWM portal)
  org_name          TEXT NOT NULL,                 -- Organisation / entity name
  auth_person       TEXT NOT NULL,                 -- Authorised person full name
  email             TEXT NOT NULL UNIQUE,          -- Official email address
  phone             TEXT NOT NULL,                 -- 10-digit mobile number
  password_hash     TEXT NOT NULL,                 -- Internal auth (bcrypt/sha256)

  -- CPCB Step 2A: Category & Classification [V2]
  category          TEXT,                          -- Institutional | Commercial | Residential
  sub_category      TEXT,                          -- e.g. "Hospital / nursing home" [V2]

  -- Internal plan (Indian Waste Portal billing tier)
  plan              TEXT NOT NULL DEFAULT 'standard',  -- standard | professional | enterprise

  -- Workflow status
  status            TEXT NOT NULL DEFAULT 'New',
  -- Values: New(Submitted) | UnderReview | Scheduled | Paid | Queued |
  --         In Progress(Filing) | AwaitingOTP | Verifying | Completed |
  --         NeedsAttention | Failed | Rejected | Cancelled

  -- Payment
  payment_token     TEXT UNIQUE,                   -- UUID used as public-facing token
  payment_verified  INTEGER NOT NULL DEFAULT 0,    -- 0 | 1

  -- Queue tracking [V2]
  queue_position    INTEGER,                       -- Position in automation queue
  queue_job_id      TEXT,                          -- CF Queue message ID for deduplication

  -- Result
  ack_number        TEXT,                          -- e.g. SWM/BWG-I/GJ/2026/0000042
  portal_status     TEXT,                          -- e.g. "Pending Verification at ULB" [V2]

  -- Consultant / scheduling [Phase 1: admin-triggered filing]
  appointment_at    TEXT,                          -- booked filing slot (ISO)
  consultant_notes  TEXT,                          -- internal notes from the call
  assigned_admin    TEXT,                          -- admin email handling this case

  -- Manual-filing OTP relay [V3] — client shares the CPCB OTP on their own screen
  otp_requested_at  TEXT,                          -- admin asked the client to share the OTP
  manual_otp        TEXT,                          -- OTP the client entered on their status page
  manual_otp_at     TEXT,                          -- when the client shared it

  -- Soft delete — admin archives old/junk submissions (hidden from default list)
  archived          INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  queued_at         TEXT,                          -- [V2] when pushed to queue
  completed_at      TEXT                           -- [V2] when ACK received
);

-- ── Metrics (BWG Threshold Data) ─────────────────────────────
CREATE TABLE IF NOT EXISTS metrics (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- The three BWG qualifying thresholds (SWM Rules 2016/2026)
  floor_area_sqm        REAL DEFAULT 0,            -- >= 20,000 sqm → BWG
  waste_kg_per_day      REAL DEFAULT 0,            -- >= 100 kg/day → BWG
  water_liters_per_day  REAL DEFAULT 0,            -- >= 40,000 L/day → BWG

  -- Derived (computed on save, verified server-side)
  is_bulk_waste_generator INTEGER NOT NULL DEFAULT 0,
  qualifying_criteria   TEXT DEFAULT '[]',         -- JSON: ["floor_area", "waste_kg"]

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── LGD Addresses (exact CPCB Step 2B fields) ────────────────
CREATE TABLE IF NOT EXISTS lgd_addresses (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- LGD hierarchy (exact CPCB portal field names)
  state_code        TEXT NOT NULL,
  state_name        TEXT NOT NULL,
  district_name     TEXT NOT NULL,
  sub_district      TEXT,                          -- Sub-District / Tehsil / Taluka [V2]
  city_name         TEXT NOT NULL,                 -- City / Village name
  full_address      TEXT,                          -- Full address (Plot, Street, Landmark)
  zone_ward         TEXT,                          -- Zone / Ward (optional) [V2]
  local_body_type   TEXT,                          -- Urban Local Body (ULB) | Rural Local Body (RLB) [V2]
  pincode           TEXT,

  -- Coordinates [V2]
  latitude          REAL,                          -- GPS latitude (from Google Maps)
  longitude         REAL,                          -- GPS longitude

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Payments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount_paise          INTEGER NOT NULL,          -- INR × 100
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                TEXT NOT NULL DEFAULT 'created',  -- created | paid | failed
  webhook_payload       TEXT,                      -- Raw JSON (audit)
  paid_at               TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  kind                  TEXT NOT NULL DEFAULT 'full',   -- full | retainer | balance
  -- Refunds (admin-issued via Razorpay)
  refund_id             TEXT,
  refund_amount_paise   INTEGER,
  refund_status         TEXT,
  refunded_at           TEXT
);

-- ── E-Waste Waitlist ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ewaste_waitlist (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL DEFAULT 'landing_modal',
  discount_code TEXT,                              -- Pre-generated 20% code
  notified      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Queue Jobs (audit + retry tracking) [V2] ─────────────────
CREATE TABLE IF NOT EXISTS queue_jobs (
  id              TEXT PRIMARY KEY,                -- CF Queue message ID
  org_id          TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | processing | waiting_for_user | done | failed
  attempt_count   INTEGER NOT NULL DEFAULT 0,      -- For retry logic
  last_error      TEXT,                            -- Last error message
  queue_position  INTEGER,                         -- Global position when enqueued
  
  -- Intercept Fields [V2]
  captcha_image_base64 TEXT,
  captcha_text_input   TEXT,
  otp_input            TEXT,

  -- OTP attempt accounting [Phase 1]
  otp_attempts     INTEGER NOT NULL DEFAULT 0,      -- failed-OTP counter
  otp_locked_until TEXT,                            -- lockout timestamp after max attempts
  otp_sent_at      TEXT,                            -- when CPCB OTP was triggered (expiry)

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  started_at      TEXT,
  completed_at    TEXT
);

-- ── Admin users (Phase 1 — Command Center auth) ──────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                      -- sha256(salt + password)
  role          TEXT NOT NULL DEFAULT 'admin',      -- admin | superadmin
  totp_secret   TEXT,                                -- base32 TOTP secret (2FA)
  totp_enabled  INTEGER NOT NULL DEFAULT 0,          -- 1 once verified/enrolled
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Audit log (every admin action) ───────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  admin_email TEXT,
  org_id      TEXT,
  action      TEXT NOT NULL,                        -- log_call | start_filing | send_link | reset_otp | set_status | login
  meta        TEXT,                                 -- JSON detail
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Notifications (SMS / WhatsApp / Email dispatch log) ──────
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,                        -- sms | whatsapp | email
  type        TEXT NOT NULL,                        -- submission_ack | otp_link | needs_attention
  status      TEXT NOT NULL DEFAULT 'queued',       -- queued | sent | failed
  payload     TEXT,                                 -- rendered message / link
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Agent Logs (automation audit trail) ──────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id      TEXT,                                -- FK to queue_jobs [V2]
  step        TEXT NOT NULL,                       -- navigate | fill_step1 | fill_step2 | step3_verify | step4_declarations | submit | ack_extract
  status      TEXT NOT NULL,                       -- success | error | retry
  message     TEXT,
  screenshot  TEXT,                                -- File path for debugging
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Queue Counter (KV fallback for local dev) [V2] ───────────
-- In production this is a Cloudflare KV entry.
-- This table acts as local fallback.
CREATE TABLE IF NOT EXISTS queue_counter (
  key   TEXT PRIMARY KEY DEFAULT 'global',
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO queue_counter (key, value) VALUES ('global', 0);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orgs_status        ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_orgs_email         ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_orgs_token         ON organizations(payment_token);
CREATE INDEX IF NOT EXISTS idx_orgs_queue_pos     ON organizations(queue_position);  -- [V2]
CREATE INDEX IF NOT EXISTS idx_metrics_org        ON metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org       ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_org     ON queue_jobs(org_id);              -- [V2]
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status  ON queue_jobs(status);              -- [V2]
CREATE INDEX IF NOT EXISTS idx_agent_logs_org     ON agent_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_org          ON audit_log(org_id);          -- [Phase 1]
CREATE INDEX IF NOT EXISTS idx_notifications_org  ON notifications(org_id);       -- [Phase 1]
CREATE INDEX IF NOT EXISTS idx_orgs_appointment   ON organizations(appointment_at); -- [Phase 1]

-- ── Triggers: auto-update updated_at ──────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_orgs_updated_at
  AFTER UPDATE ON organizations
  BEGIN
    UPDATE organizations SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_metrics_updated_at
  AFTER UPDATE ON metrics
  BEGIN
    UPDATE metrics SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- ── Pincode Directory (Pan-India Master Data) ─────────────────
CREATE TABLE IF NOT EXISTS pincode_directory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statename TEXT NOT NULL,
  district TEXT NOT NULL,
  divisionname TEXT NOT NULL,
  officename TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude TEXT,
  longitude TEXT
);

CREATE INDEX IF NOT EXISTS idx_pincode_state ON pincode_directory(statename);
CREATE INDEX IF NOT EXISTS idx_pincode_dist  ON pincode_directory(district);
CREATE INDEX IF NOT EXISTS idx_pincode_div   ON pincode_directory(divisionname);

-- ── Rate limits (shared fixed-window throttle counter) ────────
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);
