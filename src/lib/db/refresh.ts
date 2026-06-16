"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { priceKey } from "@/lib/db/portfolio";
import { fetchQuote } from "@/lib/market/quote";

/** Server action: re-fetch live prices for the user's live holdings. */
export async function refreshPrices() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase.from("positions").select("cls,ticker").eq("is_live", true);
  const rows = (data ?? []) as { cls: AssetClass; ticker: string | null }[];

  // de-dupe by asset key
  const seen = new Set<string>();
  const targets = rows.filter((r) => {
    if (!r.ticker || r.ticker === "—" || !isUnitPriced(r.cls)) return false;
    const k = priceKey(r.cls, r.ticker);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const admin = createAdminClient();
  const quotes = await Promise.all(
    targets.map(async (t) => ({ t, q: await fetchQuote(t.cls, t.ticker!) }))
  );
  const updates = quotes
    .filter((x) => x.q)
    .map((x) => ({ asset_key: priceKey(x.t.cls, x.t.ticker), price: x.q!.price, prev_close: x.q!.prev }));
  if (updates.length) await admin.from("price_cache").upsert(updates);

  revalidatePath("/dashboard");
}
