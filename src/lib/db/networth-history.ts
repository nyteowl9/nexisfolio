import type { SupabaseClient } from "@supabase/supabase-js";
import { isUnitPriced, mv, type AssetClass, type Position } from "@/lib/engine";
import { fetchPriceSeriesDated } from "@/lib/market/history";
import type { Liability } from "@/lib/db/liabilities";

const DAY = 864e5;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface DispRow {
  ticker: string | null;
  cls: AssetClass;
  qty: number;
  sold_date: string;
}

export interface NetPoint {
  date: string;
  net: number;
}

/**
 * Reconstruct daily net worth from the user's actual holdings timeline
 * (lots + disposals) × real historical prices. Market assets (crypto/stocks/
 * metals) show true volatility; manual assets are held flat at current value
 * from their acquisition date. Capped to ~2 years for performance.
 */
export async function reconstructNetWorth(supabase: SupabaseClient, positions: Position[], liabilities: Liability[] = []): Promise<NetPoint[]> {
  const market = positions.filter((p) => isUnitPriced(p.cls) && p.ticker && p.ticker !== "—" && (p.lots?.length ?? 0) > 0);

  const dates: number[] = [];
  for (const p of positions) for (const l of p.lots ?? []) dates.push(new Date(l.date).getTime());
  const { data: dz } = await supabase.from("disposals").select("ticker,cls,qty,sold_date");
  const disposals = (dz ?? []) as DispRow[];
  for (const d of disposals) dates.push(new Date(d.sold_date).getTime());
  if (!dates.length) return [];

  const todayMs = Date.now();
  let startMs = Math.min(...dates);
  const cap = todayMs - 365 * DAY; // free price history is limited to ~1y
  if (startMs < cap) startMs = cap;
  startMs = new Date(iso(startMs)).getTime();

  const nDays = Math.min(366, Math.max(2, Math.floor((todayMs - startMs) / DAY) + 1));
  const grid: number[] = [];
  for (let i = 0; i < nDays; i++) grid.push(startMs + i * DAY);

  // forward-filled daily price array (aligned to grid) per market position
  const priceByPos: Record<string, number[]> = {};
  await Promise.all(
    market.map(async (p) => {
      const series = await fetchPriceSeriesDated(p.cls, p.ticker!);
      const arr = new Array<number>(nDays).fill(0);
      if (series && series.length) {
        const s = series.slice().sort((a, b) => a.date.localeCompare(b.date));
        let si = 0;
        let last = s[0].price;
        for (let i = 0; i < nDays; i++) {
          const dStr = iso(grid[i]);
          while (si < s.length && s[si].date <= dStr) { last = s[si].price; si++; }
          arr[i] = last;
        }
      } else {
        arr.fill(p.price ?? 0);
      }
      priceByPos[p.id] = arr;
    })
  );

  const manual = positions.filter((p) => !isUnitPriced(p.cls));
  const manualEarliest: Record<string, number> = {};
  for (const p of manual) {
    const ds = (p.lots ?? []).map((l) => new Date(l.date).getTime());
    if (p.valued) ds.push(new Date(p.valued).getTime());
    manualEarliest[p.id] = ds.length ? Math.min(...ds) : startMs;
  }

  const out: NetPoint[] = [];
  for (let i = 0; i < nDays; i++) {
    const dMs = grid[i];
    let net = 0;
    for (const p of market) {
      let qty = 0;
      for (const l of p.lots ?? []) if (new Date(l.date).getTime() <= dMs) qty += l.qty;
      for (const d of disposals) if (d.cls === p.cls && d.ticker === p.ticker && new Date(d.sold_date).getTime() <= dMs) qty -= d.qty;
      net += Math.max(0, qty) * (priceByPos[p.id]?.[i] ?? 0);
    }
    for (const p of manual) if (manualEarliest[p.id] <= dMs) net += mv(p);
    // subtract debt owed (from origination date; balance held flat)
    for (const l of liabilities) {
      const since = l.originated ? new Date(l.originated).getTime() : startMs;
      if (since <= dMs) net -= l.balance || 0;
    }
    out.push({ date: iso(dMs), net: Math.round(net) });
  }
  return out;
}
