import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { syncPositionQty } from "@/lib/db/holdings-sync";

export interface TxRow {
  id: string;
  lot_id: string | null;
  position_id: string | null;
  type: string | null;
  qty: number | null;
  price: number | null;
  amount: number | null;
  tx_date: string | null;
}

/**
 * Reverse a transaction's effect on its position (without deleting the row):
 * remove the lot a buy added, restore a cash/manual balance for
 * deposit/withdraw, or put units back and drop the disposal for a sell.
 */
export async function reverseOne(supabase: SupabaseClient, userId: string, tx: TxRow): Promise<void> {
  const pid = tx.position_id;
  if (!pid) return;
  const { data: pos } = await supabase.from("positions").select("cls,manual_value").eq("id", pid).single();
  const unit = pos ? isUnitPriced(pos.cls as AssetClass) : false;

  if (tx.lot_id) {
    await supabase.from("lots").delete().eq("id", tx.lot_id).eq("user_id", userId);
  } else if (tx.type === "sell" && unit) {
    await supabase.from("lots").insert({ user_id: userId, position_id: pid, qty: tx.qty ?? 0, price: tx.price ?? 0, acquired_date: tx.tx_date ?? new Date().toISOString().slice(0, 10) });
    const { data: disp } = await supabase.from("disposals").select("id").eq("position_id", pid).eq("user_id", userId).order("sold_date", { ascending: false }).limit(1);
    if (disp?.[0]) await supabase.from("disposals").delete().eq("id", disp[0].id).eq("user_id", userId);
  } else if (!unit && pos) {
    if (tx.type === "withdrawal" || tx.type === "withdraw") await supabase.from("positions").update({ manual_value: (pos.manual_value ?? 0) + (tx.amount ?? 0) }).eq("id", pid);
    else if (tx.type === "deposit") await supabase.from("positions").update({ manual_value: Math.max(0, (pos.manual_value ?? 0) - (tx.amount ?? 0)) }).eq("id", pid);
  }

  if (unit) await syncPositionQty(supabase, pid, userId);
}
