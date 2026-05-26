ALTER TABLE crm_flow.activities
ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS crm_flow.activity_digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  digest_day DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, digest_day)
);

CREATE INDEX IF NOT EXISTS activity_digest_logs_day_idx
ON crm_flow.activity_digest_logs (digest_day);
