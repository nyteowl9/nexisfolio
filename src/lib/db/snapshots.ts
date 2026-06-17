import type { SupabaseClient } from "@supabase/supabase-js";
import type { Totals } from "@/lib/engine";

const today = () => new Date().toISOString().slice(0, 10);

/** Record (upsert) today's net-worth snapshot so history accrues over time. */
export async function recordSnapshot(supabase: SupabaseClient, userId: string, t: Totals) {
  if (t.net <= 0) return;
  await supabase.from("net_worth_snapshots").upsert({
    user_id: userId,
    snap_date: today(),
    net_worth: Math.round(t.net),
    liquid: Math.round(t.liquid),
    illiquid: Math.round(t.illiquid),
    loans_out: Math.round(t.loansOut),
  });
}

export interface Snap {
  date: string;
  net: number;
}

/** All of the user's net-worth snapshots, oldest → newest. */
export async function getSnapshots(supabase: SupabaseClient): Promise<Snap[]> {
  const { data } = await supabase.from("net_worth_snapshots").select("snap_date,net_worth").order("snap_date", { ascending: true });
  return ((data ?? []) as { snap_date: string; net_worth: number }[]).map((r) => ({ date: r.snap_date, net: r.net_worth }));
}
