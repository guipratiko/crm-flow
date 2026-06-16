-- Tipos de atividade por tenant, views de agenda customizáveis, campos extras em produtos.

CREATE TABLE crm_flow.activity_type_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_activity_type_defs_tenant ON crm_flow.activity_type_defs(tenant_id);

CREATE TABLE crm_flow.agenda_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agenda_views_tenant ON crm_flow.agenda_views(tenant_id);

-- activities.type: enum -> texto (slug)
ALTER TABLE crm_flow.activities
  ALTER COLUMN type TYPE VARCHAR(64) USING type::text;

DROP TYPE IF EXISTS crm_flow."ActivityType";

ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS sku VARCHAR(64);
ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 0;
ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS size VARCHAR(64);
ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 3);
ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(8);
ALTER TABLE crm_flow.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(14, 2);
