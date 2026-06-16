/**
 * Sample portfolio — ported verbatim from the prototype (`data.js`,
 * `app/cards-data.js`). Used to (a) verify the engine port matches the
 * prototype and (b) seed the "Explore the sample portfolio" onboarding path.
 */
import type {
  CardItem,
  CatalogCard,
  CatalogSealed,
  CatalogGame,
  CatalogSet,
  Catalog,
  Disposal,
  LoanInterest,
  Position,
} from "@/lib/engine";

const lot = (qty: number, price: number, date: string, account: string) => ({
  qty,
  price,
  date,
  account,
  basis: qty * price,
});

export const POSITIONS: Position[] = [
  // crypto
  { id: "btc", cls: "crypto", ticker: "BTC", name: "Bitcoin", live: true, qty: 0.5, price: 68420, prev: 67980, account: "Coinbase", updated: 8, lots: [lot(0.3, 28400, "2021-02-04", "Coinbase"), lot(0.2, 52000, "2024-02-27", "Coinbase")] },
  { id: "eth", cls: "crypto", ticker: "ETH", name: "Ethereum", live: true, qty: 5, price: 3512, prev: 3488, account: "MetaMask", updated: 8, lots: [lot(3, 1240, "2021-01-12", "MetaMask"), lot(2, 2980, "2023-10-02", "MetaMask")] },
  { id: "sol", cls: "crypto", ticker: "SOL", name: "Solana", live: true, qty: 30, price: 154.8, prev: 159.2, account: "Phantom", updated: 8, lots: [lot(30, 38.5, "2023-06-14", "Phantom")] },
  // stocks
  { id: "vti", cls: "stocks", ticker: "VTI", name: "Vanguard Total Mkt ETF", live: true, qty: 670, price: 278.3, prev: 277.6, account: "Fidelity · 401(k)", updated: 14, lots: [lot(670, 198.4, "2022-01-03", "Fidelity")] },
  { id: "aapl", cls: "stocks", ticker: "AAPL", name: "Apple Inc.", live: true, qty: 200, price: 212.4, prev: 210.9, account: "Fidelity · Brokerage", updated: 14, lots: [lot(120, 84.2, "2019-05-20", "Fidelity"), lot(80, 168.5, "2022-09-12", "Fidelity")] },
  { id: "nvda", cls: "stocks", ticker: "NVDA", name: "NVIDIA Corp.", live: true, qty: 300, price: 125.1, prev: 122.4, account: "Fidelity · Brokerage", updated: 14, lots: [lot(300, 19.8, "2020-03-23", "Fidelity")] },
  { id: "msft", cls: "stocks", ticker: "MSFT", name: "Microsoft Corp.", live: true, qty: 80, price: 445.2, prev: 447.1, account: "Fidelity · Brokerage", updated: 14, lots: [lot(50, 210.4, "2021-02-08", "Fidelity"), lot(30, 332.0, "2023-07-19", "Fidelity")] },
  // real estate
  { id: "home", cls: "realest", ticker: "—", name: "Primary Residence · Austin TX", live: false, value: 243000, valued: "2026-03-15", basis: 198000, qty: 1, account: "Owned", lots: [lot(1, 198000, "2019-06-01", "Deed")] },
  { id: "condo", cls: "realest", ticker: "—", name: "Rental Condo · San Antonio", live: false, value: 132000, valued: "2026-02-01", basis: 104000, qty: 1, account: "Owned · rented", lots: [lot(1, 104000, "2021-09-15", "Deed")] },
  // private & collectibles
  { id: "watches", cls: "private", subcat: "Watches", ticker: "—", name: "Watch · Omega Speedmaster", live: false, value: 11000, valued: "2026-03-01", basis: 7500, qty: 1, account: "Insured · home safe", lots: [lot(1, 7500, "2022-06-30", "Dealer")] },
  { id: "cards", cls: "private", subcat: "Trading Cards", ticker: "—", name: "Graded Cards · PSA 10", live: false, value: 6400, valued: "2026-01-12", basis: 2800, qty: 8, account: "Vault · graded", grade: "PSA 10", priceSource: "Collectr · daily", lots: [lot(8, 350, "2021-11-20", "Dealer")] },
  { id: "jewelry", cls: "private", subcat: "Jewelry", ticker: "—", name: "Fine Jewelry · estate pieces", live: false, value: 5200, valued: "2025-12-30", basis: 3900, qty: 3, account: "Insured · home safe", lots: [lot(3, 1300, "2020-12-10", "Estate")] },
  // metals
  { id: "gold", cls: "metals", ticker: "XAU", name: "Gold Bullion", live: true, qty: 4, price: 2358, prev: 2341, account: "Allocated · vault", updated: 30, lots: [lot(4, 1820, "2021-07-01", "Vault")] },
  { id: "silver", cls: "metals", ticker: "XAG", name: "Silver Bullion", live: true, qty: 80, price: 29.4, prev: 29.9, account: "Allocated · vault", updated: 30, lots: [lot(80, 21.5, "2021-05-10", "Vault")] },
  // cash
  { id: "checking", cls: "cash", ticker: "—", name: "Checking · Chase", live: true, value: 6200, prevValue: 6200, updated: 120, account: "Chase", apy: 0.01 },
  { id: "hysa", cls: "cash", ticker: "—", name: "HYSA · Marcus", live: true, value: 18500, prevValue: 18497, updated: 120, account: "Marcus", apy: 4.3 },
  { id: "usdc", cls: "cash", ticker: "USDC", name: "USDC · Aave", live: true, value: 7800, prevValue: 7799, updated: 30, account: "Aave v3", apy: 5.4, stable: true },
  // loans
  { id: "loan-friend", cls: "loans", ticker: "—", name: "Personal Loan · Friend", live: false, value: 11200, valued: "2026-06-01", basis: 15000, account: "Note", loan: { principal: 15000, balance: 11200, rate: 6.0, termMonths: 60, originated: "2024-09-01", nextDue: "2026-07-05", nextAmt: 289.99, paymentsMade: 21, interestYtd: 560 } },
];

export const DISPOSALS: Disposal[] = [
  { id: "d1", cls: "crypto", asset: "BTC", qty: 0.1, proceeds: 6842, date: "2026-02-12", lots: { FIFO: 2840, LIFO: 5200, HIFO: 5200 }, acq: { FIFO: "2021-02-04", LIFO: "2024-02-27", HIFO: "2024-02-27" } },
  { id: "d2", cls: "crypto", asset: "ETH", qty: 1, proceeds: 3512, date: "2026-04-03", lots: { FIFO: 1240, LIFO: 2980, HIFO: 2980 }, acq: { FIFO: "2021-01-12", LIFO: "2023-10-02", HIFO: "2023-10-02" } },
  { id: "d3", cls: "stocks", asset: "NVDA", qty: 50, proceeds: 6255, date: "2026-01-22", lots: { FIFO: 990, LIFO: 990, HIFO: 990 }, acq: { FIFO: "2020-03-23", LIFO: "2020-03-23", HIFO: "2020-03-23" } },
  { id: "d4", cls: "stocks", asset: "AAPL", qty: 30, proceeds: 6372, date: "2026-05-08", lots: { FIFO: 2526, LIFO: 5055, HIFO: 5055 }, acq: { FIFO: "2019-05-20", LIFO: "2022-09-12", HIFO: "2022-09-12" } },
  { id: "d5", cls: "crypto", asset: "SOL", qty: 20, proceeds: 3096, date: "2026-05-29", lots: { FIFO: 770, LIFO: 770, HIFO: 770 }, acq: { FIFO: "2023-06-14", LIFO: "2023-06-14", HIFO: "2023-06-14" } },
];

export const LOAN_INTEREST: LoanInterest[] = POSITIONS.filter((p) => p.cls === "loans" && p.loan).map((p) => ({
  name: p.name,
  amt: p.loan!.interestYtd,
}));

// ---- card catalog ----
const px = (raw: number, psa10: number, opts: Partial<{ psa9: number; bgs95: number; cgc10: number }> = {}) => ({
  raw,
  psa9: opts.psa9 != null ? opts.psa9 : Math.round(raw * 1.25),
  psa10,
  bgs95: opts.bgs95 != null ? opts.bgs95 : Math.round(psa10 * 0.82),
  cgc10: opts.cgc10 != null ? opts.cgc10 : Math.round(psa10 * 0.9),
});

export const CARDS: CatalogCard[] = [
  { id: "op13-119", game: "op", set: "op-13", num: "OP13-119", name: "Monkey D. Luffy", rarity: "Manga Rare", daily: 2.4, prices: px(180, 690, { psa9: 255, bgs95: 560, cgc10: 615 }) },
  { id: "op13-118", game: "op", set: "op-13", num: "OP13-118", name: "Shanks", rarity: "Manga Rare", daily: 1.1, prices: px(120, 430) },
  { id: "op13-104", game: "op", set: "op-13", num: "OP13-104", name: "Roronoa Zoro", rarity: "Super Rare", daily: -0.8, prices: px(42, 150) },
  { id: "op13-051", game: "op", set: "op-13", num: "OP13-051", name: "Boa Hancock", rarity: "Secret Rare", daily: 3.2, prices: px(95, 360) },
  { id: "op09-118", game: "op", set: "op-09", num: "OP09-118", name: "Portgas D. Ace", rarity: "Manga Rare", daily: 0.6, prices: px(160, 540) },
  { id: "op09-093", game: "op", set: "op-09", num: "OP09-093", name: "Yamato", rarity: "Super Rare", daily: -1.4, prices: px(30, 110) },
  { id: "op05-119", game: "op", set: "op-05", num: "OP05-119", name: "Monkey D. Luffy", rarity: "Leader Parallel", daily: 1.9, prices: px(125, 470, { psa9: 175, bgs95: 390, cgc10: 420 }) },
  { id: "op05-098", game: "op", set: "op-05", num: "OP05-098", name: "Kozuki Oden", rarity: "Super Rare", daily: 0.2, prices: px(28, 95) },
  { id: "op01-120", game: "op", set: "op-01", num: "OP01-120", name: "Roronoa Zoro", rarity: "Manga Rare", daily: 1.3, prices: px(230, 940, { psa9: 330, bgs95: 760, cgc10: 840 }) },
  { id: "op01-024", game: "op", set: "op-01", num: "OP01-024", name: "Trafalgar Law", rarity: "Super Rare", daily: -0.5, prices: px(34, 120) },
  { id: "eb01-061", game: "op", set: "eb-01", num: "EB01-061", name: "Nico Robin", rarity: "Secret Rare", daily: 2.0, prices: px(70, 260) },
  { id: "sv151-199", game: "pkm", set: "sv-151", num: "199/165", name: "Charizard ex", rarity: "Special Illustration", daily: 1.7, prices: px(280, 720, { psa9: 360, bgs95: 600, cgc10: 650 }) },
  { id: "sv151-185", game: "pkm", set: "sv-151", num: "185/165", name: "Venusaur ex", rarity: "Special Illustration", daily: 0.4, prices: px(90, 240) },
  { id: "sv151-201", game: "pkm", set: "sv-151", num: "201/165", name: "Mew ex", rarity: "Special Illustration", daily: 0.9, prices: px(120, 320) },
  { id: "pre-180", game: "pkm", set: "sv-prismatic", num: "180/131", name: "Umbreon ex", rarity: "Special Illustration", daily: 4.1, prices: px(420, 980, { psa9: 560, bgs95: 820, cgc10: 890 }) },
  { id: "pre-167", game: "pkm", set: "sv-prismatic", num: "167/131", name: "Sylveon ex", rarity: "Special Illustration", daily: 1.2, prices: px(110, 300) },
  { id: "ssp-238", game: "pkm", set: "sv-surging", num: "238/191", name: "Pikachu ex", rarity: "Special Illustration", daily: 2.6, prices: px(150, 410) },
  { id: "base-4", game: "pkm", set: "base-1999", num: "4/102", name: "Charizard", rarity: "Holo Rare", daily: 0.3, img: "https://images.pokemontcg.io/base1/4.png", prices: px(900, 14000, { psa9: 3400, bgs95: 9000, cgc10: 9500 }) },
  { id: "base-2", game: "pkm", set: "base-1999", num: "2/102", name: "Blastoise", rarity: "Holo Rare", daily: -0.2, img: "https://images.pokemontcg.io/base1/2.png", prices: px(220, 1600, { psa9: 520 }) },
  { id: "base-15", game: "pkm", set: "base-1999", num: "15/102", name: "Venusaur", rarity: "Holo Rare", daily: 0.5, img: "https://images.pokemontcg.io/base1/15.png", prices: px(260, 2600, { psa9: 700 }) },
  { id: "base-10", game: "pkm", set: "base-1999", num: "10/102", name: "Mewtwo", rarity: "Holo Rare", daily: 0.1, img: "https://images.pokemontcg.io/base1/10.png", prices: px(120, 1400, { psa9: 360 }) },
  { id: "base-16", game: "pkm", set: "base-1999", num: "16/102", name: "Zapdos", rarity: "Holo Rare", daily: -0.3, img: "https://images.pokemontcg.io/base1/16.png", prices: px(90, 900, { psa9: 240 }) },
  { id: "base-58", game: "pkm", set: "base-1999", num: "58/102", name: "Pikachu", rarity: "Common", daily: 1.4, img: "https://images.pokemontcg.io/base1/58.png", prices: px(22, 220, { psa9: 70 }) },
  { id: "lor-rise-223", game: "lor", set: "lor-rise", num: "223/204", name: "Elsa — Spirit of Winter", rarity: "Enchanted", daily: 0.8, prices: px(140, 380) },
  { id: "mh3-238", game: "mtg", set: "mtg-mh3", num: "238", name: "Ugin, Eye of the Storms", rarity: "Mythic (Serialized)", daily: 1.5, prices: px(75, 210) },
  { id: "topps-elly", game: "sports", set: "topps-chrome", num: "150", name: "Elly De La Cruz — RC", rarity: "Rookie", daily: 2.2, prices: px(60, 260) },
];

export const SEALED: CatalogSealed[] = [
  { id: "s-op13-bb", game: "op", set: "op-13", name: "OP-13 Booster Box", kind: "Booster Box", daily: 0.9, price: 142 },
  { id: "s-op13-cs", game: "op", set: "op-13", name: "OP-13 Booster Case (12 boxes)", kind: "Sealed Case", daily: 1.1, price: 1620 },
  { id: "s-op05-bb", game: "op", set: "op-05", name: "OP-05 Booster Box", kind: "Booster Box", daily: 1.8, price: 280 },
  { id: "s-op01-bb", game: "op", set: "op-01", name: "OP-01 Booster Box (1st print)", kind: "Booster Box", daily: 2.4, price: 1450 },
  { id: "s-151-bb", game: "pkm", set: "sv-151", name: "151 Booster Box", kind: "Booster Box", daily: 1.0, price: 165 },
  { id: "s-pre-etb", game: "pkm", set: "sv-prismatic", name: "Prismatic Evolutions ETB", kind: "Elite Trainer Box", daily: 3.0, price: 95 },
  { id: "s-base-bb", game: "pkm", set: "base-1999", name: "Base Set Booster Box (1999)", kind: "Vintage Sealed", daily: 0.1, price: 42000 },
  { id: "s-mh3-cb", game: "mtg", set: "mtg-mh3", name: "Modern Horizons 3 Collector Box", kind: "Collector Box", daily: 0.5, price: 310 },
];

export const GAMES: Record<string, CatalogGame> = {
  op: { key: "op", label: "One Piece", color: "#C0303A", tint: "#F6E2E3" },
  pkm: { key: "pkm", label: "Pokémon", color: "#2E6FE0", tint: "#E4ECFB" },
  lor: { key: "lor", label: "Lorcana", color: "#1E9E8F", tint: "#DCF1EE" },
  mtg: { key: "mtg", label: "Magic", color: "#B5703C", tint: "#F2E6D9" },
  sports: { key: "sports", label: "Sports", color: "#0E9D6E", tint: "#DCF1E8" },
};

export const SETS: Record<string, CatalogSet> = {
  "op-13": { id: "op-13", game: "op", code: "OP-13", name: "Booster Set 13", year: 2025 },
  "op-09": { id: "op-09", game: "op", code: "OP-09", name: "Emperors in the New World", year: 2024 },
  "op-05": { id: "op-05", game: "op", code: "OP-05", name: "Awakening of the New Era", year: 2023 },
  "op-01": { id: "op-01", game: "op", code: "OP-01", name: "Romance Dawn", year: 2022 },
  "eb-01": { id: "eb-01", game: "op", code: "EB-01", name: "Memorial Collection", year: 2024 },
  "sv-151": { id: "sv-151", game: "pkm", code: "151", name: "Scarlet & Violet — 151", year: 2023 },
  "sv-prismatic": { id: "sv-prismatic", game: "pkm", code: "PRE", name: "Prismatic Evolutions", year: 2025 },
  "sv-surging": { id: "sv-surging", game: "pkm", code: "SSP", name: "Surging Sparks", year: 2024 },
  "base-1999": { id: "base-1999", game: "pkm", code: "BASE", name: "Base Set (Unlimited)", year: 1999 },
  "lor-rise": { id: "lor-rise", game: "lor", code: "RISE", name: "Rise of the Floodborn", year: 2023 },
  "mtg-mh3": { id: "mtg-mh3", game: "mtg", code: "MH3", name: "Modern Horizons 3", year: 2024 },
  "topps-chrome": { id: "topps-chrome", game: "sports", code: "TOPPS", name: "Chrome Baseball", year: 2023 },
};

export const CATALOG: Catalog = {
  cardById: Object.fromEntries(CARDS.map((c) => [c.id, c])),
  sealedById: Object.fromEntries(SEALED.map((s) => [s.id, s])),
  sets: SETS,
  games: GAMES,
};

export interface SampleTx {
  date: string;
  type: "buy" | "sell" | "deposit" | "withdrawal" | "dividend" | "valuation" | "loan_payment" | "transfer";
  cls: string;
  ticker: string | null;
  name: string;
  qty: number | null;
  price: number | null;
  amount: number | null;
  account: string;
  source: "live" | "manual";
  note: string;
}

export const TRANSACTIONS: SampleTx[] = [
  { date: "2026-06-12", type: "buy", cls: "crypto", ticker: "BTC", name: "Bitcoin", qty: 0.05, price: 67800, amount: null, account: "Coinbase", source: "live", note: "DCA buy" },
  { date: "2026-06-08", type: "dividend", cls: "stocks", ticker: "VTI", name: "Vanguard Total Mkt ETF", qty: null, price: null, amount: 412, account: "Fidelity", source: "live", note: "Quarterly dividend" },
  { date: "2026-05-29", type: "sell", cls: "crypto", ticker: "SOL", name: "Solana", qty: 20, price: 154.8, amount: null, account: "Phantom", source: "live", note: "Trim position" },
  { date: "2026-05-15", type: "valuation", cls: "realest", ticker: null, name: "Primary Residence · Austin TX", qty: null, price: null, amount: 243000, account: "Zillow estimate", source: "manual", note: "Updated estimate" },
  { date: "2026-05-08", type: "sell", cls: "stocks", ticker: "AAPL", name: "Apple Inc.", qty: 30, price: 212.4, amount: null, account: "Fidelity · Brokerage", source: "live", note: "Rebalance" },
  { date: "2026-05-01", type: "loan_payment", cls: "loans", ticker: null, name: "Personal Loan · Friend", qty: null, price: null, amount: 289.99, account: "Note", source: "manual", note: "Payment received" },
  { date: "2026-04-22", type: "deposit", cls: "cash", ticker: null, name: "HYSA · Marcus", qty: null, price: null, amount: 1500, account: "Marcus", source: "live", note: "Paycheck sweep" },
  { date: "2026-04-03", type: "sell", cls: "crypto", ticker: "ETH", name: "Ethereum", qty: 1, price: 3512, amount: null, account: "MetaMask", source: "live", note: "Took profit" },
  { date: "2026-03-15", type: "valuation", cls: "private", ticker: null, name: "Graded Cards · PSA 10", qty: null, price: null, amount: 6400, account: "Collectr", source: "manual", note: "Daily revaluation" },
  { date: "2026-03-01", type: "buy", cls: "metals", ticker: "XAU", name: "Gold Bullion", qty: 1, price: 2280, amount: null, account: "Vault", source: "manual", note: "Added 1 oz" },
  { date: "2026-02-12", type: "sell", cls: "crypto", ticker: "BTC", name: "Bitcoin", qty: 0.1, price: 68420, amount: null, account: "Coinbase", source: "live", note: "Rebalance to cash" },
  { date: "2026-01-22", type: "sell", cls: "stocks", ticker: "NVDA", name: "NVIDIA Corp.", qty: 50, price: 125.1, amount: null, account: "Fidelity · Brokerage", source: "live", note: "Trim winner" },
];

export const CARD_ITEMS: CardItem[] = [
  { id: "i1", catId: "base-4", type: "graded", grader: "PSA", grade: "9", qty: 1, basis: 1800, acquired: "2021-11-20" },
  { id: "i2", catId: "op01-120", type: "graded", grader: "PSA", grade: "10", qty: 1, basis: 240, acquired: "2023-02-10" },
  { id: "i3", catId: "op13-119", type: "graded", grader: "PSA", grade: "10", qty: 1, basis: 300, acquired: "2025-01-15" },
  { id: "i4", catId: "sv151-199", type: "graded", grader: "PSA", grade: "10", qty: 1, basis: 300, acquired: "2024-03-30" },
  { id: "i5", catId: "op05-119", type: "raw", grader: null, grade: null, qty: 1, basis: 60, acquired: "2023-09-01" },
  { id: "i6", catId: "op13-118", type: "graded", grader: "BGS", grade: "9.5", qty: 1, basis: 180, acquired: "2025-02-04" },
  { id: "s1", catId: "s-op05-bb", type: "sealed", grader: null, grade: null, qty: 1, basis: 120, acquired: "2022-12-01" },
  { id: "s2", catId: "s-op13-bb", type: "sealed", grader: null, grade: null, qty: 2, basis: 115, acquired: "2025-02-20" },
];
