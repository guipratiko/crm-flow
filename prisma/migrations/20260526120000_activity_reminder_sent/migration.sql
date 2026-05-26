ALTER TABLE crm_flow.activities
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS activities_reminder_pending_idx
ON crm_flow.activities (tenant_id, status, due_date)
WHERE reminder_sent_at IS NULL AND status = 'pending';
