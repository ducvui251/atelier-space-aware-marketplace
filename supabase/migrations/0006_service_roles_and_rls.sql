-- Per-service least-privilege database roles and row-level security
-- (MICROSERVICE_100_PLAN.md Phase 2: "Add schema-specific database roles
-- and query-level tests that reject unauthorized schema access" and
-- "Add RLS policies and ownership tests").
--
-- Each service already only issues SQL against its own schema (verified by
-- audit — no cross-schema queries remain). This migration makes that a
-- database-enforced guarantee instead of only an application-code
-- guarantee: each service connects with its own role, which is granted
-- USAGE + DML on its own schema only, and RLS is forced on every
-- owner-scoped table so only that role's connection can touch its rows.
--
-- Dev-only passwords, matching the existing `atelier_local_dev` convention
-- for the shared migration role. Production must inject these via a secret
-- manager and rotate them; see PROJECT_PROMPT.md environment variable
-- policy before reusing this pattern outside local development.

do $$
declare
  service record;
begin
  for service in
    select * from (values
      ('account_service', 'account'),
      ('catalog_discovery_service', 'catalog_discovery'),
      ('artist_artwork_service', 'artist_artwork'),
      ('commerce_service', 'commerce'),
      ('recommendation_service', 'recommendation'),
      ('verification_service', 'verification'),
      ('room_preview_service', 'room_preview'),
      ('admin_service', 'admin')
    ) as t(role_name, schema_name)
  loop
    if not exists (select from pg_roles where rolname = service.role_name) then
      execute format('create role %I login password %L', service.role_name, service.role_name || '_dev_pw');
    end if;
    execute format('grant connect on database atelier to %I', service.role_name);
    execute format('grant usage on schema %I to %I', service.schema_name, service.role_name);
    execute format('grant select, insert, update, delete on all tables in schema %I to %I', service.schema_name, service.role_name);
    execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to %I', service.schema_name, service.role_name);
  end loop;
end $$;

-- Force RLS on every owner-scoped table so only the owning service's role
-- can read or write its rows — including bypassing the table owner, which
-- would otherwise skip RLS by default. Each policy is a schema-boundary
-- check (`TO <role>`), not a per-buyer check: per-buyer/per-artist
-- ownership is still enforced in each repository's WHERE clause, same as
-- today. Making that a session-scoped RLS predicate too would require
-- propagating the caller's id through packages/persistence as a `SET
-- LOCAL` per request — a larger follow-up, not part of this pass.

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('account', 'users', 'account_service'),
      ('artist_artwork', 'artist_profiles', 'artist_artwork_service'),
      ('artist_artwork', 'artworks', 'artist_artwork_service'),
      ('artist_artwork', 'artwork_images', 'artist_artwork_service'),
      ('artist_artwork', 'tags', 'artist_artwork_service'),
      ('artist_artwork', 'artwork_tags', 'artist_artwork_service'),
      ('commerce', 'orders', 'commerce_service'),
      ('commerce', 'payments', 'commerce_service'),
      ('commerce', 'shipments', 'commerce_service'),
      ('commerce', 'cart_items', 'commerce_service'),
      ('commerce', 'reviews', 'commerce_service'),
      ('recommendation', 'follows', 'recommendation_service'),
      ('recommendation', 'saved_artworks', 'recommendation_service'),
      ('room_preview', 'rooms', 'room_preview_service'),
      ('room_preview', 'placements', 'room_preview_service'),
      ('verification', 'artwork_verifications', 'verification_service'),
      ('verification', 'artist_verifications', 'verification_service'),
      ('admin', 'complaints', 'admin_service'),
      ('catalog_discovery', 'artwork_read_models', 'catalog_discovery_service')
    ) as x(schema_name, table_name, role_name)
  loop
    execute format('alter table %I.%I enable row level security', t.schema_name, t.table_name);
    execute format('alter table %I.%I force row level security', t.schema_name, t.table_name);
    execute format(
      'drop policy if exists %I on %I.%I',
      t.table_name || '_owning_service_only', t.schema_name, t.table_name
    );
    execute format(
      'create policy %I on %I.%I for all to %I using (true) with check (true)',
      t.table_name || '_owning_service_only', t.schema_name, t.table_name, t.role_name
    );
  end loop;
end $$;
