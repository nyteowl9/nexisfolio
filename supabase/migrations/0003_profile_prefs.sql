-- Per-user display preferences (theme, accent, allocation chart, cost-basis
-- method, news tab). Stored as JSON so we can add tweaks without migrations.
alter table profiles add column if not exists prefs jsonb not null default '{}'::jsonb;
