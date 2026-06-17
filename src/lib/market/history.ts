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

export interface DatedPrice {
  date: string;
  price: number;
}

async function cryptoSeries(coinId: string, days: number): Promise<DatedPrice[] | null> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { next: { revalidate: 21600 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { prices?: [number, number][] };
    const out = (j.prices ?? []).map((p) => ({ date: new Date(p[0]).toISOString().slice(0, 10), price: p[1] }));
    return out.length ? out : null;
  } catch {
    return null;
  }
}

async function yahooSeries(symbol: string, range: string): Promise<DatedPrice[] | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
      { headers: YH_HEADERS, next: { revalidate: 21600 } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const res = j.chart?.result?.[0];
    const ts = res?.timestamp ?? [];
    const closes = res?.indicators?.quote?.[0]?.close ?? [];
    const out: DatedPrice[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c != null && Number.isFinite(c)) out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), price: c });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** Dated daily price series (oldest → newest) for portfolio history reconstruction. */
export async function fetchPriceSeriesDated(
  cls: AssetClass,
  ticker: string,
  providerId?: string,
  days = 730
): Promise<DatedPrice[] | null> {
  if (cls === "crypto") {
    const id = providerId || (await resolveCoinId(ticker));
    return id ? cryptoSeries(id, Math.min(days, 365)) : null; // CoinGecko free = 365d max
  }
  if (cls === "stocks" || cls === "metals") {
    const sym = yahooSymbol(cls, ticker) ?? ticker;
    return yahooSeries(sym, "1y");
  }
  return null;
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
