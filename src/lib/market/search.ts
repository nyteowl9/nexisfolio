/**
 * Symbol search — SERVER-SIDE ONLY.
 * Crypto: live via CoinGecko. Stocks/metals: typo-tolerant curated directory.
 */
import type { AssetClass } from "@/lib/engine";
import { DIRECTORY, searchDirectory } from "./directory";

export interface SymbolResult {
  cls: AssetClass;
  ticker: string;
  name: string;
  /** provider id (CoinGecko coin id) for accurate quotes; undefined for directory entries */
  providerId?: string;
  logo?: string;
}

async function searchCrypto(q: string): Promise<SymbolResult[]> {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as {
      coins?: Array<{ id: string; symbol: string; name: string; thumb?: string; large?: string }>;
    };
    return (j.coins ?? []).slice(0, 8).map((c) => ({
      cls: "crypto" as const,
      ticker: c.symbol.toUpperCase(),
      name: c.name,
      providerId: c.id,
      logo: c.large || c.thumb,
    }));
  } catch {
    return [];
  }
}

/** Search symbols for an asset class. Returns [] for non-priced classes. */
export async function searchSymbols(cls: AssetClass, q: string): Promise<SymbolResult[]> {
  if (!q.trim()) return [];
  if (cls === "crypto") return searchCrypto(q);
  if (cls === "stocks" || cls === "metals")
    return searchDirectory(DIRECTORY[cls], q).map((d) => ({
      cls: d.cls,
      ticker: d.ticker,
      name: d.name,
    }));
  return [];
}
