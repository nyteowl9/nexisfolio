import type { SupabaseClient } from "@supabase/supabase-js";

export interface Liability {
  id: string;
  name: string;
  kind: string;
  balance: number;
  rate: number | null;
  originated: string | null;
  collateral_position_id: string | null;
  liq_ltv: number | null;
}

/** All of the user's liabilities (debt owed). */
export async function getLiabilities(supabase: SupabaseClient): Promise<Liability[]> {
  const { data } = await supabase
    .from("liabilities")
    .select("id,name,kind,balance,rate,originated,collateral_position_id,liq_ltv")
    .order("created_at", { ascending: false });
  return (data ?? []) as Liability[];
}

export const debtTotal = (liabs: Liability[]) => liabs.reduce((s, l) => s + (l.balance || 0), 0);
