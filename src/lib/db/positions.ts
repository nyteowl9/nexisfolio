"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitPriced, type AssetClass } from "@/lib/engine";
import { priceKey } from "@/lib/db/portfolio";

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
 * Core insert used by every onboarding/add path. Writes the position, a lot
 * (for unit-priced assets), and seeds price_cache so value computes. RLS
 * scopes user rows; price_cache is written with the service role.
 */
export async function insertPosition(
  supabase: SupabaseClient,
  userId: string,
  input: PositionInput
): Promise<string> {
  const unit = isUnitPriced(input.cls);
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
  const posId = data.id as string;

  if (unit && input.qty) {
    const { error: le } = await supabase.from("lots").insert({
      user_id: userId,
      position_id: posId,
      qty: input.qty,
      price: input.costPerUnit ?? input.currentPrice ?? 0,
      acquired_date: input.acquiredDate ?? today(),
      account: input.account ?? null,
    });
    if (le) throw new Error(`add lot: ${le.message}`);

    if (input.ticker && input.currentPrice != null) {
      const admin = createAdminClient();
      const { error: pe } = await admin.from("price_cache").upsert({
        asset_key: priceKey(input.cls, input.ticker),
        price: input.currentPrice,
        prev_close: input.currentPrice,
      });
      if (pe) throw new Error(`set price: ${pe.message}`);
    }
  }

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
  if (!cls || !name) redirect("/onboarding?step=3&error=Name+and+class+required");

  await insertPosition(supabase, user.id, {
    cls,
    name: name!,
    ticker: str(formData.get("ticker"))?.toUpperCase(),
    account: str(formData.get("account")),
    subcat: str(formData.get("subcat")),
    qty: num(formData.get("qty")),
    currentPrice: num(formData.get("currentPrice")),
    costPerUnit: num(formData.get("costPerUnit")),
    acquiredDate: str(formData.get("acquiredDate")),
    value: num(formData.get("value")),
    costBasis: num(formData.get("costBasis")),
  });

  revalidatePath("/dashboard");
  redirect(`/onboarding?step=3&added=${encodeURIComponent(name!)}`);
}

const CHAINS: Record<string, { ticker: string; name: string }> = {
  btc: { ticker: "BTC", name: "Bitcoin" },
  eth: { ticker: "ETH", name: "Ethereum" },
  sol: { ticker: "SOL", name: "Solana" },
};

/** Auto-detect chain from a public address shape. */
export async function detectChain(address: string): Promise<keyof typeof CHAINS | null> {
  const a = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "eth";
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a)) return "btc";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "sol";
  return null;
}

/** Server action: add a crypto position from a public wallet address. */
export async function addWallet(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const address = str(formData.get("address"));
  const chainKey = (str(formData.get("chain")) as keyof typeof CHAINS) || (address ? await detectChain(address) : null);
  if (!address || !chainKey || !CHAINS[chainKey]) {
    redirect("/onboarding?step=2&error=Enter+a+valid+address+or+pick+a+chain");
  }
  const chain = CHAINS[chainKey!];

  await insertPosition(supabase, user.id, {
    cls: "crypto",
    name: chain.name,
    ticker: chain.ticker,
    account: `Wallet · ${address!.slice(0, 6)}…${address!.slice(-4)}`,
    qty: num(formData.get("qty")),
    currentPrice: num(formData.get("currentPrice")),
    costPerUnit: num(formData.get("costPerUnit")),
  });

  await supabase.from("connections").insert({
    user_id: user.id,
    provider: "wallet",
    type: "wallet",
    status: "connected",
    asset_class: "crypto",
    display_name: `${chain.ticker} · ${address!.slice(0, 6)}…${address!.slice(-4)}`,
    last_synced: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
  redirect(`/onboarding?step=2&added=${encodeURIComponent(chain.ticker + " wallet")}`);
}

/** Server action: mock-link a brokerage by seeding a few sample holdings. */
export async function linkSampleBrokerage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const holdings: PositionInput[] = [
    { cls: "stocks", ticker: "VTI", name: "Vanguard Total Mkt ETF", account: "Fidelity · 401(k)", qty: 120, currentPrice: 278.3, costPerUnit: 198.4, acquiredDate: "2022-01-03" },
    { cls: "stocks", ticker: "AAPL", name: "Apple Inc.", account: "Fidelity · Brokerage", qty: 60, currentPrice: 212.4, costPerUnit: 120.0, acquiredDate: "2020-05-20" },
    { cls: "stocks", ticker: "NVDA", name: "NVIDIA Corp.", account: "Fidelity · Brokerage", qty: 80, currentPrice: 125.1, costPerUnit: 19.8, acquiredDate: "2020-03-23" },
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
  redirect("/onboarding?step=1&added=Sample+brokerage");
}
