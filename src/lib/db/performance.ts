import { isUnitPriced, type Position } from "@/lib/engine";
import { fetchPriceSeriesDated } from "@/lib/market/history";

const DAY = 864e5;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface Performance {
  dates: string[];
  /** portfolio market value over time using CURRENT quantities (price-only,
   *  no contributions) — so it's a fair, time-weighted comparison to an index */
  port: number[];
  /** S&P 500 closes aligned to the same dates */
  sp: number[];
}

/** Forward-fill a dated series onto a daily grid. */
function fill(series: { date: string; price: number }[] | null, grid: number[]): number[] {
  const out = new Array(grid.length).fill(0);
  if (!series || !series.length) return out;
  const s = series.slice().sort((a, b) => a.date.localeCompare(b.date));
  let si = 0, last = s[0].price;
  for (let i = 0; i < grid.length; i++) {
    const d = iso(grid[i]);
    while (si < s.length && s[si].date <= d) { last = s[si].price; si++; }
    out[i] = last;
  }
  return out;
}

/**
 * Build ~1y daily price indices for the user's market holdings (at current
 * quantities) and the S&P 500, for a benchmark comparison. Returns null if
 * there are no live holdings. All fetches are module-cached.
 */
export async function marketPerformance(positions: Position[]): Promise<Performance | null> {
  const market = positions.filter((p) => isUnitPriced(p.cls) && p.ticker && p.ticker !== "—" && (p.qty ?? 0) > 0);
  if (!market.length) return null;

  const todayMs = Date.now();
  const startMs = new Date(iso(todayMs - 365 * DAY)).getTime();
  const nDays = Math.floor((todayMs - startMs) / DAY) + 1;
  const grid: number[] = [];
  for (let i = 0; i < nDays; i++) grid.push(startMs + i * DAY);

  const port = new Array(nDays).fill(0);
  await Promise.all(
    market.map(async (p) => {
      const series = await fetchPriceSeriesDated(p.cls, p.ticker!);
      const arr = fill(series, grid);
      for (let i = 0; i < nDays; i++) port[i] += arr[i] * (p.qty ?? 0);
    })
  );
  if (!port.some((v) => v > 0)) return null;

  const spSeries = await fetchPriceSeriesDated("stocks", "^GSPC");
  const sp = fill(spSeries, grid);

  return { dates: grid.map(iso), port, sp };
}
