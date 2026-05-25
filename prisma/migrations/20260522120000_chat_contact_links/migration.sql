-- Vínculo Chat CRM (public.contacts) ↔ CRM-Flow (crm_flow.contacts)

ALTER TABLE crm_flow.contacts
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS crm_flow.chat_contact_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(24) NOT NULL,
  crm_contact_id UUID NOT NULL REFERENCES crm_flow.contacts(id) ON DELETE CASCADE,
  chat_contact_id UUID NOT NULL,
  chat_instance_id VARCHAR(24) NOT NULL,
  chat_channel VARCHAR(20) NOT NULL,
  linked_by_user_id VARCHAR(24),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, chat_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_contact_links_tenant_crm
  ON crm_flow.chat_contact_links(tenant_id, crm_contact_id);

COMMENT ON TABLE crm_flow.chat_contact_links IS 'Vínculo entre contato comercial CRM-Flow e cartão do Chat Kanban (public.contacts).';
