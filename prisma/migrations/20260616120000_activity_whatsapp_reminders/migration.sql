ALTER TABLE crm_flow.activities
ADD COLUMN IF NOT EXISTS reminder_whatsapp_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS overdue_reminder_whatsapp_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS activities_reminder_whatsapp_pending_idx
ON crm_flow.activities (tenant_id, status, due_date)
WHERE reminder_whatsapp_sent_at IS NULL AND due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_flow.activity_digest_whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  digest_day DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, digest_day)
);

CREATE INDEX IF NOT EXISTS activity_digest_whatsapp_logs_day_idx
ON crm_flow.activity_digest_whatsapp_logs (digest_day);
