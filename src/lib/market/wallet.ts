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

/**
 * EVM ERC-20 balances WITH USD prices via Blockscout's public API — free, no
 * key. Keeps only priced tokens with a real market cap (filters spam/airdrops),
 * sorts by value and caps the count; the user's dust threshold trims the rest.
 */
async function blockscoutEvmTokens(address: string): Promise<Holding[]> {
  try {
    const r = await fetch(`https://eth.blockscout.com/api/v2/addresses/${encodeURIComponent(address)}/token-balances`, { cache: "no-store" });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = (Array.isArray(j) ? j : j?.items ?? []) as BlockscoutItem[];
    const out: Holding[] = [];
    for (const it of arr) {
      const t = it.token ?? {};
      if (t.type && t.type !== "ERC-20") continue;
      const dec = Number(t.decimals ?? 18);
      const qty = Number(it.value ?? 0) / 10 ** dec;
      const price = Number(t.exchange_rate ?? 0);
      const mcap = Number(t.circulating_market_cap ?? 0);
      const ticker = (t.symbol || "").toUpperCase();
      if (ticker && qty > 0 && price > 0 && mcap >= MIN_MARKET_CAP) out.push({ ticker, name: t.name || ticker, qty, price });
    }
    out.sort((a, b) => b.qty * b.price - a.qty * a.price);
    return out.slice(0, 100);
  } catch {
    return [];
  }
}

/**
 * All holdings for a wallet: native coin always, plus ERC-20 tokens on EVM
 * (free, keyless via Blockscout). Native price is left 0 for the caller to fill
 * from its own quote source; token prices come from the indexer.
 */
export async function fetchHoldings(chain: Chain, address: string): Promise<Holding[]> {
  const out: Holding[] = [];
  const native = await fetchNativeBalance(chain, address);
  if (native != null && native > 0) out.push({ ticker: NATIVE[chain].ticker, name: NATIVE[chain].name, qty: native, price: 0 });
  if (chain === "eth") out.push(...(await blockscoutEvmTokens(address)));
  return out;
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
