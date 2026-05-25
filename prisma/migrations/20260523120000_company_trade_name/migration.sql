-- Nome fantasia + CNPJ único por tenant (quando informado)
ALTER TABLE crm_flow.client_companies ADD COLUMN IF NOT EXISTS trade_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS client_companies_tenant_document_unique
  ON crm_flow.client_companies(tenant_id, document)
  WHERE document IS NOT NULL AND document <> '';
