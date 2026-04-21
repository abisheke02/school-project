-- Phase 5/6: Payments, Consent, Refresh Tokens, Subscriptions

-- ─────────────────────────────────────────────
-- PAYMENT ORDERS (Razorpay)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(100) UNIQUE,
  razorpay_payment_id VARCHAR(100),
  amount_paise      INTEGER NOT NULL,           -- amount in paise (INR * 100)
  currency          VARCHAR(5) NOT NULL DEFAULT 'INR',
  plan_type         VARCHAR(20) NOT NULL DEFAULT 'pro',
  student_count     INTEGER NOT NULL DEFAULT 1,
  status            VARCHAR(20) NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','paid','failed','refunded')),
  webhook_payload   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_school ON payment_orders(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_razorpay ON payment_orders(razorpay_order_id);

-- ─────────────────────────────────────────────
-- CONSENT RECORDS (DPDP Compliance)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type     VARCHAR(50) NOT NULL CHECK (consent_type IN ('data_processing','marketing','analytics')),
  granted          BOOLEAN NOT NULL DEFAULT TRUE,
  ip_address       VARCHAR(50),
  user_agent       TEXT,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id, consent_type);

-- ─────────────────────────────────────────────
-- REFRESH TOKENS (JWT rotation — Phase 6 security)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash       VARCHAR(128) NOT NULL UNIQUE,  -- SHA-256 of the token
  expires_at       TIMESTAMPTZ NOT NULL,
  revoked          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, revoked);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ─────────────────────────────────────────────
-- DATA EXPORT REQUESTS (DPDP right-to-access)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_export_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','ready','downloaded','expired')),
  download_url     TEXT,                         -- S3 pre-signed URL once ready
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at         TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ                   -- URL expires after 24h
);

-- ─────────────────────────────────────────────
-- MIXPANEL EVENT LOG (local mirror for debugging)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name       VARCHAR(100) NOT NULL,
  properties       JSONB DEFAULT '{}',
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, event_name, occurred_at);

-- ─────────────────────────────────────────────
-- Add max_students column to schools for free-tier enforcement
-- ─────────────────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 5;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100);

-- ─────────────────────────────────────────────
-- Add email to users (for Razorpay receipts & notifications)
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
