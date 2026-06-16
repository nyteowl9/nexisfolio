/**
 * NEXIS FOLIO — core domain types.
 * Ported from the design-handoff prototype (`data.js` / `app/cards-data.js`).
 * These mirror the production DB schema in supabase/migrations.
 */

export type AssetClass =
  | "crypto"
  | "stocks"
  | "realest"
  | "private"
  | "cash"
  | "loans"
  | "metals";

export type AccountingMethod = "FIFO" | "LIFO" | "HIFO";

/** A single buy: the atomic unit of the cost-basis ledger. */
export interface Lot {
  qty: number;
  price: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  account?: string;
  /** = qty * price */
  basis: number;
}

export interface LoanTerms {
  principal: number;
  balance: number;
  /** annual % */
  rate: number;
  termMonths: number;
  originated: string;
  nextDue: string;
  nextAmt: number;
  paymentsMade: number;
  interestYtd: number;
}

/**
 * A holding. Live (unit-priced) classes use qty*price; manual classes use value.
 * Trading Cards (private/subcat) derive value/qty/basis from `items` via the
 * card engine's recompute().
 */
export interface Position {
  id: string;
  cls: AssetClass;
  ticker: string;
  name: string;
  live: boolean;

  // unit-priced (crypto / stocks / metals)
  qty?: number;
  price?: number;
  prev?: number;
  updated?: number;

  // manual (realest / private / loans)
  value?: number;
  valued?: string;
  basis?: number;

  // cash
  prevValue?: number;
  apy?: number;
  stable?: boolean;

  account?: string;

  // private & collectibles
  subcat?: string;
  grade?: string;
  priceSource?: string;

  lots?: Lot[];
  loan?: LoanTerms;
  items?: CardItem[];
}

/** Realized sale. Carries either per-method basis maps (seeded) or a lot snapshot (live). */
export interface Disposal {
  id: string;
  cls: AssetClass;
  /** ticker */
  asset: string;
  qty: number;
  proceeds: number;
  date: string;
  /** precomputed basis per accounting method */
  lots?: Record<AccountingMethod, number>;
  /** precomputed acquired date per accounting method */
  acq?: Record<AccountingMethod, string>;
  /** lot snapshot at sale time — matched live per method */
  lotsSnapshot?: Lot[];
  live?: boolean;
}

// ---- Trading cards ----

export interface CardPrices {
  raw: number;
  psa9: number;
  psa10: number;
  bgs95: number;
  cgc10: number;
}

export interface CatalogCard {
  id: string;
  game: string;
  set: string;
  num: string;
  name: string;
  rarity: string;
  daily: number;
  img?: string;
  prices: CardPrices;
}

export interface CatalogSealed {
  id: string;
  game: string;
  set: string;
  name: string;
  kind: string;
  daily: number;
  price: number;
  img?: string;
}

export type Grader = "PSA" | "BGS" | "CGC";

export interface CardItem {
  id: string;
  catId?: string;
  type: "graded" | "raw" | "sealed";
  grader?: Grader | null;
  grade?: string | null;
  qty: number;
  /** cost basis per unit */
  basis: number;
  acquired: string;
  // manual entries
  manual?: boolean;
  value?: number;
  name?: string;
  game?: string;
  setCode?: string;
  setName?: string;
  num?: string;
  img?: string;
  kind?: string;
}

/** Catalog lookup the card engine reads from (DB-backed in production). */
export interface Catalog {
  cardById: Record<string, CatalogCard>;
  sealedById: Record<string, CatalogSealed>;
}
