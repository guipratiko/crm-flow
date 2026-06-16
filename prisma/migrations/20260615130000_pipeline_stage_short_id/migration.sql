-- short_id estável por etapa do funil (como colunas do Chat Kanban).

ALTER TABLE crm_flow.pipeline_stages ADD COLUMN IF NOT EXISTS short_id INT;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, pipeline_id ORDER BY "order" ASC, created_at ASC) AS rn
  FROM crm_flow.pipeline_stages
)
UPDATE crm_flow.pipeline_stages ps
SET short_id = ranked.rn
FROM ranked
WHERE ps.id = ranked.id AND ps.short_id IS NULL;

ALTER TABLE crm_flow.pipeline_stages ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_tenant_pipeline_short_id_key
  ON crm_flow.pipeline_stages (tenant_id, pipeline_id, short_id);
