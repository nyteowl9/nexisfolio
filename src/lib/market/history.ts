/**
 * Real historical price series — SERVER-SIDE ONLY.
 * Crypto via CoinGecko market_chart, stocks/metals via Yahoo chart. Returns an
 * array of closing prices (oldest → newest) for the asset-detail chart.
 */
import type { AssetClass } from "@/lib/engine";
import { resolveCoinId } from "./quote";
import { yahooSymbol } from "./directory";

const YH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; NexisFolio/1.0)" };

async function cryptoHistory(coinId: string, days: number): Promise<number[] | null> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { next: { revalidate: 3600 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { prices?: [number, number][] };
    const pts = (j.prices ?? []).map((p) => p[1]).filter((n) => Number.isFinite(n));
    return pts.length > 2 ? pts : null;
  } catch {
    return null;
  }
}

async function yahooHistory(symbol: string, range: string): Promise<number[] | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
      { headers: YH_HEADERS, next: { revalidate: 3600 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const closes = j.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const pts = closes.filter((n): n is number => n != null && Number.isFinite(n));
    return pts.length > 2 ? pts : null;
  } catch {
    return null;
  }
}

/** Real daily closing prices for a holding (≈1 year). null if unavailable. */
export async function fetchPriceHistory(
  cls: AssetClass,
  ticker: string,
  providerId?: string,
  days = 365
): Promise<number[] | null> {
  if (cls === "crypto") {
    const id = providerId || (await resolveCoinId(ticker));
    return id ? cryptoHistory(id, days) : null;
  }
  if (cls === "stocks" || cls === "metals") {
    const sym = yahooSymbol(cls, ticker) ?? ticker;
    return yahooHistory(sym, "1y");
  }
  return null;
}
