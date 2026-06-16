-- Slugs numéricos (1, 2, 3...) por tenant, alinhado ao short_id das colunas do Chat.

CREATE TEMP TABLE _activity_slug_map ON COMMIT DROP AS
SELECT
  d.id,
  d.tenant_id,
  d.slug AS old_slug,
  ROW_NUMBER() OVER (PARTITION BY d.tenant_id ORDER BY d.sort_order ASC, d.created_at ASC)::text AS new_slug
FROM crm_flow.activity_type_defs d;

UPDATE crm_flow.activities a
SET type = m.new_slug
FROM _activity_slug_map m
WHERE a.tenant_id = m.tenant_id
  AND a.type = m.old_slug
  AND m.old_slug IS DISTINCT FROM m.new_slug;

UPDATE crm_flow.agenda_views av
SET filter_config = jsonb_set(
  filter_config,
  '{activityTypeSlugs}',
  (
    SELECT COALESCE(jsonb_agg(to_jsonb(COALESCE(m.new_slug, elem.value))), '[]'::jsonb)
    FROM jsonb_array_elements_text(filter_config->'activityTypeSlugs') AS elem(value)
    LEFT JOIN _activity_slug_map m
      ON m.tenant_id = av.tenant_id AND m.old_slug = elem.value
  )
)
WHERE filter_config ? 'activityTypeSlugs'
  AND jsonb_typeof(filter_config->'activityTypeSlugs') = 'array'
  AND jsonb_array_length(filter_config->'activityTypeSlugs') > 0;

UPDATE crm_flow.activity_type_defs d
SET slug = 'tmp_' || d.id::text;

UPDATE crm_flow.activity_type_defs d
SET slug = m.new_slug
FROM _activity_slug_map m
WHERE d.id = m.id;
