"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUnitPriced, type AssetClass } from "@/lib/engine";

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
