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

interface BlockscoutItem {
  value?: string;
  token?: { symbol?: string; name?: string; decimals?: string | number; exchange_rate?: string | number | null; circulating_market_cap?: string | number | null; type?: string };
}

// Spam/airdrop tokens often carry a bogus exchange rate but ~no real market
// cap. Require a minimum circulating market cap to count a token as real.
const MIN_MARKET_CAP = 50_000;

// Public Blockscout instances (free, keyless), one per EVM chain. An EVM
// (0x…) address is the same across all of them, so we sweep each.
const EVM_CHAINS: Array<{ base: string; native: string; nativeName: string }> = [
  { base: "https://eth.blockscout.com", native: "ETH", nativeName: "Ethereum" },
  { base: "https://base.blockscout.com", native: "ETH", nativeName: "Ethereum" },
  { base: "https://optimism.blockscout.com", native: "ETH", nativeName: "Ethereum" },
  { base: "https://arbitrum.blockscout.com", native: "ETH", nativeName: "Ethereum" },
  { base: "https://polygon.blockscout.com", native: "POL", nativeName: "Polygon" },
  { base: "https://gnosis.blockscout.com", native: "XDAI", nativeName: "xDai" },
];

/** Native coin + priced ERC-20 holdings for one EVM chain (Blockscout). */
async function blockscoutChain(base: string, address: string, native: string, nativeName: string): Promise<Holding[]> {
  const out: Holding[] = [];
  try {
    const r = await fetch(`${base}/api/v2/addresses/${encodeURIComponent(address)}`, { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { coin_balance?: string; exchange_rate?: string | number | null };
      const qty = Number(j.coin_balance ?? 0) / 1e18;
      const price = Number(j.exchange_rate ?? 0);
      if (qty > 0 && price > 0) out.push({ ticker: native, name: nativeName, qty, price });
    }
  } catch { /* skip */ }
  try {
    const r = await fetch(`${base}/api/v2/addresses/${encodeURIComponent(address)}/token-balances`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const arr = (Array.isArray(j) ? j : j?.items ?? []) as BlockscoutItem[];
      for (const it of arr) {
        const t = it.token ?? {};
        if (t.type && t.type !== "ERC-20") continue;
        const qty = Number(it.value ?? 0) / 10 ** Number(t.decimals ?? 18);
        const price = Number(t.exchange_rate ?? 0);
        const mcap = Number(t.circulating_market_cap ?? 0);
        const ticker = (t.symbol || "").toUpperCase();
        if (ticker && qty > 0 && price > 0 && mcap >= MIN_MARKET_CAP) out.push({ ticker, name: t.name || ticker, qty, price });
      }
    }
  } catch { /* skip */ }
  return out;
}

/**
 * All holdings for a wallet. EVM (0x) addresses are swept across every major
 * chain (Ethereum, Base, Optimism, Arbitrum, Polygon, Gnosis) — free, keyless
 * via Blockscout — and merged by ticker. BTC/SOL read their native coin.
 * Niche chains without a public Blockscout (e.g. HyperEVM) aren't covered.
 */
export async function fetchHoldings(chain: Chain, address: string): Promise<Holding[]> {
  if (chain === "btc" || chain === "sol") {
    const bal = await fetchNativeBalance(chain, address);
    if (bal == null || bal <= 0) return [];
    return [{ ticker: NATIVE[chain].ticker, name: NATIVE[chain].name, qty: bal, price: 0 }];
  }

  const lists = await Promise.all(EVM_CHAINS.map((c) => blockscoutChain(c.base, address, c.native, c.nativeName)));
  const merged = new Map<string, Holding>();
  for (const list of lists) {
    for (const h of list) {
      const ex = merged.get(h.ticker);
      if (ex) { ex.qty += h.qty; if (!ex.price) ex.price = h.price; }
      else merged.set(h.ticker, { ...h });
    }
  }
  const out = [...merged.values()].filter((h) => h.qty > 0 && h.price > 0);
  out.sort((a, b) => b.qty * b.price - a.qty * a.price);
  return out.slice(0, 100);
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
