-- ============================================================================
--  Indian Waste Portal - PostgreSQL schema (production: DigitalOcean Managed PG)
-- ----------------------------------------------------------------------------
--  This mirrors lib/schema.sql (SQLite, used for local dev) with all migrations
--  already folded in. Differences vs. SQLite are dialect-only:
--    * datetime('now')  ->  TIMESTAMPTZ columns with DEFAULT NOW()
--    * AUTOINCREMENT    ->  SERIAL / GENERATED identity
--    * updated_at trigger  ->  a shared PL/pgSQL trigger function
--    * INSERT OR IGNORE (seed)  ->  ON CONFLICT DO NOTHING
--  The runtime SQL translator in lib/d1-db.js (toPg) handles the query-side
--  gaps (?->$n, datetime('now',...) intervals), so app code stays dialect-agnostic.
--
--  Idempotent: safe to run repeatedly (CREATE TABLE IF NOT EXISTS, etc.).
-- ============================================================================

-- -- Shared updated_at trigger function --------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -- organizations -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id                TEXT PRIMARY KEY,

  -- CPCB Step 1: Account fields
  org_name          TEXT NOT NULL,
  auth_person       TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT NOT NULL,
  password_hash     TEXT NOT NULL,

  -- CPCB Step 2A: Category & Classification
  category          TEXT,
  sub_category      TEXT,

  -- Internal plan (billing tier)
  plan              TEXT NOT NULL DEFAULT 'standard',

  -- Workflow status: New | Paid | Queued | In Progress | Completed | Failed | Rejected
  status            TEXT NOT NULL DEFAULT 'New',

  -- Payment
  payment_token     TEXT UNIQUE,
  payment_verified  INTEGER NOT NULL DEFAULT 0,

  -- Queue tracking
  queue_position    INTEGER,
  queue_job_id      TEXT,

  -- Result
  ack_number        TEXT,
  portal_status     TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  queued_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  -- Consultation / billing workflow
  appointment_at          TIMESTAMPTZ,
  consultant_notes        TEXT,
  assigned_admin          TEXT,
  retainer_paid           INTEGER NOT NULL DEFAULT 0,
  balance_amount_paise    INTEGER,
  balance_invoice_url     TEXT,
  balance_payment_link_id TEXT,

  -- Client account link + service line
  user_id           TEXT,
  service_type      TEXT NOT NULL DEFAULT 'solid_waste',

  -- OTP relay (client enters their own OTP on their status page)
  otp_requested_at  TIMESTAMPTZ,
  manual_otp        TEXT,
  manual_otp_at     TIMESTAMPTZ,

  -- Soft delete — admin archives old/junk submissions (hidden from default list)
  archived          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orgs_status      ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_orgs_email       ON organizations(email);
CREATE INDEX IF NOT EXISTS idx_orgs_token       ON organizations(payment_token);
CREATE INDEX IF NOT EXISTS idx_orgs_queue_pos   ON organizations(queue_position);
CREATE INDEX IF NOT EXISTS idx_orgs_appointment ON organizations(appointment_at);
CREATE INDEX IF NOT EXISTS idx_orgs_user        ON organizations(user_id);

DROP TRIGGER IF EXISTS trg_orgs_updated_at ON organizations;
CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- metrics -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics (
  id                      TEXT PRIMARY KEY,
  org_id                  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  floor_area_sqm          REAL DEFAULT 0,
  waste_kg_per_day        REAL DEFAULT 0,
  water_liters_per_day    REAL DEFAULT 0,

  is_bulk_waste_generator INTEGER NOT NULL DEFAULT 0,
  qualifying_criteria     TEXT DEFAULT '[]',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_org ON metrics(org_id);

DROP TRIGGER IF EXISTS trg_metrics_updated_at ON metrics;
CREATE TRIGGER trg_metrics_updated_at BEFORE UPDATE ON metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -- lgd_addresses -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lgd_addresses (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  state_code        TEXT NOT NULL,
  state_name        TEXT NOT NULL,
  district_name     TEXT NOT NULL,
  sub_district      TEXT,
  city_name         TEXT NOT NULL,
  full_address      TEXT,
  zone_ward         TEXT,
  local_body_type   TEXT,
  pincode           TEXT,

  latitude          REAL,
  longitude         REAL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- payments ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount_paise          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                TEXT NOT NULL DEFAULT 'created',
  webhook_payload       TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind                  TEXT NOT NULL DEFAULT 'full',
  receipt_no            TEXT,
  refund_id             TEXT,
  refund_amount_paise   INTEGER,
  refund_status         TEXT,
  refunded_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);

-- -- ewaste_waitlist ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ewaste_waitlist (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL DEFAULT 'landing_modal',
  discount_code TEXT,
  notified      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- queue_jobs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS queue_jobs (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'pending',
  attempt_count        INTEGER NOT NULL DEFAULT 0,
  last_error           TEXT,
  queue_position       INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  captcha_image_base64 TEXT,
  captcha_text_input   TEXT,
  otp_input            TEXT,
  otp_attempts         INTEGER NOT NULL DEFAULT 0,
  otp_locked_until     TIMESTAMPTZ,
  otp_sent_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_org    ON queue_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status);

-- -- agent_logs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_logs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id      TEXT,
  step        TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT,
  screenshot  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_org ON agent_logs(org_id);

-- -- queue_counter (single-row global counter) -------------------------------
CREATE TABLE IF NOT EXISTS queue_counter (
  key   TEXT PRIMARY KEY DEFAULT 'global',
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO queue_counter (key, value) VALUES ('global', 0)
  ON CONFLICT (key) DO NOTHING;

-- -- admin_users -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  totp_secret   TEXT,
  totp_enabled  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- audit_log ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  admin_email TEXT,
  org_id      TEXT,
  action      TEXT NOT NULL,
  meta        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id);

-- -- notifications -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  channel     TEXT NOT NULL,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued',
  payload     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);

-- -- pricing_rules -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_rules (
  id           TEXT PRIMARY KEY,
  est_type     TEXT NOT NULL,
  location     TEXT NOT NULL DEFAULT 'Any',
  amount_paise INTEGER NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_rules(active);

-- -- users (client login identity) -------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  full_name      TEXT,
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified INTEGER NOT NULL DEFAULT 0,
  session_epoch  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- -- pincode_directory (LGD reference data, ~155k rows) -----------------------
CREATE TABLE IF NOT EXISTS pincode_directory (
  id           SERIAL PRIMARY KEY,
  statename    TEXT NOT NULL,
  district     TEXT NOT NULL,
  divisionname TEXT NOT NULL,
  officename   TEXT NOT NULL,
  pincode      TEXT NOT NULL,
  latitude     TEXT,
  longitude    TEXT
);

CREATE INDEX IF NOT EXISTS idx_pincode_state ON pincode_directory(statename);
CREATE INDEX IF NOT EXISTS idx_pincode_dist  ON pincode_directory(district);
CREATE INDEX IF NOT EXISTS idx_pincode_div   ON pincode_directory(divisionname);

-- -- rate_limits (shared fixed-window throttle counter) ------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
