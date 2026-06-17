-- Liabilities: debt the user OWES (crypto-backed loans, mortgages, margin, etc.)
-- Distinct from the `loans` asset class, which is money owed TO the user.
-- Net worth = assets − sum(liabilities.balance).
create table liabilities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  kind          text not null default 'other',  -- crypto_loan|mortgage|margin|auto|personal|credit|other
  balance       numeric not null default 0,
  rate          numeric,                          -- APR %
  originated    date,
  collateral_position_id uuid references positions(id) on delete set null,
  liq_ltv       numeric,                          -- liquidation LTV % (crypto-backed loans)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index liabilities_user_idx on liabilities(user_id);

alter table liabilities enable row level security;
create policy liabilities_owner on liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
