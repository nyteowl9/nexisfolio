-- Link a ledger transaction to the tax lot it created (buys), so editing one
-- keeps the other in sync.
alter table transactions add column if not exists lot_id uuid references lots(id) on delete set null;
create index if not exists transactions_lot_idx on transactions(lot_id);
