-- logo_url + mensagens selecionadas na timeline do negócio (IDs TEXT, igual deals/contacts)

ALTER TABLE crm_flow.client_companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS crm_flow.deal_timeline_messages (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  chat_contact_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT deal_timeline_messages_pkey PRIMARY KEY (id),
  CONSTRAINT deal_timeline_messages_deal_message_unique UNIQUE (deal_id, message_id),
  CONSTRAINT deal_timeline_messages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_flow.deals(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS deal_timeline_messages_tenant_deal_idx
  ON crm_flow.deal_timeline_messages(tenant_id, deal_id);
