-- NEXIS FOLIO — initial schema
-- The lot ledger is the engine: positions → lots → disposals.
-- All user-owned tables are protected by Row-Level Security (RLS) keyed on
-- auth.uid(), so a user can only ever read/write their own rows. Shared
-- reference tables (card_catalog, price_cache) are world-readable but only
-- writable by the service role (server-side jobs).

-- ---------- extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- enums ----------
create type asset_class as enum
  ('crypto','stocks','realest','private','cash','loans','metals');

create type accounting_method as enum ('FIFO','LIFO','HIFO');

create type card_type as enum ('graded','raw','sealed');
create type card_grader as enum ('PSA','BGS','CGC');

create type tx_type as enum
  ('buy','sell','deposit','withdrawal','dividend','valuation','loan_payment','transfer');

create type tx_source as enum ('live','manual');

create type connection_status as enum ('connected','error','syncing','disconnected');

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ===================================================================
-- profiles (1:1 with auth.users)
-- ===================================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  accounting_method accounting_method not null default 'FIFO',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- auto-create a profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===================================================================
-- positions
-- ===================================================================
create table positions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  cls           asset_class not null,
  ticker        text,
  name          text not null,
  account       text,
  is_live       boolean not null default false,

  -- unit-priced (crypto/stocks/metals): live qty held; price comes from price_cache
  qty           numeric,

  -- manual assets (realest/private/loans/cash)
  subcat        text,           -- private: Art|Watches|Trading Cards|Jewelry|Other
  grade         text,
  price_source  text,           -- collectibles, e.g. "Collectr · daily"
  apy           numeric,        -- cash/stablecoin
  is_stable     boolean default false,
  manual_value  numeric,
  last_valued_date date,
  cost_basis_manual numeric,
  is_primary_residence boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index positions_user_idx on positions(user_id);
create trigger trg_positions_updated before update on positions
  for each row execute function set_updated_at();

-- ===================================================================
-- lots — the heart of the system
-- ===================================================================
create table lots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  position_id   uuid not null references positions(id) on delete cascade,
  qty           numeric not null,
  price         numeric not null,
  acquired_date date not null,
  account       text,
  basis         numeric generated always as (qty * price) stored,
  created_at    timestamptz not null default now()
);
create index lots_position_idx on lots(position_id);
create index lots_user_idx on lots(user_id);

-- ===================================================================
-- card_catalog — shared reference, synced from a provider
-- ===================================================================
create table card_catalog (
  id         text primary key,            -- provider id
  game       text not null,
  set_id     text,
  set_name   text,
  set_code   text,
  number     text,
  name       text not null,
  rarity     text,
  kind       text not null default 'card', -- 'card' | 'sealed'
  daily      numeric,                       -- today's % move
  image_url  text,
  -- {raw,psa9,psa10,bgs95,cgc10} for cards, or {price} for sealed
  prices     jsonb,
  updated_at timestamptz not null default now()
);
create index card_catalog_game_idx on card_catalog(game);
create index card_catalog_name_idx on card_catalog using gin (to_tsvector('english', name));

-- ===================================================================
-- card_items — itemized collectibles on a Trading Cards position
-- ===================================================================
create table card_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  position_id   uuid not null references positions(id) on delete cascade,
  catalog_id    text references card_catalog(id),  -- null for manual
  is_manual     boolean not null default false,
  type          card_type not null,
  grader        card_grader,
  grade         text,
  qty           numeric not null default 1,
  basis         numeric not null default 0,        -- per unit
  acquired_date date,
  image_url     text,
  -- manual-only descriptive fields
  name          text,
  game          text,
  set_code      text,
  set_name      text,
  number        text,
  created_at    timestamptz not null default now()
);
create index card_items_position_idx on card_items(position_id);
create index card_items_user_idx on card_items(user_id);

-- ===================================================================
-- disposals — realized sales
-- ===================================================================
create table disposals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  position_id   uuid references positions(id) on delete set null,
  ticker        text,
  cls           asset_class not null,
  qty           numeric not null,
  proceeds      numeric not null,
  sold_date     date not null,
  -- lots as they were at sale time → re-derive basis per accounting method
  lot_snapshot  jsonb,
  created_at    timestamptz not null default now()
);
create index disposals_user_idx on disposals(user_id);

-- ===================================================================
-- transactions — the ledger (one row per user action)
-- ===================================================================
create table transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  position_id   uuid references positions(id) on delete set null,
  tx_date       date not null,
  type          tx_type not null,
  cls           asset_class,
  ticker        text,
  name          text,
  qty           numeric,
  price         numeric,
  amount        numeric,
  account       text,
  source        tx_source not null default 'manual',
  note          text,
  created_at    timestamptz not null default now()
);
create index transactions_user_idx on transactions(user_id);
create index transactions_date_idx on transactions(user_id, tx_date desc);

-- ===================================================================
-- loans — terms for loans-receivable positions
-- ===================================================================
create table loans (
  position_id    uuid primary key references positions(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  principal      numeric not null,
  balance        numeric not null,
  rate           numeric not null,        -- annual %
  term_months    integer,
  originated     date,
  next_due       date,
  next_amt       numeric,
  payments_made  integer default 0,
  interest_ytd   numeric default 0
);
create index loans_user_idx on loans(user_id);

-- ===================================================================
-- net_worth_snapshots — persisted daily net worth for the history chart
-- ===================================================================
create table net_worth_snapshots (
  user_id    uuid not null references auth.users(id) on delete cascade,
  snap_date  date not null,
  net_worth  numeric not null,
  liquid     numeric,
  illiquid   numeric,
  loans_out  numeric,
  primary key (user_id, snap_date)
);

-- ===================================================================
-- price_cache — shared market data (server-refreshed)
-- ===================================================================
create table price_cache (
  asset_key   text primary key,   -- e.g. 'crypto:BTC', 'stocks:AAPL', 'metals:XAU'
  price       numeric,
  prev_close  numeric,
  change_7d   numeric,
  updated_at  timestamptz not null default now()
);

-- ===================================================================
-- connections — linked brokerages / wallets (tokens stay server-side)
-- ===================================================================
create table connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,             -- plaid | snaptrade | wallet | manual
  type          text not null,             -- brokerage | bank | wallet
  status        connection_status not null default 'connected',
  asset_class   asset_class,
  display_name  text,
  last_synced   timestamptz,
  value         numeric,
  created_at    timestamptz not null default now()
);
create index connections_user_idx on connections(user_id);

-- ===================================================================
-- Row-Level Security
-- ===================================================================
alter table profiles            enable row level security;
alter table positions           enable row level security;
alter table lots                enable row level security;
alter table card_items          enable row level security;
alter table disposals           enable row level security;
alter table transactions        enable row level security;
alter table loans               enable row level security;
alter table net_worth_snapshots enable row level security;
alter table connections         enable row level security;
alter table card_catalog        enable row level security;
alter table price_cache         enable row level security;

-- Owner-only policies for user tables (one helper-shaped policy per table).
create policy "own profile"  on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'positions','lots','card_items','disposals','transactions',
    'loans','net_worth_snapshots','connections'
  ]
  loop
    execute format(
      'create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_owner', t
    );
  end loop;
end $$;

-- Shared reference tables: any authenticated user may read; writes are
-- service-role only (service role bypasses RLS, so no write policy is needed).
create policy "catalog readable" on card_catalog
  for select using (true);
create policy "prices readable" on price_cache
  for select using (true);
