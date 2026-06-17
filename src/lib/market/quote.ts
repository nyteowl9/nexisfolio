/**
 * Live market quotes — SERVER-SIDE ONLY.
 * Crypto via CoinGecko, stocks/metals via Yahoo Finance. Returns current price
 * and previous close (for 24h change). No API keys required (rate-limited).
 */
import type { AssetClass } from "@/lib/engine";
import { yahooSymbol } from "./directory";

export interface Quote {
  price: number;
  prev: number;
}

const YH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; NexisFolio/1.0)" };

/** Resolve a CoinGecko coin id from a symbol (used when no providerId given). */
export async function resolveCoinId(symbol: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
      { next: { revalidate: 3600 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { coins?: Array<{ id: string; symbol: string }> };
    const sym = symbol.toLowerCase();
    const exact = j.coins?.find((c) => c.symbol.toLowerCase() === sym);
    return (exact ?? j.coins?.[0])?.id ?? null;
  } catch {
    return null;
  }
}

async function cryptoQuote(coinId: string): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const row = j[coinId];
    if (!row?.usd) return null;
    const chg = row.usd_24h_change ?? 0;
    return { price: row.usd, prev: row.usd / (1 + chg / 100) };
  } catch {
    return null;
  }
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: YH_HEADERS, next: { revalidate: 30 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }> };
    };
    const meta = j.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (price == null) return null;
    return { price, prev: meta?.chartPreviousClose ?? meta?.previousClose ?? price };
  } catch {
    return null;
  }
}

/**
 * Fetch a live quote for an asset.
 * @param providerId optional CoinGecko coin id (preferred for crypto accuracy).
 */
export async function fetchQuote(
  cls: AssetClass,
  ticker: string,
  providerId?: string
): Promise<Quote | null> {
  if (cls === "crypto") {
    const id = providerId || (await resolveCoinId(ticker));
    return id ? cryptoQuote(id) : null;
  }
  if (cls === "stocks" || cls === "metals") {
    const sym = yahooSymbol(cls, ticker) ?? ticker;
    return yahooQuote(sym);
  }
  return null;
}
