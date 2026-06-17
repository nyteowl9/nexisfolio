"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { priceKey } from "@/lib/db/portfolio";
import { fetchQuote } from "@/lib/market/quote";

const STALE_MS = 15 * 60 * 1000;

/** Re-fetch live prices for the user's live holdings. force=false skips fresh ones. */
async function doRefresh(force: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase.from("positions").select("cls,ticker").eq("is_live", true);
  const rows = (data ?? []) as { cls: AssetClass; ticker: string | null }[];

  // unique live asset keys
  const seen = new Set<string>();
  const targets = rows.filter((r) => {
    if (!r.ticker || r.ticker === "—" || !isUnitPriced(r.cls)) return false;
    const k = priceKey(r.cls, r.ticker);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (!targets.length) return;

  // skip assets refreshed recently unless forced
  let fresh = new Set<string>();
  if (!force) {
    const { data: pc } = await supabase.from("price_cache").select("asset_key,updated_at");
    const now = Date.now();
    fresh = new Set(
      ((pc ?? []) as { asset_key: string; updated_at: string }[])
        .filter((p) => now - new Date(p.updated_at).getTime() < STALE_MS)
        .map((p) => p.asset_key)
    );
  }
  const toFetch = targets.filter((t) => force || !fresh.has(priceKey(t.cls, t.ticker)));
  if (!toFetch.length) return;

  const admin = createAdminClient();
  const quotes = await Promise.all(toFetch.map(async (t) => ({ t, q: await fetchQuote(t.cls, t.ticker!) })));
  const updates = quotes
    .filter((x) => x.q)
    .map((x) => ({ asset_key: priceKey(x.t.cls, x.t.ticker), price: x.q!.price, prev_close: x.q!.prev, updated_at: new Date().toISOString() }));
  if (updates.length) await admin.from("price_cache").upsert(updates);
}

/** Server action: force-refresh all live prices (the "Update prices" button). */
export async function refreshPrices() {
  await doRefresh(true);
  revalidatePath("/dashboard");
}

/** Refresh only stale prices (called on dashboard load to keep figures current). */
export async function refreshStalePrices() {
  await doRefresh(false);
}
