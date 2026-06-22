"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { priceKey } from "@/lib/db/portfolio";
import { fetchQuote } from "@/lib/market/quote";
import { syncPositionQty } from "@/lib/db/holdings-sync";
import { CHAINS, detectChainKey, syncWallet } from "@/lib/db/wallet-sync";

const today = () => new Date().toISOString().slice(0, 10);
const num = (v: FormDataEntryValue | null): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const str = (v: FormDataEntryValue | null): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
};

export interface PositionInput {
  cls: AssetClass;
  name: string;
  ticker?: string;
  providerId?: string;
  account?: string;
  subcat?: string;
  // unit-priced (crypto/stocks/metals)
  qty?: number;
  currentPrice?: number;
  costPerUnit?: number;
  acquiredDate?: string;
  // manual (realest/private/cash/loans)
  value?: number;
  costBasis?: number;
  valuedDate?: string;
  apy?: number;
  isStable?: boolean;
}

/**
 * Core insert used by every add path. For unit-priced assets, the live price is
 * fetched server-side (no manual entry) and cached to price_cache. RLS scopes
 * user rows; price_cache is written with the service role.
 */
export async function insertPosition(
  supabase: SupabaseClient,
  userId: string,
  input: PositionInput
): Promise<string> {
  const unit = isUnitPriced(input.cls);

  // Always pull a live quote for unit-priced assets so we get a real price AND
  // prior close (for an accurate 24h move). currentPrice is only a fallback.
  let price = input.currentPrice;
  let prev = input.currentPrice;
  if (unit && input.ticker) {
    const q = await fetchQuote(input.cls, input.ticker, input.providerId);
    if (q) {
      price = q.price;
      prev = q.prev;
    }
  }

  // Merge into an existing holding of the same asset (e.g. adding TSLA twice
  // adds a lot to the one Tesla position instead of creating a duplicate).
  let posId: string | undefined;
  if (unit && input.ticker) {
    const { data: dup } = await supabase
      .from("positions")
      .select("id")
      .eq("user_id", userId)
      .eq("cls", input.cls)
      .eq("ticker", input.ticker)
      .limit(1)
      .maybeSingle();
    posId = dup?.id as string | undefined;
  }

  if (!posId) {
    const base: Record<string, unknown> = {
      user_id: userId,
      cls: input.cls,
      ticker: input.ticker ?? null,
      name: input.name,
      account: input.account ?? null,
      is_live: unit,
    };

    let row: Record<string, unknown>;
    if (unit) {
      row = { ...base, qty: input.qty ?? 0 };
    } else if (input.cls === "cash") {
      row = { ...base, manual_value: input.value ?? 0, apy: input.apy ?? null, is_stable: input.isStable ?? false };
    } else {
      row = {
        ...base,
        manual_value: input.value ?? 0,
        cost_basis_manual: input.costBasis ?? null,
        subcat: input.subcat ?? null,
        last_valued_date: input.valuedDate ?? today(),
      };
    }

    const { data, error } = await supabase.from("positions").insert(row).select("id").single();
    if (error) throw new Error(`add position: ${error.message}`);
    posId = data.id as string;
  }

  let lotId: string | null = null;
  if (unit && input.qty) {
    const { data: lotData, error: le } = await supabase.from("lots").insert({
      user_id: userId,
      position_id: posId,
      qty: input.qty,
      price: input.costPerUnit ?? price ?? 0,
      acquired_date: input.acquiredDate ?? today(),
      account: input.account ?? null,
    }).select("id").single();
    if (le) throw new Error(`add lot: ${le.message}`);
    lotId = lotData.id as string;

    if (input.ticker && price != null) {
      const admin = createAdminClient();
      const { error: pe } = await admin.from("price_cache").upsert({
        asset_key: priceKey(input.cls, input.ticker),
        price,
        prev_close: prev ?? price,
      });
      if (pe) throw new Error(`set price: ${pe.message}`);
    }
  }

  // Record the add in the transactions ledger so History reflects it.
  const txType = unit ? "buy" : input.cls === "cash" ? "deposit" : "valuation";
  const txAmount = unit
    ? (input.qty ?? 0) * (input.costPerUnit ?? price ?? 0)
    : input.value ?? 0;
  await supabase.from("transactions").insert({
    user_id: userId,
    position_id: posId,
    lot_id: lotId,
    tx_date: input.acquiredDate ?? input.valuedDate ?? today(),
    type: txType,
    cls: input.cls,
    ticker: input.ticker ?? null,
    name: input.name,
    qty: unit ? input.qty ?? null : null,
    price: unit ? input.costPerUnit ?? price ?? null : null,
    amount: txAmount,
    account: input.account ?? null,
    source: "manual",
    note: "Added position",
  });

  // keep position.qty equal to the sum of its lots (matters when merging adds)
  if (unit) await syncPositionQty(supabase, posId, userId);

  return posId;
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Server action: add one asset by hand (real, all classes). */
export async function addPosition(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const cls = String(formData.get("cls") ?? "") as AssetClass;
  const name = str(formData.get("name"));
  const redirectTo = str(formData.get("redirectTo")) ?? "/onboarding";
  if (!cls || !name) redirect(`${redirectTo}?error=Name+and+class+required`);

  await insertPosition(supabase, user.id, {
    cls,
    name: name!,
    ticker: str(formData.get("ticker"))?.toUpperCase(),
    providerId: str(formData.get("providerId")),
    account: str(formData.get("account")),
    subcat: str(formData.get("subcat")),
    qty: num(formData.get("qty")),
    currentPrice: num(formData.get("currentPrice")),
    costPerUnit: num(formData.get("costPerUnit")),
    acquiredDate: str(formData.get("acquiredDate")),
    value: num(formData.get("value")),
    costBasis: num(formData.get("costBasis")),
    apy: num(formData.get("apy")),
    isStable: formData.get("isStable") === "on",
  });

  revalidatePath("/dashboard");
  redirect(`${redirectTo}?added=${encodeURIComponent(name!)}`);
}

export interface BulkRow {
  cls: AssetClass;
  ticker?: string;
  name?: string;
  qty?: number;
  costPerUnit?: number;
  acquiredDate?: string;
}

/**
 * Server action: add several market positions at once (the bulk table).
 * `doRedirect` true (onboarding) navigates to the dashboard; false (the
 * in-app modal) just revalidates and returns the count so the caller can
 * refresh + close itself.
 */
export async function addPositionsBulk(rows: BulkRow[], doRedirect = true): Promise<number> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  let added = 0;
  for (const r of rows) {
    if (!isUnitPriced(r.cls) || !r.ticker || !r.qty) continue;
    await insertPosition(supabase, user.id, {
      cls: r.cls,
      name: r.name?.trim() || r.ticker.toUpperCase(),
      ticker: r.ticker.toUpperCase(),
      qty: r.qty,
      costPerUnit: r.costPerUnit,
      acquiredDate: r.acquiredDate,
    });
    added++;
  }
  revalidatePath("/dashboard");
  if (doRedirect) redirect(added > 0 ? `/dashboard` : "/onboarding?error=Add+at+least+one+row");
  return added;
}

/** Server action: connect a public crypto wallet and sync its live holdings. */
export async function addWallet(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const back = str(formData.get("from")) || "/onboarding";
  const address = str(formData.get("address"));
  const chainKey = (str(formData.get("chain")) as keyof typeof CHAINS) || (address ? detectChainKey(address) : null);
  if (!address || !chainKey || !CHAINS[chainKey]) {
    redirect(`${back}?error=${encodeURIComponent("Enter a valid BTC / ETH / SOL address")}`);
  }

  const { added, skipped } = await syncWallet(supabase, user.id, chainKey!, address!, num(formData.get("qty")) ?? 0);
  if (!added) {
    redirect(`${back}?error=${encodeURIComponent("Couldn't read that wallet, or everything was below your dust threshold.")}`);
  }
  revalidatePath("/dashboard");
  redirect(`${back}?added=${encodeURIComponent(`${added} holding${added === 1 ? "" : "s"} synced${skipped ? ` · ${skipped} dust skipped` : ""}`)}`);
}

/** Server action: re-sync an already-connected wallet (refresh balances). */
export async function resyncWallet(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const id = str(formData.get("id"));
  if (!id) redirect("/connections");

  const { data: conn } = await supabase.from("connections").select("external_id").eq("id", id).eq("user_id", user.id).single();
  const address = conn?.external_id as string | undefined;
  if (!address) redirect(`/connections?error=${encodeURIComponent("Re-connect this wallet once to enable re-sync.")}`);
  const chainKey = detectChainKey(address!);
  if (!chainKey) redirect(`/connections?error=${encodeURIComponent("Couldn't determine this wallet's chain.")}`);

  const { added } = await syncWallet(supabase, user.id, chainKey, address!);
  revalidatePath("/dashboard");
  redirect(`/connections?added=${encodeURIComponent(added ? `re-synced ${added} holding${added === 1 ? "" : "s"}` : "re-synced (no balances)")}`);
}

/** Server action: disconnect a wallet — removes the connection and the
 *  holdings it synced (positions + their lots/ledger/disposals). */
export async function disconnectWallet(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const id = str(formData.get("id"));
  if (!id) redirect("/connections");

  const { data: conn } = await supabase.from("connections").select("display_name").eq("id", id).eq("user_id", user.id).single();
  // display_name is "ETH wallet · 0x12…ef"; positions use account "Wallet · 0x12…ef".
  const suffix = conn?.display_name?.split("· ")[1];
  if (suffix) {
    const acct = `Wallet · ${suffix}`;
    const { data: ps } = await supabase.from("positions").select("id").eq("user_id", user.id).eq("account", acct);
    const ids = (ps ?? []).map((p) => p.id as string);
    if (ids.length) {
      await supabase.from("transactions").delete().in("position_id", ids).eq("user_id", user.id);
      await supabase.from("disposals").delete().in("position_id", ids).eq("user_id", user.id);
      await supabase.from("positions").delete().in("id", ids).eq("user_id", user.id);
    }
  }
  await supabase.from("connections").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/connections");
  redirect("/connections");
}

/** Server action: mock-link a brokerage by seeding a few sample holdings. */
export async function linkSampleBrokerage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const holdings: PositionInput[] = [
    { cls: "stocks", ticker: "VTI", name: "Vanguard Total Mkt ETF", account: "Fidelity · 401(k)", qty: 120, costPerUnit: 198.4, acquiredDate: "2022-01-03" },
    { cls: "stocks", ticker: "AAPL", name: "Apple Inc.", account: "Fidelity · Brokerage", qty: 60, costPerUnit: 120.0, acquiredDate: "2020-05-20" },
    { cls: "stocks", ticker: "NVDA", name: "NVIDIA Corp.", account: "Fidelity · Brokerage", qty: 80, costPerUnit: 19.8, acquiredDate: "2020-03-23" },
  ];
  for (const h of holdings) await insertPosition(supabase, user.id, h);

  await supabase.from("connections").insert({
    user_id: user.id,
    provider: "snaptrade",
    type: "brokerage",
    status: "connected",
    asset_class: "stocks",
    display_name: "Fidelity (sample)",
    last_synced: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
  redirect("/onboarding?added=Sample+brokerage");
}

/** Server action: delete one position (cascades lots/items/loans). */
export async function removePosition(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const id = str(formData.get("id"));
  const back = str(formData.get("from")) ?? "/dashboard";
  if (id) {
    // remove the position's ledger entries + disposals, then the position
    // (lots / card_items / loans cascade automatically)
    await supabase.from("transactions").delete().eq("position_id", id).eq("user_id", user.id);
    await supabase.from("disposals").delete().eq("position_id", id).eq("user_id", user.id);
    await supabase.from("positions").delete().eq("id", id).eq("user_id", user.id);
  }
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(back.startsWith("/") ? back : "/dashboard");
}

/** Server action: edit a manual-valued position's current value (cash, real
 *  estate, collectibles). Cash has no lots, so this is how you correct a balance. */
export async function updatePositionValue(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const id = str(formData.get("id"));
  const value = num(formData.get("value"));
  const costBasis = num(formData.get("costBasis"));
  const back = str(formData.get("from")) ?? "/dashboard";
  if (!id || value == null) redirect(back.startsWith("/") ? back : "/dashboard");

  const update: Record<string, unknown> = { manual_value: value, last_valued_date: today() };
  if (costBasis != null) update.cost_basis_manual = costBasis;
  await supabase.from("positions").update(update).eq("id", id).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/detail/${id}`);
  redirect(back.startsWith("/") ? back : "/dashboard");
}

/** Server action: ensure a Trading Cards position exists, then open its catalog. */
export async function browseCardCatalog() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: existing } = await supabase
    .from("positions")
    .select("id")
    .eq("user_id", user.id)
    .eq("cls", "private")
    .eq("subcat", "Trading Cards")
    .limit(1);

  let id = existing?.[0]?.id as string | undefined;
  if (!id) {
    const { data, error } = await supabase
      .from("positions")
      .insert({ user_id: user.id, cls: "private", subcat: "Trading Cards", name: "Trading Cards", is_live: false, manual_value: 0, cost_basis_manual: 0, account: "Collection" })
      .select("id")
      .single();
    if (error) throw new Error(`create cards position: ${error.message}`);
    id = data.id as string;
  }
  revalidatePath("/dashboard");
  redirect(`/detail/${id}?addcards=1`);
}

/** Server action: wipe the user's whole portfolio so they can start over. */
export async function clearPortfolio() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  // positions cascade to lots/card_items/loans; clear the rest explicitly.
  await supabase.from("transactions").delete().eq("user_id", user.id);
  await supabase.from("disposals").delete().eq("user_id", user.id);
  await supabase.from("connections").delete().eq("user_id", user.id);
  await supabase.from("net_worth_snapshots").delete().eq("user_id", user.id);
  await supabase.from("liabilities").delete().eq("user_id", user.id);
  await supabase.from("positions").delete().eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/onboarding?cleared=1");
}
