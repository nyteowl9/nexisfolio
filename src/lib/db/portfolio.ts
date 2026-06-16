import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnitPriced, type CardItem, type Lot, type LoanTerms, type Position } from "@/lib/engine";

/** asset_key convention used by price_cache, e.g. "crypto:BTC". */
export const priceKey = (cls: string, ticker?: string | null) => `${cls}:${ticker ?? ""}`;

// Minimal row shapes (until generated Supabase types are added).
interface PositionRow {
  id: string;
  cls: Position["cls"];
  ticker: string | null;
  name: string;
  account: string | null;
  is_live: boolean;
  qty: number | null;
  subcat: string | null;
  grade: string | null;
  price_source: string | null;
  apy: number | null;
  is_stable: boolean | null;
  manual_value: number | null;
  last_valued_date: string | null;
  cost_basis_manual: number | null;
}
interface LotRow {
  id: string;
  position_id: string;
  qty: number;
  price: number;
  acquired_date: string;
  account: string | null;
  basis: number;
}
interface CardItemRow {
  id: string;
  position_id: string;
  catalog_id: string | null;
  is_manual: boolean;
  type: CardItem["type"];
  grader: CardItem["grader"];
  grade: string | null;
  qty: number;
  basis: number;
  acquired_date: string | null;
  image_url: string | null;
  name: string | null;
  game: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
}
interface LoanRow {
  position_id: string;
  principal: number;
  balance: number;
  rate: number;
  term_months: number | null;
  originated: string | null;
  next_due: string | null;
  next_amt: number | null;
  payments_made: number | null;
  interest_ytd: number | null;
}
interface PriceRow {
  asset_key: string;
  price: number | null;
  prev_close: number | null;
}

/**
 * Load the current user's portfolio and assemble engine-ready `Position[]`.
 * RLS scopes every query to the authenticated user automatically.
 */
export async function getPortfolio(supabase: SupabaseClient): Promise<Position[]> {
  const [positionsRes, lotsRes, itemsRes, loansRes, pricesRes] = await Promise.all([
    supabase.from("positions").select("*"),
    supabase.from("lots").select("*"),
    supabase.from("card_items").select("*"),
    supabase.from("loans").select("*"),
    supabase.from("price_cache").select("asset_key,price,prev_close"),
  ]);

  const positions = (positionsRes.data ?? []) as PositionRow[];
  const lots = (lotsRes.data ?? []) as LotRow[];
  const items = (itemsRes.data ?? []) as CardItemRow[];
  const loans = (loansRes.data ?? []) as LoanRow[];
  const prices = (pricesRes.data ?? []) as PriceRow[];

  const priceByKey = new Map(prices.map((p) => [p.asset_key, p]));
  const lotsByPos = new Map<string, Lot[]>();
  for (const l of lots) {
    const arr = lotsByPos.get(l.position_id) ?? [];
    arr.push({ qty: l.qty, price: l.price, date: l.acquired_date, account: l.account ?? undefined, basis: l.basis });
    lotsByPos.set(l.position_id, arr);
  }
  const itemsByPos = new Map<string, CardItem[]>();
  for (const it of items) {
    const arr = itemsByPos.get(it.position_id) ?? [];
    arr.push({
      id: it.id,
      catId: it.catalog_id ?? undefined,
      type: it.type,
      grader: it.grader,
      grade: it.grade,
      qty: it.qty,
      basis: it.basis,
      acquired: it.acquired_date ?? "",
      manual: it.is_manual,
      name: it.name ?? undefined,
      game: it.game ?? undefined,
      setCode: it.set_code ?? undefined,
      setName: it.set_name ?? undefined,
      num: it.number ?? undefined,
      img: it.image_url ?? undefined,
    });
    itemsByPos.set(it.position_id, arr);
  }
  const loanByPos = new Map(loans.map((l) => [l.position_id, l]));

  return positions.map((row): Position => {
    const p: Position = {
      id: row.id,
      cls: row.cls,
      ticker: row.ticker ?? "—",
      name: row.name,
      live: row.is_live,
      account: row.account ?? undefined,
      lots: lotsByPos.get(row.id),
    };

    if (isUnitPriced(row.cls)) {
      const pr = priceByKey.get(priceKey(row.cls, row.ticker));
      p.qty = row.qty ?? 0;
      p.price = pr?.price ?? 0;
      p.prev = pr?.prev_close ?? 0;
    } else if (row.cls === "cash") {
      p.value = row.manual_value ?? 0;
      p.prevValue = row.manual_value ?? 0;
      p.apy = row.apy ?? undefined;
      p.stable = row.is_stable ?? undefined;
    } else {
      // realest / private / loans (manual)
      p.value = row.manual_value ?? 0;
      if (row.cost_basis_manual != null) p.basis = row.cost_basis_manual;
      p.subcat = row.subcat ?? undefined;
      p.grade = row.grade ?? undefined;
      p.priceSource = row.price_source ?? undefined;
      if (row.last_valued_date) p.valued = row.last_valued_date;
    }

    const items = itemsByPos.get(row.id);
    if (items) p.items = items;

    const loan = loanByPos.get(row.id);
    if (loan) {
      p.loan = {
        principal: loan.principal,
        balance: loan.balance,
        rate: loan.rate,
        termMonths: loan.term_months ?? 0,
        originated: loan.originated ?? "",
        nextDue: loan.next_due ?? "",
        nextAmt: loan.next_amt ?? 0,
        paymentsMade: loan.payments_made ?? 0,
        interestYtd: loan.interest_ytd ?? 0,
      } satisfies LoanTerms;
    }

    return p;
  });
}
