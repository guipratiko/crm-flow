ALTER TABLE crm_flow.client_companies ADD COLUMN IF NOT EXISTS partners TEXT[] DEFAULT '{}';
