-- 001_initial.sql
-- Initial schema for GenMail AI Service
-- Includes: extensions, leads, icps, email_sequences, email_logs, watchdog_audit_log

BEGIN;

-- ===========================================================================
-- Extensions
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================================================
-- Migration tracking table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS migrations_log (
  id SERIAL PRIMARY KEY,
  filename VARCHAR NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR,
  success BOOLEAN DEFAULT true
);

-- ===========================================================================
-- Leads table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL,
  name VARCHAR,
  zone VARCHAR,
  source VARCHAR,
  trigger VARCHAR,
  icp_slug VARCHAR,
  quality_score DECIMAL CHECK (quality_score >= 0 AND quality_score <= 1),
  intent_score DECIMAL CHECK (intent_score >= 0 AND intent_score <= 1),
  urgency VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'scoring', 'classified', 'in_sequence', 'converted', 'discarded', 'quarantine')),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- ICPs table (Ideal Customer Profiles)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS icps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  priority INTEGER DEFAULT 5,
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  intent_keywords TEXT[] DEFAULT '{}',
  zones TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',
  primary_product VARCHAR,
  secondary_products TEXT[] DEFAULT '{}',
  entry_price VARCHAR,
  tone VARCHAR,
  framework VARCHAR,
  cta_type VARCHAR,
  hook_templates TEXT[] DEFAULT '{}',
  hunt_sources JSONB DEFAULT '{}'::jsonb,
  hunt_queries TEXT[] DEFAULT '{}',
  prohibited_terms TEXT[] DEFAULT '{}',
  total_leads INTEGER DEFAULT 0,
  reply_rate DECIMAL DEFAULT 0,
  conversion_rate DECIMAL DEFAULT 0,
  avg_score DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- Email sequences table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  icp_slug VARCHAR,
  sequence_name VARCHAR,
  total_emails INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'stopped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- Email logs table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  step INTEGER,
  subject_line TEXT,
  body_text TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  reply_intent VARCHAR,
  bounce_type VARCHAR,
  complaint BOOLEAN DEFAULT false,
  score DECIMAL,
  send_recommendation VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- Watchdog audit log table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS watchdog_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  incident_type VARCHAR NOT NULL,
  severity VARCHAR NOT NULL,
  service VARCHAR NOT NULL,
  root_cause TEXT,
  confidence DECIMAL,
  actions_taken JSONB,
  actions_results JSONB,
  resolved_automatically BOOLEAN DEFAULT false,
  human_escalated BOOLEAN DEFAULT false,
  resolution_time_ms INTEGER,
  raw_incident JSONB
);

-- ===========================================================================
-- Email blocks table (for watchdog runbook)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS email_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  reason TEXT,
  blocked_by VARCHAR DEFAULT 'watchdog',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- Indexes
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_icp_slug ON leads (icp_slug);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_icps_slug ON icps (slug);
CREATE INDEX IF NOT EXISTS idx_icps_status ON icps (status);

CREATE INDEX IF NOT EXISTS idx_email_sequences_lead_id ON email_sequences (lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_sequences (status);

CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sequence_id ON email_logs (sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs (sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_timestamp
  ON watchdog_audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_severity
  ON watchdog_audit_log (severity);
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_service
  ON watchdog_audit_log (service);
CREATE INDEX IF NOT EXISTS idx_watchdog_audit_log_unresolved
  ON watchdog_audit_log (resolved_automatically, timestamp DESC)
  WHERE resolved_automatically = false;

COMMIT;
