/**
 * Curated symbol directory for stocks/ETFs and metals, with typo-tolerant
 * fuzzy search (ported from the prototype's searchSymbols). Crypto search is
 * live via CoinGecko; these classes use a static directory + live Yahoo quotes.
 */
import type { AssetClass } from "@/lib/engine";

export interface DirEntry {
  ticker: string;
  name: string;
  cls: AssetClass;
  /** Yahoo Finance symbol for live quotes */
  yahoo: string;
}

const STOCKS: Array<[string, string]> = [
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["GOOGL", "Alphabet (Class A)"],
  ["AMZN", "Amazon"], ["META", "Meta Platforms"], ["TSLA", "Tesla"], ["BRK-B", "Berkshire Hathaway"],
  ["JPM", "JPMorgan Chase"], ["V", "Visa"], ["MA", "Mastercard"], ["UNH", "UnitedHealth"],
  ["XOM", "Exxon Mobil"], ["JNJ", "Johnson & Johnson"], ["WMT", "Walmart"], ["PG", "Procter & Gamble"],
  ["HD", "Home Depot"], ["COST", "Costco"], ["NFLX", "Netflix"], ["AMD", "Advanced Micro Devices"],
  ["DIS", "Disney"], ["BAC", "Bank of America"], ["KO", "Coca-Cola"], ["PEP", "PepsiCo"],
  ["ADBE", "Adobe"], ["CRM", "Salesforce"], ["INTC", "Intel"], ["ORCL", "Oracle"],
  ["AVGO", "Broadcom"], ["LLY", "Eli Lilly"],
  // ETFs
  ["VTI", "Vanguard Total Stock Market ETF"], ["VOO", "Vanguard S&P 500 ETF"],
  ["SPY", "SPDR S&P 500 ETF"], ["QQQ", "Invesco QQQ Trust"], ["VEA", "Vanguard FTSE Dev Markets"],
  ["VXUS", "Vanguard Total Intl Stock"], ["BND", "Vanguard Total Bond"], ["SCHD", "Schwab US Dividend"],
  ["ARKK", "ARK Innovation ETF"], ["IWM", "iShares Russell 2000"],
];

const METALS: Array<[string, string, string]> = [
  ["XAU", "Gold (spot, per oz)", "GC=F"],
  ["XAG", "Silver (spot, per oz)", "SI=F"],
  ["XPT", "Platinum (per oz)", "PL=F"],
  ["XPD", "Palladium (per oz)", "PA=F"],
  ["HG", "Copper (per lb)", "HG=F"],
];

export const DIRECTORY: Record<"stocks" | "metals", DirEntry[]> = {
  stocks: STOCKS.map(([ticker, name]) => ({ ticker, name, cls: "stocks", yahoo: ticker })),
  metals: METALS.map(([ticker, name, yahoo]) => ({ ticker, name, cls: "metals", yahoo })),
};

/** Yahoo symbol for a given class+ticker (stocks use the ticker as-is). */
export function yahooSymbol(cls: AssetClass, ticker: string): string | null {
  if (cls === "stocks") return ticker;
  if (cls === "metals") return DIRECTORY.metals.find((d) => d.ticker === ticker)?.yahoo ?? null;
  return null;
}

function lev(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Typo-tolerant search over a directory list. */
export function searchDirectory(list: DirEntry[], q: string, limit = 6): DirEntry[] {
  const query = (q || "").trim().toLowerCase();
  if (!query) return [];
  return list
    .map((d) => {
      const t = d.ticker.toLowerCase();
      const n = d.name.toLowerCase();
      let s = 99;
      if (t === query || n === query) s = 0;
      else if (t.startsWith(query) || n.startsWith(query)) s = 1;
      else if (t.includes(query) || n.includes(query)) s = 2;
      else s = 3 + Math.min(lev(query, t), lev(query, n)) * 0.5;
      return { d, s };
    })
    .filter((x) => x.s < 7)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.d);
}
