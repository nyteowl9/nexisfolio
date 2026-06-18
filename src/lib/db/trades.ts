"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { fetchQuote } from "@/lib/market/quote";
import { priceKey } from "@/lib/db/portfolio";
import { insertPosition } from "@/lib/db/positions";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

interface LotRow { id: string; qty: number; price: number; acquired_date: string }

/**
 * Log a buy or sell against an existing position.
 * Buy → adds a lot (+qty). Sell → consumes lots FIFO, records a realized
 * disposal (with the consumed-lot snapshot) for the Tax Center. Both write a
 * transaction to the ledger.
 */
export async function logTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positionId = str(formData.get("positionId"));
  const side = str(formData.get("side")) === "sell" ? "sell" : "buy";
  const qty = num(formData.get("qty"));
  const price = num(formData.get("price"));
  const date = str(formData.get("date")) || new Date().toISOString().slice(0, 10);
  const back = str(formData.get("from")) || "/dashboard";
  if (!positionId || qty <= 0) redirect(`${back}?error=Enter+a+quantity`);

  const { data: pos } = await supabase.from("positions").select("*").eq("id", positionId).eq("user_id", user.id).single();
  if (!pos) redirect(`${back}?error=Position+not+found`);
  const cls = pos.cls as AssetClass;
  const unit = isUnitPriced(cls);
  const account = str(formData.get("account")) || pos.account || null;

  let lotId: string | null = null;
  if (side === "buy") {
    const { data: lotData } = await supabase.from("lots").insert({ user_id: user.id, position_id: positionId, qty, price, acquired_date: date, account }).select("id").single();
    lotId = lotData?.id ?? null;
    if (unit) await supabase.from("positions").update({ qty: (pos.qty ?? 0) + qty }).eq("id", positionId);
  } else {
    // consume lots FIFO
    const { data: lotsData } = await supabase.from("lots").select("id,qty,price,acquired_date").eq("position_id", positionId).order("acquired_date", { ascending: true });
    const lots = (lotsData ?? []) as LotRow[];
    let remaining = qty;
    const consumed: { qty: number; price: number; date: string }[] = [];
    for (const l of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, l.qty);
      consumed.push({ qty: take, price: l.price, date: l.acquired_date });
      if (take >= l.qty) await supabase.from("lots").delete().eq("id", l.id);
      else await supabase.from("lots").update({ qty: l.qty - take }).eq("id", l.id);
      remaining -= take;
    }
    if (unit) await supabase.from("positions").update({ qty: Math.max(0, (pos.qty ?? 0) - qty) }).eq("id", positionId);
    await supabase.from("disposals").insert({
      user_id: user.id,
      position_id: positionId,
      ticker: pos.ticker,
      cls,
      qty,
      proceeds: qty * price,
      sold_date: date,
      lot_snapshot: consumed,
    });
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    position_id: positionId,
    lot_id: lotId,
    tx_date: date,
    type: side,
    cls,
    ticker: pos.ticker,
    name: pos.name,
    qty,
    price,
    amount: qty * price,
    account,
    source: "manual",
    note: side === "sell" ? "Sell" : "Buy",
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/detail/${positionId}`);
  redirect(`${back}?traded=${encodeURIComponent(`${side} ${qty} ${pos.ticker ?? pos.name}`)}`);
}

type PosRow = { id: string; cls: AssetClass; ticker: string | null; name: string; qty: number | null; manual_value: number | null; account: string | null };

/** Draw `amount` (USD) out of a position: sell units (crypto/stock/metal) or
 *  reduce a cash/manual balance. `override` forces the unit price (for a
 *  historical conversion); otherwise today's live price is used. Returns the
 *  dollar amount actually moved. */
async function drawDown(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, pos: PosRow, amount: number, date: string, override = 0): Promise<number> {
  if (isUnitPriced(pos.cls)) {
    const price = override > 0 ? override : (await fetchQuote(pos.cls, pos.ticker ?? ""))?.price ?? 0;
    if (!price) return 0;
    const want = amount / price;
    const have = pos.qty ?? 0;
    const qtySold = Math.min(want, have);
    if (qtySold <= 0) return 0;
    const proceeds = qtySold * price;

    const { data: lotsData } = await supabase.from("lots").select("id,qty,price,acquired_date").eq("position_id", pos.id).order("acquired_date", { ascending: true });
    const lots = (lotsData ?? []) as LotRow[];
    let remaining = qtySold;
    const consumed: { qty: number; price: number; date: string }[] = [];
    for (const l of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, l.qty);
      consumed.push({ qty: take, price: l.price, date: l.acquired_date });
      if (take >= l.qty) await supabase.from("lots").delete().eq("id", l.id);
      else await supabase.from("lots").update({ qty: l.qty - take }).eq("id", l.id);
      remaining -= take;
    }
    await supabase.from("positions").update({ qty: Math.max(0, have - qtySold) }).eq("id", pos.id);
    await supabase.from("disposals").insert({ user_id: userId, position_id: pos.id, ticker: pos.ticker, cls: pos.cls, qty: qtySold, proceeds, sold_date: date, lot_snapshot: consumed });
    await supabase.from("transactions").insert({ user_id: userId, position_id: pos.id, tx_date: date, type: "sell", cls: pos.cls, ticker: pos.ticker, name: pos.name, qty: qtySold, price, amount: proceeds, account: pos.account, source: "manual", note: "Converted out" });
    return proceeds;
  }
  // cash / manual
  const have = pos.manual_value ?? 0;
  const moved = Math.min(amount, have);
  await supabase.from("positions").update({ manual_value: Math.max(0, have - moved) }).eq("id", pos.id);
  await supabase.from("transactions").insert({ user_id: userId, position_id: pos.id, tx_date: date, type: "withdraw", cls: pos.cls, ticker: pos.ticker, name: pos.name, amount: moved, account: pos.account, source: "manual", note: "Converted out" });
  return moved;
}

/** Put `amount` (USD) into an existing position: buy units or top up cash.
 *  `override` forces the unit (cost-basis) price; the live price cache is only
 *  refreshed when no override is given. */
async function addInto(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, pos: PosRow, amount: number, date: string, override = 0) {
  if (isUnitPriced(pos.cls)) {
    const q = override > 0 ? null : await fetchQuote(pos.cls, pos.ticker ?? "");
    const price = override > 0 ? override : q?.price ?? 0;
    if (!price) return;
    const qty = amount / price;
    const { data: lot } = await supabase.from("lots").insert({ user_id: userId, position_id: pos.id, qty, price, acquired_date: date, account: pos.account }).select("id").single();
    await supabase.from("positions").update({ qty: (pos.qty ?? 0) + qty }).eq("id", pos.id);
    if (q) {
      const admin = createAdminClient();
      await admin.from("price_cache").upsert({ asset_key: priceKey(pos.cls, pos.ticker ?? ""), price, prev_close: q.prev ?? price });
    }
    await supabase.from("transactions").insert({ user_id: userId, position_id: pos.id, lot_id: lot?.id ?? null, tx_date: date, type: "buy", cls: pos.cls, ticker: pos.ticker, name: pos.name, qty, price, amount, account: pos.account, source: "manual", note: "Converted in" });
    return;
  }
  const have = pos.manual_value ?? 0;
  await supabase.from("positions").update({ manual_value: have + amount }).eq("id", pos.id);
  await supabase.from("transactions").insert({ user_id: userId, position_id: pos.id, tx_date: date, type: "deposit", cls: pos.cls, ticker: pos.ticker, name: pos.name, amount, account: pos.account, source: "manual", note: "Converted in" });
}

/**
 * Convert one holding into another in a single linked step — e.g. sell cash to
 * buy Bitcoin, or swap ETH→SOL. Draws `amount` USD out of the source (a real
 * taxable disposal for crypto/stocks/metals; just a balance change for cash)
 * and puts the same dollars into the destination (existing or brand-new).
 */
export async function convert(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = str(formData.get("from")) || "/dashboard";
  const fromId = str(formData.get("fromId"));
  const amount = num(formData.get("amount"));
  const date = str(formData.get("date")) || new Date().toISOString().slice(0, 10);
  const fromPrice = num(formData.get("fromPrice")); // optional override
  const toPrice = num(formData.get("toPrice")); // optional override
  if (!fromId || amount <= 0) redirect(`${back}?error=Pick+a+source+and+amount`);

  const { data: from } = await supabase.from("positions").select("id,cls,ticker,name,qty,manual_value,account").eq("id", fromId).eq("user_id", user.id).single();
  if (!from) redirect(`${back}?error=Source+not+found`);

  const moved = await drawDown(supabase, user.id, from as PosRow, amount, date, fromPrice);
  if (moved <= 0) redirect(`${back}?error=Nothing+available+to+convert`);

  const toMode = str(formData.get("toMode")) || "existing";
  if (toMode === "new") {
    const cls = str(formData.get("toCls")) as AssetClass;
    const ticker = str(formData.get("toTicker")).toUpperCase();
    const providerId = str(formData.get("toProviderId")) || undefined;
    if (!cls || !ticker) redirect(`${back}?error=Pick+a+destination+asset`);
    const live = toPrice > 0 ? toPrice : (await fetchQuote(cls, ticker, providerId))?.price ?? 0;
    if (!live) redirect(`${back}?error=No+price+for+destination`);
    // insertPosition refreshes the live price cache itself; costPerUnit is the
    // conversion price (override or live), and it merges same-ticker holdings.
    await insertPosition(supabase, user.id, {
      cls,
      name: str(formData.get("toName")) || ticker,
      ticker,
      providerId,
      qty: moved / live,
      costPerUnit: live,
      acquiredDate: date,
    });
  } else {
    const toId = str(formData.get("toId"));
    if (!toId || toId === fromId) redirect(`${back}?error=Pick+a+different+destination`);
    const { data: to } = await supabase.from("positions").select("id,cls,ticker,name,qty,manual_value,account").eq("id", toId).eq("user_id", user.id).single();
    if (!to) redirect(`${back}?error=Destination+not+found`);
    await addInto(supabase, user.id, to as PosRow, moved, date, toPrice);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(`${back}?converted=1`);
}
