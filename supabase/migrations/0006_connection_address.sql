-- Store the full wallet address on a connection so it can be re-synced
-- (the display_name only keeps a truncated label). Public address, read-only.
alter table connections add column if not exists external_id text;
