/**
 * Read-only wallet balances — SERVER-SIDE ONLY.
 * Reads the NATIVE coin balance from public endpoints (no API key, no private
 * keys, no signing). ERC-20 / SPL token enumeration needs an indexer API
 * (Alchemy/Covalent/Helius) and comes later.
 */
export type Chain = "btc" | "eth" | "sol";

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
