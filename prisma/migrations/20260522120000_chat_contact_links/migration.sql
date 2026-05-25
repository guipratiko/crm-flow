-- Vínculo Chat CRM (public.contacts) ↔ CRM-Flow (crm_flow.contacts)
-- IDs em TEXT (mesmo tipo de crm_flow.contacts.id / deals.id no init)

ALTER TABLE crm_flow.contacts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS crm_flow.chat_contact_links (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  crm_contact_id TEXT NOT NULL REFERENCES crm_flow.contacts(id) ON DELETE CASCADE,
  chat_contact_id TEXT NOT NULL,
  chat_instance_id TEXT NOT NULL,
  chat_channel VARCHAR(20) NOT NULL,
  linked_by_user_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chat_contact_links_pkey PRIMARY KEY (id),
  CONSTRAINT chat_contact_links_tenant_chat_contact_unique UNIQUE (tenant_id, chat_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_contact_links_tenant_crm
  ON crm_flow.chat_contact_links(tenant_id, crm_contact_id);

COMMENT ON TABLE crm_flow.chat_contact_links IS 'Vínculo entre contato comercial CRM-Flow e cartão do Chat Kanban (public.contacts).';
