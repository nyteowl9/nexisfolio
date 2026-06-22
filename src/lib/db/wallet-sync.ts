import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchQuote } from "@/lib/market/quote";
import { fetchHoldings, type Chain } from "@/lib/market/wallet";
import { priceKey } from "@/lib/db/portfolio";

export const CHAINS: Record<string, { ticker: string; name: string }> = {
  btc: { ticker: "BTC", name: "Bitcoin" },
  eth: { ticker: "ETH", name: "Ethereum" },
  sol: { ticker: "SOL", name: "Solana" },
};

const today = () => new Date().toISOString().slice(0, 10);

/** Detect a chain from a public address shape. */
export function detectChainKey(address: string): keyof typeof CHAINS | null {
  const a = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "eth";
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a)) return "btc";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "sol";
  return null;
}

/**
 * Core wallet sync used by connect, manual re-sync, and the cron job: read
 * on-chain holdings, upsert a position per coin (idempotent by wallet+coin,
 * dust-filtered by the user's pref), and upsert the connection (storing the
 * full address for future re-syncs). Pure helper — no auth/redirects — so it
 * works with both a user-scoped client and the admin client (cron).
 */
export async function syncWallet(
  supabase: SupabaseClient,
  userId: string,
  chainKey: keyof typeof CHAINS,
  address: string,
  fallbackQty = 0
): Promise<{ added: number; skipped: number }> {
  const chain = CHAINS[chainKey];
  const acct = `Wallet · ${address.slice(0, 6)}…${address.slice(-4)}`;
  const { data: prof } = await supabase.from("profiles").select("prefs").eq("id", userId).single();
  const dust = Number((prof?.prefs as { dustThreshold?: number } | null)?.dustThreshold ?? 1);
  const admin = createAdminClient();

  const holdings = await fetchHoldings(chainKey as Chain, address);
  if (!holdings.length && fallbackQty > 0) holdings.push({ ticker: chain.ticker, name: chain.name, qty: fallbackQty, price: 0 });

  let added = 0, skipped = 0, totalValue = 0;
  for (const h of holdings) {
    const price = h.price > 0 ? h.price : (await fetchQuote("crypto", h.ticker))?.price ?? 0;
    const value = h.qty * price;
    if (dust > 0 && value < dust) { skipped++; continue; }
    totalValue += value;

    const { data: existing } = await supabase
      .from("positions").select("id")
      .eq("user_id", userId).eq("cls", "crypto").eq("ticker", h.ticker).eq("account", acct)
      .limit(1).maybeSingle();
    if (existing) {
      await supabase.from("positions").update({ qty: h.qty }).eq("id", existing.id).eq("user_id", userId);
    } else {
      const { data: posRow, error } = await supabase
        .from("positions")
        .insert({ user_id: userId, cls: "crypto", ticker: h.ticker, name: h.name, account: acct, is_live: true, qty: h.qty })
        .select("id").single();
      if (error) continue;
      const posId = posRow.id as string;
      await supabase.from("lots").insert({ user_id: userId, position_id: posId, qty: h.qty, price, acquired_date: today(), account: acct });
      await supabase.from("transactions").insert({ user_id: userId, position_id: posId, tx_date: today(), type: "buy", cls: "crypto", ticker: h.ticker, name: h.name, qty: h.qty, price, amount: value, account: acct, source: "live", note: "Wallet balance" });
    }
    if (price) await admin.from("price_cache").upsert({ asset_key: priceKey("crypto", h.ticker), price, prev_close: price });
    added++;
  }

  if (added > 0) {
    const dn = `${chain.ticker} wallet · ${address.slice(0, 6)}…${address.slice(-4)}`;
    const { data: conn } = await supabase.from("connections").select("id").eq("user_id", userId).eq("provider", "wallet").eq("display_name", dn).limit(1).maybeSingle();
    if (conn) {
      await supabase.from("connections").update({ status: "connected", last_synced: new Date().toISOString(), value: totalValue, external_id: address }).eq("id", conn.id);
    } else {
      await supabase.from("connections").insert({ user_id: userId, provider: "wallet", type: "wallet", status: "connected", asset_class: "crypto", display_name: dn, last_synced: new Date().toISOString(), value: totalValue, external_id: address });
    }
  }
  return { added, skipped };
}
