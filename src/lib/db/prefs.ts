import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingMethod } from "@/lib/engine";

export interface RetirementPrefs {
  method: "traditional" | "coast" | "fire";
  scenario: string;
  currentAge: number;
  retireAge: number;
  annualSpend: number;
  monthly: number;
  target: number;
  customGoal: boolean;
  withdrawalRate: number;
  inflation: number;
  coastAge: number;
  includeHome: boolean;
}

export interface Prefs {
  theme: "light" | "dark";
  accent: string;
  allocChart: "donut" | "bars";
  costBasis: AccountingMethod;
  showNews: boolean;
  numbers: "abbreviated" | "full";
  retirement: RetirementPrefs;
}

export const DEFAULT_RETIREMENT: RetirementPrefs = {
  method: "coast",
  scenario: "Base",
  currentAge: 40,
  retireAge: 65,
  annualSpend: 120000,
  monthly: 8000,
  target: 3000000,
  customGoal: false,
  withdrawalRate: 4,
  inflation: 3,
  coastAge: 55,
  includeHome: false,
};

export const DEFAULT_PREFS: Prefs = {
  theme: "light",
  accent: "#15171A",
  allocChart: "donut",
  costBasis: "FIFO",
  showNews: true,
  numbers: "abbreviated",
  retirement: DEFAULT_RETIREMENT,
};

/** Read the signed-in user's preferences (merged over defaults). */
export async function getPrefs(supabase: SupabaseClient): Promise<Prefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFS;
  const { data } = await supabase.from("profiles").select("prefs").eq("id", user.id).single();
  const stored = (data?.prefs as Partial<Prefs>) ?? {};
  return {
    ...DEFAULT_PREFS,
    ...stored,
    retirement: { ...DEFAULT_RETIREMENT, ...(stored.retirement ?? {}) },
  };
}
