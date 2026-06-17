import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnitPriced, type AssetClass } from "@/lib/engine";

/** For unit-priced positions, keep position.qty equal to the sum of its lots. */
export async function syncPositionQty(supabase: SupabaseClient, positionId: string, userId: string) {
  const { data: pos } = await supabase.from("positions").select("cls").eq("id", positionId).eq("user_id", userId).single();
  if (!pos || !isUnitPriced(pos.cls as AssetClass)) return;
  const { data: lots } = await supabase.from("lots").select("qty").eq("position_id", positionId);
  const total = (lots ?? []).reduce((s, l) => s + Number(l.qty), 0);
  await supabase.from("positions").update({ qty: total }).eq("id", positionId).eq("user_id", userId);
}
