import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingMethod } from "@/lib/engine";

export interface Prefs {
  theme: "light" | "dark";
  accent: string;
  allocChart: "donut" | "bars";
  costBasis: AccountingMethod;
  showNews: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "light",
  accent: "#15171A",
  allocChart: "donut",
  costBasis: "FIFO",
  showNews: true,
};

/** Read the signed-in user's preferences (merged over defaults). */
export async function getPrefs(supabase: SupabaseClient): Promise<Prefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFS;
  const { data } = await supabase.from("profiles").select("prefs").eq("id", user.id).single();
  return { ...DEFAULT_PREFS, ...((data?.prefs as Partial<Prefs>) ?? {}) };
}
