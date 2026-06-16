/**
 * Synthetic net-worth series for the hero sparkline (deterministic).
 * Ported from the prototype's history(). Production will replace this with
 * persisted daily net_worth_snapshots.
 */
export type Range = "1D" | "1W" | "1M" | "1Y" | "ALL";

export function netWorthSeries(net: number, range: Range = "1W"): number[] {
  const cfg =
    {
      "1D": { n: 48, drift: 0.004, vol: 0.0009 },
      "1W": { n: 56, drift: 0.012, vol: 0.004 },
      "1M": { n: 60, drift: 0.03, vol: 0.006 },
      "1Y": { n: 73, drift: 0.22, vol: 0.012 },
      ALL: { n: 96, drift: 0.78, vol: 0.02 },
    }[range] || { n: 60, drift: 0.03, vol: 0.006 };
  const start = net / (1 + cfg.drift);
  let seed = 20260608;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pts: number[] = [];
  for (let i = 0; i < cfg.n; i++) {
    const t = i / (cfg.n - 1);
    const trend = start + (net - start) * t;
    const wiggle = (rnd() - 0.45) * trend * cfg.vol * (1 - t * 0.3);
    pts.push(Math.max(0, trend + wiggle));
  }
  if (pts.length) pts[pts.length - 1] = net;
  return pts;
}

/** Large deposit/withdrawal markers on the history chart (demo, per range). */
export const FLOW_MARKERS: Partial<Record<Range, { t: number; type: "in" | "out"; amt: number; label: string }[]>> = {
  "1Y": [
    { t: 0.18, type: "in", amt: 9000, label: "Bonus" },
    { t: 0.52, type: "out", amt: -12000, label: "Car repair" },
    { t: 0.81, type: "in", amt: 6000, label: "Tax refund" },
  ],
  ALL: [
    { t: 0.22, type: "in", amt: 45000, label: "Home down-payment" },
    { t: 0.55, type: "in", amt: 18000, label: "401(k) rollover" },
    { t: 0.88, type: "out", amt: -9000, label: "Withdrawal" },
  ],
};

/** Deterministic sparkline for a watchlist symbol (demo until real history). */
export function spark(sym: string, price: number): number[] {
  let seed = 0;
  for (const ch of sym) seed = (seed * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: number[] = [];
  let v = price * (0.82 + rnd() * 0.12);
  for (let i = 0; i < 32; i++) {
    v = v + (price - v) * 0.05 + (rnd() - 0.48) * price * 0.03;
    out.push(Math.max(price * 0.5, v));
  }
  out[out.length - 1] = price;
  return out;
}
