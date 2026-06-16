# Handoff: NEXIS FOLIO — Multi-Asset Net-Worth, Collectibles & Retirement Tracker

## Overview
NEXIS FOLIO (codename `$ALL`) is a one-stop personal finance tracker that consolidates **every asset class a person owns** into a single live net-worth figure, with full transaction history, lot-level cost-basis tracking, tax-ready exports, a Coast-FIRE retirement planner, and a Collectr-style **trading-card / sealed-product collection** module priced by grade.

It tracks seven asset classes:
| Class | Color | Pricing |
|---|---|---|
| Crypto | `#E0992B` amber | live (qty × price) |
| Stocks & Equities | `#3E72F0` blue | live (qty × price) |
| Real Estate | `#14A6A0` teal | manual ("last valued") |
| Private & Collectibles | `#9466F0` purple | manual; **Trading Cards** sub-category is itemized + grade-priced (see §Collectibles) |
| Cash & Stablecoins | `#93999F` gray | live (incl. APY/yield; USDC tracked here) |
| Loans Receivable | `#E5689A` pink | manual (amortization) |
| Commodities & Metals | `#B5703C` copper | live (spot × qty) |

**Core principle — the lot ledger is the engine:** every position is made of one or more **lots** (a buy at a price on a date). Sells match lots per the chosen accounting method (FIFO / LIFO / HIFO). This single mechanic powers accurate P/L **and** the tax exports. It must be the backbone of the production schema.

> ⚠️ **Everything priced in this prototype is MOCK / hand-authored sample data.** No live feed is connected. The "Update prices" button only animates. See **§Production Integration — What Needs Wiring** for the full checklist; that section is the most important part of this handoff.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — high-fidelity prototypes showing intended look and behavior. They are **not production code to copy directly.** The task is to **recreate these designs in a real codebase** using production patterns (see §Recommended Architecture). State, data, and "APIs" in the prototype are mocked in `data.js` / `app/cards-data.js` + a `localStorage`-backed store; replace those with a real backend and live data services.

## Fidelity
**High-fidelity (hifi).** Final colors, typography (Inter, tabular-nums on all figures), spacing, light/dark theming, and interactions are all intentional. Recreate the UI faithfully, then swap mocked data/logic for real services. Exact tokens are in `tokens.css` and summarized below.

---

## Production Integration — What Needs Wiring
**This is the punch list to take the prototype to production. Nothing below is real yet.**

### 1. Pricing & market data (all mock)
| What | Prototype source | Production |
|---|---|---|
| Crypto prices | hard-coded in `data.js → POSITIONS` / `WATCHLIST` | Real crypto market API (e.g. CoinGecko/CMC) via **server-side** key; cache + manual "Update prices" refresh (keep that pattern, don't poll aggressively). |
| Stock/ETF prices | hard-coded | Equities market-data API (server-side). |
| Metals spot | hard-coded | Spot price feed. |
| "Update prices" button | `app/overview.jsx → updatePrices()` just spins 750ms | Trigger a real cache refresh; show real "updated Ns ago". |
| Net-worth history chart | synthetic series in `data.js` | Persisted daily net-worth snapshots. |

### 2. Trading-card / collectibles pricing & catalog (all mock)
- **Catalog** (`app/cards-data.js → CARDS`, `SEALED`, `SETS`, `GAMES`) is a hand-curated *sample* — a few sets per game. Production must sync a real card-data provider's **full catalog** (every set / card / sealed product), Collectr/TCGplayer-style.
- **Grade pricing** (`priceForGrade()` + each card's `prices: {raw, psa9, psa10, bgs95, cgc10}`) is invented. Wire to a provider that returns **per-grade market value** keyed by `{set, card, grader, grade}` (PSA 10 ≠ PSA 9 ≠ BGS 9.5 ≠ raw), refreshed daily.
- **Recent-sales / comps feed** (`app/cards-detail.jsx → recentSales()`) is seeded fake data. Replace with a real sales/comps API (eBay, TCGplayer, PWCC, Goldin…).
- **Daily % movers** (`card.daily`) are static — derive from real price history.

### 3. Brand logos & card images (real CDNs, demo-grade)
- **Crypto coin icons:** `data.js → assetLogo()` → `cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/{sym}.svg`. Real & reliable; unmapped symbols fall back to a monogram tile.
- **Stock logos:** currently the **Google favicon service** (`google.com/s2/favicons?domain=…`) via a small `STOCK_DOMAINS` map — **low-res, demo-grade.** For production swap to a proper financial-logo provider and expand the ticker→domain map. Component: `shared.jsx → AssetIcon` (real logo over a colored monogram fallback; never breaks).
- **Card images:** `app/cards-data.js` carries real image URLs for the Base Set Pokémon cards via the Pokémon TCG image CDN (`images.pokemontcg.io/{setId}/{num}.png`) as a working demo; everything else falls back to a clean typographic "slab." Production: every catalog entry gets a stock image from the card-data provider. Renderer: `app/cards-detail.jsx → CardThumb` (slab base layer + image overlay + `onError` fallback). User-entered manual items accept an optional image URL.

### 4. Account connections (all mock)
- Plaid / SnapTrade brokerage & bank linking — **server-side OAuth / token exchange only.**
- Crypto wallets: **public address / xpub, read-only** via public RPC/explorer (the one integration safe client-adjacent; never private keys).
- `app/connections.jsx` sync flows are simulated (staggered spinners).

### 5. ⚠️ Tax engine — HIGHEST LIABILITY
The lot-matching, **wash-sale rules** (securities), and **crypto per-wallet cost-basis (2025 rule)** are illustrative in the prototype. They **must be implemented correctly and validated by a tax professional** before any user files off an export. Until validated, label exports "draft — review with your CPA."

### 6. Auth & persistence
- Prototype stores everything in `localStorage` (`all_positions_v3`, `all_tx_v3`, `all_realized_v3`) with no auth. Production needs real auth + per-user isolation (see §Recommended Architecture).

---

## Recommended Architecture (production)

**Database — PostgreSQL.** The data is relational and money-accurate (positions → lots → disposals, reconciling transactions, card line-items). Use Postgres; do not use NoSQL for the ledger.

**Recommended stack — Supabase:** Postgres + built-in Auth (Google, Apple, email/password — the three login methods designed) + **Row-Level Security** (per-user data isolation at the DB layer — critical for financial data) + storage (generated CPA/export files) + edge functions.
- *Alternative:* Neon/RDS Postgres + Clerk/Auth0 if auth should be decoupled.

**Thin server layer (required):** Plaid/SnapTrade token exchange and **all market-data / card-pricing API keys** must live server-side (Supabase edge functions or a small Node/Bun API). **Secrets must never reach the browser.**

---

## Proposed Data Model (the backbone)

```
users (id, email, auth_provider, created_at)

positions
  id, user_id, asset_class (enum: crypto|stocks|realest|private|cash|loans|metals),
  ticker, name, account, is_live (bool),
  subcat (for private: Art|Watches|Trading Cards|Jewelry|Other),
  grade, price_source (for collectibles, e.g. "Collectr · daily"),
  apy (for cash/stablecoin), is_stable (bool),
  manual_value, last_valued_date, cost_basis_manual    -- manual assets

lots                      -- the heart of the system
  id, position_id, qty, price, acquired_date, account, basis (= qty*price)

card_items                -- itemized collectibles (Trading Cards position)
  id, position_id, catalog_id (nullable for manual), is_manual (bool),
  type (graded|raw|sealed), grader (PSA|BGS|CGC|null), grade (e.g. '10','9.5'|null),
  qty, basis (per unit), acquired_date, image_url (nullable),
  -- manual-only descriptive fields: name, game, set_code, set_name, num
  -- current value is DERIVED from catalog price × grade, not stored

card_catalog              -- synced from provider (cards + sealed)
  id, game, set_id, number, name, rarity, kind (card|sealed),
  image_url, prices_jsonb {raw,psa9,psa10,bgs95,cgc10} OR sealed price

disposals (realized sales)
  id, user_id, position_id, ticker, asset_class, qty, proceeds, sold_date,
  lot_snapshot (jsonb: lots as they were at sale time → re-derive basis per method)

transactions (ledger)      -- one row per user action; reconciles to positions
  id, user_id, date, type (buy|sell|deposit|withdrawal|dividend|valuation|
       loan_payment|transfer),
  position_id, asset_class, ticker, name, qty, price, amount, account,
  source (live|manual), note

loans (position_id, principal, balance, rate, term_months, originated,
       next_due, next_amt, payments_made, interest_ytd)
price_cache (asset_key, price, prev_close, change_7d, updated_at)
connections (id, user_id, provider, type, status, last_synced, value, asset_class)
```

**Aggregate derivation for the Trading Cards position:** value/qty/basis are computed from its `card_items` (see `app/cards-data.js → recompute()`), so the position rolls up into Overview / allocation / tax like any other. Per-item current value = catalog price for that grade × qty (`itemUnitValue`/`itemValue`).

**Cost-basis matching (`matchLots`)** — given a sale of `qty` against a position's lots: **FIFO** (oldest first) / **LIFO** (newest first) / **HIFO** (highest price first). Accumulate basis from consumed lots; earliest matched lot drives holding-period (>365.25 days = long-term). See `data.js → matchLots()` / `taxSummary()`.

---

## Screens / Views

All screens share: sticky top header (**logo image `landing-assets/nexis-mark.png` + "NEXIS FOLIO" wordmark** + tab nav + live indicator + search + theme toggle + Add-position button), max-width ~1240px centered, `--bg` page background, card surfaces with 0.5px hairline borders and subtle shadows. **Mobile (≤760px):** header collapses to logo + **hamburger menu**; multi-column grids stack; dense tables drop secondary columns (see §Responsive).

### 1. Landing (`NEST WATCH.html` → `landing.jsx`)
Marketing front door, Apple-clean light theme. Sticky blurred nav (logo + wordmark); centered hero ("Every asset you own, in one place."); status pill; two CTAs; hero screenshot. Alternating feature sections (Net worth / Retirement / Taxes / One ledger), each with a class-color tag, headline, body, and a real dashboard screenshot (`landing-assets/0N-shot.jpg`). Class-color chip strip ("Seven asset classes. One number." — Crypto/Stocks/Real estate/**Collectibles**/Cash/Loans/Metals), security band, dark final CTA, footer. Reveal-on-scroll via IntersectionObserver.

> Note: the entry HTML file is still named `NEST WATCH.html` and the root React component is `window.NestWatch` (internal id) — not user-visible. Rename freely in the real codebase.

### 2. Auth (`landing-app.jsx → Auth`)
Centered 380px card; Continue with Google + Apple; email/password; sign-up ↔ sign-in toggle. Sign-up → Onboarding; sign-in → dashboard.

### 3. Onboarding (`landing-app.jsx → Onboarding`)
3 skippable steps to seed a portfolio: (1) connect brokerage (mock-links sample holdings), (2) add crypto wallet (address input, auto-detects BTC/ETH/SOL), (3) add an asset by hand. Final: "Enter with my N assets" or "Explore the sample portfolio." Hands off via the localStorage keys above.

### 4. Overview / Dashboard (`app/overview.jsx`)
Hero net worth + 24h change + 1W sparkline + range pills. Metric band: Liquid / Illiquid / Loans out / Cost basis / Total P/L. Allocation donut/bars (Tweak) with **clickable legend filter**. Holdings grouped by class with subtotals + live/manual flag; columns Asset · 24h · 7d · Cost basis · Value · Total return; Private & Collectibles sub-groups by sub-category. Rows → Asset detail. Asset rows use **`AssetIcon`** (real crypto/stock logo, monogram fallback).

### 5. Net-worth History (`app/history.jsx` + `app/transactions.jsx`)
Area chart with 1D/1W/1M/1Y/ALL, hover scrubbing, flow markers. **Editable transactions ledger** below: filter/search; row → slide-over edit drawer (all fields editable, Save/Cancel/Delete); "+ Add transaction"; persists via store.

### 6. Asset Detail (`app/detail.jsx`) — routes by type
- **Market positions:** price sparkline + range pills; stat grid; per-lot tax-lot table (ST/LT badges); position facts.
- **Loans:** next-payment hero + repaid progress; loan terms; amortization schedule (next 6 payments).
- **Trading Cards** → routes to the **Collectibles detail** (below).

### 6b. Collectibles / Trading Cards detail (`app/cards-detail.jsx`) — NEW
- **Summary band:** collection value + daily move + range-toggled trend chart; stat card (market value / cost basis / unrealized P/L); **composition bar** (Graded / Raw / Sealed).
- **"Your collection":** gallery **or** list view of every line-item. Each shows a **card thumbnail** (`CardThumb` — real image with slab fallback), grade badge (PSA 10 / BGS 9.5 / RAW / SEALED), unit value, daily %, total return, qty.
- **Item drawer** (click any item): big thumb, **grade ladder** (raw vs PSA 9 vs BGS 9.5 vs CGC 10 vs PSA 10 — your grade highlighted), 90-day price trend, position facts, **recent-sales/comps feed**, remove.
- **"Add card or sealed"** → the catalog browser (below).

### 6c. Card catalog browser (`app/cards-catalog.jsx`) — NEW (Collectr-style)
Full-screen modal. Search across all sets/cards/sealed; filter by **game** (One Piece / Pokémon / Lorcana / Magic / Sports) and **type** (Cards / Sealed). Results grid of selectable thumbnails (real image when available). Select a card → config panel: **Condition** (Graded / Raw), **Grader** (PSA / BGS / CGC), **Grade** (price updates live via the grade ladder), qty / cost basis / acquired date → **Add to collection** (writes a `card_item`, rolls into totals + ledger). Sealed = qty/basis/date. **"Can't find it? Add manually"** → manual form (name, game, set/number, condition, grader/grade, value, basis, qty, date, **optional image URL**) for anything not in the catalog.

### 7. Retirement (`app/retirement.jsx`, `retire-parts.jsx`, `retire-extra.jsx`)
Two-age hero (age to hit number / safe age to retire); method toggle (Traditional / Coast FIRE / FIRE); log-scale projection chart with optional Monte-Carlo band + success rate; milestone timeline; levers (scenario, ages, contribution, spend, withdrawal rate, goal, include-residence); editable per-class CAGR table; "invest more, retire sooner" ladder. Engine: `data.js → retirement()`, `retirementMC()`, `investableByClass()`.

### 8. Tax Center (`app/tax.jsx`)
Metric cards (realized gains/losses, net, loan interest, est. tax); short-vs-long & by-class bars; disposals table; **FIFO/LIFO/HIFO selector** (recomputes); **export panel** generating real files (Form 8949 CSV, Schedule D, Schedule B, TurboTax `.txf`, raw lot CSV, CPA package). See `buildExport()`. ⚠️ see tax liability flag above.

### 9. Connections (`app/connections.jsx`)
Add-source cards (Brokerage / Crypto wallet / Manual); linked-sources table with per-row sync status + last-synced; "Sync all"; reauth flow. All simulated.

### Add Position / Log Trade modal (`app/addposition.jsx`)
Two modes. **Add position:** class picker rewrites fields per class; ticker autocomplete with typo tolerance (`searchSymbols()`); live value preview. **Log trade:** buy/sell against an existing position → creates/consumes lots (FIFO), records a realized-sale the Tax center reads. (Note: the dedicated card catalog in §6c is the richer path for collectibles.)

---

## Interactions & Behavior
- **Theme:** light/dark via `data-theme` on `<html>`; all colors CSS vars; toggle in header; default light.
- **Routing:** single-page, `route` state in `app/shell.jsx`; tabs + detail drill-in; mobile hamburger.
- **Store:** `app/store.js` — mutable `window.ALL.POSITIONS` + transactions + realized sales, persisted to localStorage, React subscribers via `useStore()`. Card actions: `addCardItem` / `removeCardItem` / `updateCardItem` (recompute aggregate + write ledger). **Replace with backend queries + optimistic updates.**
- **Images everywhere** use an `onError` → fallback pattern (`AssetIcon`, `CardThumb`) so a dead URL never shows a broken box.
- **Number format:** tabular-nums; abbreviated ($2.4M) vs full is a Tweak (`window.__ALL_ABBR`).

## Design Tokens
Authoritative list in `tokens.css`. Summary:
- **Fonts:** Inter (400/450/500/600/700); `.num` = tabular-nums.
- **Class colors + `--t-<class>` tints:** see the table above (light + dark variants).
- **Semantic:** `--pos #0E9D6E`, `--neg #E0443E`.
- **Light:** `--bg #FAFAFB`, `--surface #FFFFFF`, `--border #E7E8EA`, `--ink #15171A`, `--ink-2 #5C6168`, `--ink-3 #8A9099`.
- **Dark:** `--bg #0D0E10`, `--surface #16181B`, `--border #26282C`, `--ink #F3F4F5`.
- **Radius:** `--radius 10px`, `--radius-sm 7px`. **Hairline:** 0.5px. **Accent:** near-mono (defaults to ink).
- **Responsive breakpoint:** 760px (see `@media` block in `tokens.css` — `.nw-page`, `.nw-stack-2/3`, `.nw-holding`, `.nw-tx`, `.nw-conn`, `.nw-sectbl`, `.nw-cat-body`, `.nw-card-grid`).

## Assets
- `landing-assets/nexis-mark.png` — the NEXIS FOLIO logo mark (teal→green ribbon "N", transparent PNG). Used in both headers + footer.
- `landing-assets/01–04-shot.jpg` — product screenshots on the landing page; **regenerate from the real app** as UI evolves.
- Crypto icons (jsDelivr), stock logos (favicon service — upgrade for prod), card images (Pokémon TCG CDN demo) — see §Production Integration #3.
- All UI icons are inline SVG in `shared.jsx`. No icon-font dependency.

## Files (design references in this bundle)
- `NEST WATCH.html` — landing/auth/onboarding entry; `landing.jsx`, `landing-app.jsx`
- `$ALL.html` — dashboard entry
- `data.js` — **all mock data + the pure engine** (lots, totals, matchLots, taxSummary, retirement, retirementMC) **+ `assetLogo()`**. Port the engine; replace the data.
- `app/cards-data.js` — **card catalog + collection model**: GAMES/SETS/CARDS/SEALED, grade-price resolver (`priceForGrade`), per-item value/meta helpers, `recompute()`. Replace catalog + prices with a provider.
- `app/cards-detail.jsx` — collectibles detail page, grade ladder, comps feed, `CardThumb`. Exports `window.CardsKit`.
- `app/cards-catalog.jsx` — Collectr-style catalog browser + manual-add form.
- `tokens.css` — design tokens + responsive rules
- `app/` — `shell.jsx` (nav/router/theme/logo), `overview.jsx`, `history.jsx`, `transactions.jsx`, `detail.jsx`, `retirement.jsx` + `retire-parts.jsx` + `retire-extra.jsx`, `tax.jsx`, `connections.jsx`, `watchlist.jsx`, `news.jsx`, `addposition.jsx`, `store.js`, `cards-*`
- `shared.jsx` — shared UI (donut, area chart, badges, icons, **`AssetIcon`**)
- `Mobile preview.html` — side-by-side phone frames for checking responsive layout

## Implementation Order (suggested)
1. Postgres schema (lots ledger + card_items + card_catalog) + Supabase Auth (Google/Apple/email) + RLS.
2. Port the pure engine from `data.js` (totals, P/L, matchLots, taxSummary, retirement) + card aggregate (`cards-data.js → recompute`).
3. Overview → Detail → History core loop against real data.
4. Add/Log-trade + card add/remove writing real rows.
5. Wallet (read-only public address) → first live integration.
6. Market-price service + cache + "Update prices"; then card-pricing provider + catalog sync + images.
7. Plaid/SnapTrade (server-side).
8. Tax center — **with validated engine + CPA review** before exposing exports for filing.
9. Logos: swap stock-logo source to a proper provider; expand mappings.
10. Polish: empty/error/loading states, accessibility, global search.
