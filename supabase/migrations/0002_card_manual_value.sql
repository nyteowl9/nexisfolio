-- Manual (non-catalog) card line-items carry their own current value, since
-- they aren't priced from card_catalog. Catalog items derive value live.
alter table card_items add column if not exists manual_value numeric;
