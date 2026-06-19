/**
 * Read-only wallet balances — SERVER-SIDE ONLY.
 * Reads the NATIVE coin balance from public endpoints (no API key, no private
 * keys, no signing). ERC-20 / SPL token enumeration needs an indexer API
 * (Alchemy/Covalent/Helius) and comes later.
 */
export type Chain = "btc" | "eth" | "sol";

export interface Holding { ticker: string; name: string; qty: number; price: number }

const NATIVE: Record<Chain, { ticker: string; name: string }> = {
  btc: { ticker: "BTC", name: "Bitcoin" },
  eth: { ticker: "ETH", name: "Ethereum" },
  sol: { ticker: "SOL", name: "Solana" },
};

/**
 * EVM native + ERC-20 balances WITH USD prices in one call, via GoldRush
 * (Covalent). Requires GOLDRUSH_API_KEY / COVALENT_API_KEY; returns null when
 * no key is set (caller falls back to native-only). `no-spam` drops spam tokens.
 */
async function covalentEvm(address: string): Promise<Holding[] | null> {
  const key = process.env.GOLDRUSH_API_KEY || process.env.COVALENT_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.covalenthq.com/v1/eth-mainnet/address/${encodeURIComponent(address)}/balances_v2/?nft=false&no-spam=true`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { items?: Array<{ contract_ticker_symbol?: string; contract_name?: string; contract_decimals?: number; balance?: string; quote_rate?: number }> } };
    const items = j?.data?.items ?? [];
    return items
      .map((it) => ({
        ticker: (it.contract_ticker_symbol || "").toUpperCase(),
        name: it.contract_name || it.contract_ticker_symbol || "",
        qty: Number(it.balance ?? 0) / 10 ** (it.contract_decimals ?? 18),
        price: it.quote_rate ?? 0,
      }))
      .filter((h) => h.ticker && h.qty > 0 && h.price > 0);
  } catch {
    return null;
  }
}

/**
 * All holdings for a wallet: ERC-20 tokens + native when an indexer key is set
 * (EVM), otherwise just the native coin. Native fallback leaves price 0 for the
 * caller to fill from its own quote source.
 */
export async function fetchHoldings(chain: Chain, address: string): Promise<Holding[]> {
  if (chain === "eth") {
    const evm = await covalentEvm(address);
    if (evm && evm.length) return evm; // includes native ETH + tokens, priced
  }
  const bal = await fetchNativeBalance(chain, address);
  if (bal == null) return [];
  return [{ ticker: NATIVE[chain].ticker, name: NATIVE[chain].name, qty: bal, price: 0 }];
}

const ETH_RPCS = ["https://ethereum-rpc.publicnode.com", "https://1rpc.io/eth"];

export async function fetchNativeBalance(chain: Chain, address: string): Promise<number | null> {
  try {
    if (chain === "eth") {
      for (const ep of ETH_RPCS) {
        try {
          const r = await fetch(ep, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
            cache: "no-store",
          });
          const j = (await r.json()) as { result?: string };
          if (j?.result) return parseInt(j.result, 16) / 1e18;
        } catch {
          /* try next endpoint */
        }
      }
      return null;
    }
    if (chain === "btc") {
      const r = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}`, {
        headers: { "User-Agent": "NexisFolio/1.0" },
        cache: "no-store",
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { chain_stats?: { funded_txo_sum: number; spent_txo_sum: number } };
      const cs = j?.chain_stats;
      if (!cs) return null;
      return (cs.funded_txo_sum - cs.spent_txo_sum) / 1e8;
    }
    if (chain === "sol") {
      const r = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
        cache: "no-store",
      });
      const j = (await r.json()) as { result?: { value?: number } };
      const lamports = j?.result?.value;
      if (lamports == null) return null;
      return lamports / 1e9;
    }
    return null;
  } catch {
    return null;
  }
}
