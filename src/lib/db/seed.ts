"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, recompute, type Position } from "@/lib/engine";
import { POSITIONS, CARD_ITEMS, DISPOSALS, CATALOG, TRANSACTIONS } from "@/lib/sample/sample-data";
import { priceKey } from "@/lib/db/portfolio";

type Row = Record<string, unknown>;

function positionRow(
  sp: Position,
  userId: string,
  cardsAgg: { value: number; basis: number }
): Row {
  const base: Row = {
    user_id: userId,
    cls: sp.cls,
    ticker: sp.ticker === "—" ? null : sp.ticker,
    name: sp.name,
    account: sp.account ?? null,
    is_live: sp.live,
  };
  if (isUnitPriced(sp.cls)) return { ...base, qty: sp.qty };
  if (sp.cls === "cash")
    return { ...base, manual_value: sp.value, apy: sp.apy ?? null, is_stable: sp.stable ?? false };

  const isCards = sp.id === "cards";
  return {
    ...base,
    manual_value: isCards ? cardsAgg.value : sp.value,
    cost_basis_manual: isCards ? cardsAgg.basis : sp.basis ?? null,
    subcat: sp.subcat ?? null,
    grade: sp.grade ?? null,
    price_source: sp.priceSource ?? null,
    last_valued_date: sp.valued ?? null,
    is_primary_residence: sp.id === "home",
  };
}

/**
 * Seed the signed-in user's tables with the sample portfolio.
 * User-owned rows are inserted via the user's session (RLS allows own rows);
 * shared price_cache is seeded via the service-role client.
 */
export async function seedSamplePortfolio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idempotent: don't double-seed.
  const { count } = await supabase
    .from("positions")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    redirect("/dashboard");
  }

  const cardsAgg = recompute(CARD_ITEMS, CATALOG);
  const posIdByKey: Record<string, string> = {};

  for (const sp of POSITIONS) {
    const { data: inserted, error } = await supabase
      .from("positions")
      .insert(positionRow(sp, user.id, cardsAgg))
      .select("id")
      .single();
    if (error) throw new Error(`seed position ${sp.id}: ${error.message}`);
    const posId = inserted.id as string;
    posIdByKey[priceKey(sp.cls, sp.ticker === "—" ? null : sp.ticker)] = posId;

    if (sp.lots?.length) {
      const { error: le } = await supabase.from("lots").insert(
        sp.lots.map((l) => ({
          user_id: user.id,
          position_id: posId,
          qty: l.qty,
          price: l.price,
          acquired_date: l.date,
          account: l.account ?? null,
        }))
      );
      if (le) throw new Error(`seed lots ${sp.id}: ${le.message}`);
    }

    if (sp.loan) {
      const { error: loe } = await supabase.from("loans").insert({
        position_id: posId,
        user_id: user.id,
        principal: sp.loan.principal,
        balance: sp.loan.balance,
        rate: sp.loan.rate,
        term_months: sp.loan.termMonths,
        originated: sp.loan.originated,
        next_due: sp.loan.nextDue,
        next_amt: sp.loan.nextAmt,
        payments_made: sp.loan.paymentsMade,
        interest_ytd: sp.loan.interestYtd,
      });
      if (loe) throw new Error(`seed loan ${sp.id}: ${loe.message}`);
    }

    if (sp.id === "cards") {
      const { error: ce } = await supabase.from("card_items").insert(
        CARD_ITEMS.map((it) => ({
          user_id: user.id,
          position_id: posId,
          catalog_id: it.catId ?? null,
          is_manual: !!it.manual,
          type: it.type,
          grader: it.grader,
          grade: it.grade,
          qty: it.qty,
          basis: it.basis,
          acquired_date: it.acquired,
        }))
      );
      if (ce) throw new Error(`seed card_items: ${ce.message}`);
    }
  }

  // Disposals (realized sales — for the future Tax Center; don't affect net worth).
  const disposalRows = DISPOSALS.map((d) => ({
    user_id: user.id,
    position_id: posIdByKey[priceKey(d.cls, d.asset)] ?? null,
    ticker: d.asset,
    cls: d.cls,
    qty: d.qty,
    proceeds: d.proceeds,
    sold_date: d.date,
    lot_snapshot: { lots: d.lots, acq: d.acq },
  }));
  if (disposalRows.length) {
    const { error: de } = await supabase.from("disposals").insert(disposalRows);
    if (de) throw new Error(`seed disposals: ${de.message}`);
  }

  // Transactions ledger (for the History tab).
  const txRows = TRANSACTIONS.map((x) => ({
    user_id: user.id,
    position_id: posIdByKey[priceKey(x.cls as never, x.ticker)] ?? null,
    tx_date: x.date,
    type: x.type,
    cls: x.cls,
    ticker: x.ticker,
    name: x.name,
    qty: x.qty,
    price: x.price,
    amount: x.amount,
    account: x.account,
    source: x.source,
    note: x.note,
  }));
  if (txRows.length) {
    const { error: te } = await supabase.from("transactions").insert(txRows);
    if (te) throw new Error(`seed transactions: ${te.message}`);
  }

  // Seed shared price_cache for unit-priced assets (service role bypasses RLS).
  const admin = createAdminClient();
  const priceRows = POSITIONS.filter((p) => isUnitPriced(p.cls) && p.ticker !== "—").map((p) => ({
    asset_key: priceKey(p.cls, p.ticker),
    price: p.price,
    prev_close: p.prev,
  }));
  if (priceRows.length) {
    const { error: pe } = await admin.from("price_cache").upsert(priceRows);
    if (pe) throw new Error(`seed prices: ${pe.message}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
