-- Schema isolado: não conflita com `contacts` do Chat (public) no mesmo Postgres
CREATE SCHEMA IF NOT EXISTS crm_flow;

CREATE TYPE crm_flow."DealStatus" AS ENUM ('open', 'won', 'lost');
CREATE TYPE crm_flow."ActivityType" AS ENUM ('call', 'meeting', 'task', 'email', 'whatsapp', 'followup', 'note');
CREATE TYPE crm_flow."ActivityStatus" AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE crm_flow."TimelineEntityType" AS ENUM ('contact', 'company', 'deal');
CREATE TYPE crm_flow."ProductStatus" AS ENUM ('active', 'inactive');

CREATE TABLE crm_flow.tenant_profiles (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    document TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT tenant_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.contacts (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    position TEXT,
    company_id TEXT,
    responsible_user_id TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.client_companies (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    document TEXT,
    segment TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    responsible_user_id TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT client_companies_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.pipelines (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT pipelines_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.pipeline_stages (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    pipeline_id TEXT NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    probability INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.deals (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    value DECIMAL(14,2) NOT NULL DEFAULT 0,
    status crm_flow."DealStatus" NOT NULL DEFAULT 'open',
    probability INTEGER NOT NULL DEFAULT 0,
    expected_close_date TIMESTAMP(3),
    pipeline_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    company_id TEXT,
    main_contact_id TEXT,
    responsible_user_id TEXT,
    loss_reason TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT deals_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.deal_contacts (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    deal_id TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deal_contacts_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.products (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price DECIMAL(14,2) NOT NULL DEFAULT 0,
    status crm_flow."ProductStatus" NOT NULL DEFAULT 'active',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.deal_products (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    deal_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    discount DECIMAL(14,2) NOT NULL DEFAULT 0,
    total DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deal_products_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.activities (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    type crm_flow."ActivityType" NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP(3),
    status crm_flow."ActivityStatus" NOT NULL DEFAULT 'pending',
    contact_id TEXT,
    company_id TEXT,
    deal_id TEXT,
    responsible_user_id TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT activities_pkey PRIMARY KEY (id)
);

CREATE TABLE crm_flow.timeline_events (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    entity_type crm_flow."TimelineEntityType" NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    user_id TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT timeline_events_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX deal_contacts_deal_id_contact_id_key ON crm_flow.deal_contacts(deal_id, contact_id);
CREATE INDEX contacts_tenant_id_idx ON crm_flow.contacts(tenant_id);
CREATE INDEX client_companies_tenant_id_idx ON crm_flow.client_companies(tenant_id);
CREATE INDEX deals_tenant_id_idx ON crm_flow.deals(tenant_id);
CREATE INDEX timeline_events_tenant_id_entity_type_entity_id_idx ON crm_flow.timeline_events(tenant_id, entity_type, entity_id);

ALTER TABLE crm_flow.contacts ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES crm_flow.client_companies(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE crm_flow.pipeline_stages ADD CONSTRAINT pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES crm_flow.pipelines(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE crm_flow.deals ADD CONSTRAINT deals_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES crm_flow.pipelines(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE crm_flow.deals ADD CONSTRAINT deals_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES crm_flow.pipeline_stages(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE crm_flow.deals ADD CONSTRAINT deals_company_id_fkey FOREIGN KEY (company_id) REFERENCES crm_flow.client_companies(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE crm_flow.deals ADD CONSTRAINT deals_main_contact_id_fkey FOREIGN KEY (main_contact_id) REFERENCES crm_flow.contacts(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE crm_flow.deal_contacts ADD CONSTRAINT deal_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES crm_flow.contacts(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE crm_flow.deal_contacts ADD CONSTRAINT deal_contacts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_flow.deals(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE crm_flow.deal_products ADD CONSTRAINT deal_products_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_flow.deals(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE crm_flow.deal_products ADD CONSTRAINT deal_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES crm_flow.products(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE crm_flow.activities ADD CONSTRAINT activities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES crm_flow.contacts(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE crm_flow.activities ADD CONSTRAINT activities_company_id_fkey FOREIGN KEY (company_id) REFERENCES crm_flow.client_companies(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE crm_flow.activities ADD CONSTRAINT activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_flow.deals(id) ON DELETE SET NULL ON UPDATE CASCADE;
