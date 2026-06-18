import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnitPriced, type AssetClass } from "@/lib/engine";

/** Delete a position plus its ledger rows (lots cascade via FK). */
async function deletePositionRow(supabase: SupabaseClient, positionId: string, userId: string) {
  await supabase.from("transactions").delete().eq("position_id", positionId).eq("user_id", userId);
  await supabase.from("disposals").delete().eq("position_id", positionId).eq("user_id", userId);
  await supabase.from("positions").delete().eq("id", positionId).eq("user_id", userId);
}

/**
 * For unit-priced positions, keep position.qty equal to the sum of its lots.
 * If a market position ends up with no lots and no sale history, it's an empty
 * husk (e.g. its only buy was deleted) — remove it so it doesn't linger as a
 * 0-qty row in Holdings.
 */
export async function syncPositionQty(supabase: SupabaseClient, positionId: string, userId: string) {
  const { data: pos } = await supabase.from("positions").select("cls").eq("id", positionId).eq("user_id", userId).single();
  if (!pos || !isUnitPriced(pos.cls as AssetClass)) return;

  const { data: lots } = await supabase.from("lots").select("qty").eq("position_id", positionId);
  if (!lots || lots.length === 0) {
    const { count } = await supabase
      .from("disposals")
      .select("id", { count: "exact", head: true })
      .eq("position_id", positionId)
      .eq("user_id", userId);
    if (!count) {
      await deletePositionRow(supabase, positionId, userId);
      return;
    }
  }

  const total = (lots ?? []).reduce((s, l) => s + Number(l.qty), 0);
  await supabase.from("positions").update({ qty: total }).eq("id", positionId).eq("user_id", userId);
}

/**
 * Sweep away empty market husks for a user: unit-priced positions that have no
 * lots and no sale history. Cheap to run on dashboard load to clear positions
 * orphaned before husk-aware deletion existed.
 */
export async function cleanupEmptyHoldings(supabase: SupabaseClient, userId: string) {
  const { data: positions } = await supabase
    .from("positions")
    .select("id,cls")
    .eq("user_id", userId);
  if (!positions) return;

  const market = positions.filter((p) => isUnitPriced(p.cls as AssetClass));
  if (!market.length) return;

  const ids = market.map((p) => p.id as string);
  const { data: lots } = await supabase.from("lots").select("position_id").in("position_id", ids);
  const { data: disps } = await supabase.from("disposals").select("position_id").in("position_id", ids).eq("user_id", userId);
  const hasLot = new Set((lots ?? []).map((l) => l.position_id as string));
  const hasDisp = new Set((disps ?? []).map((d) => d.position_id as string));

  for (const id of ids) {
    if (!hasLot.has(id) && !hasDisp.has(id)) await deletePositionRow(supabase, id, userId);
  }
}
