import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getLiabilities } from "@/lib/db/liabilities";
import { getSnapshots } from "@/lib/db/snapshots";
import { mv, change24, totals, fmtUSD } from "@/lib/engine";

export interface Alert { id: string; level: "danger" | "warn" | "pos" | "neg" | "info"; title: string; detail: string; href: string }

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ alerts: [] });

  const positions = await getPortfolio(supabase);
  const liabilities = await getLiabilities(supabase);
  const alerts: Alert[] = [];

  // Crypto-loan / margin liquidation risk (the standout alert)
  for (const l of liabilities) {
    if (!l.collateral_position_id) continue;
    const coll = positions.find((p) => p.id === l.collateral_position_id);
    if (!coll) continue;
    const cv = mv(coll);
    if (cv <= 0) continue;
    const ltv = (l.balance / cv) * 100;
    const liq = l.liq_ltv ?? (l.kind === "crypto_loan" || l.kind === "margin" ? 80 : null);
    if (!liq) continue;
    const collLabel = coll.ticker && coll.ticker !== "—" ? coll.ticker : coll.name;
    const dropToLiq = Math.max(0, (1 - ltv / liq) * 100);
    if (ltv / liq >= 0.9) alerts.push({ id: `ltv-${l.id}`, level: "danger", title: `${l.name} near liquidation`, detail: `LTV ${ltv.toFixed(0)}% of ${liq}% limit — a ${dropToLiq.toFixed(0)}% drop in ${collLabel} would liquidate.`, href: "/dashboard" });
    else if (ltv / liq >= 0.75) alerts.push({ id: `ltv-${l.id}`, level: "warn", title: `${l.name} LTV is elevated`, detail: `LTV ${ltv.toFixed(0)}% of the ${liq}% limit · ${dropToLiq.toFixed(0)}% buffer.`, href: "/dashboard" });
  }

  // Big movers today (±8%)
  for (const p of positions) {
    const c = change24(p);
    if (c != null && Math.abs(c) >= 8) {
      const label = p.ticker && p.ticker !== "—" ? p.ticker : p.name;
      alerts.push({ id: `mv-${p.id}`, level: c >= 0 ? "pos" : "neg", title: `${label} ${c >= 0 ? "up" : "down"} ${Math.abs(c).toFixed(1)}% today`, detail: `Now ${fmtUSD(mv(p))}.`, href: `/detail/${p.id}` });
    }
  }

  // Net worth at an all-time high
  const snaps = await getSnapshots(supabase);
  const net = totals(positions).net;
  if (snaps.length >= 3) {
    const max = Math.max(...snaps.map((s) => s.net));
    if (net >= max * 0.999) alerts.push({ id: "ath", level: "pos", title: "Net worth at an all-time high", detail: fmtUSD(net), href: "/history" });
  }

  const rank: Record<string, number> = { danger: 0, warn: 1, neg: 2, pos: 3, info: 4 };
  alerts.sort((a, b) => (rank[a.level] ?? 9) - (rank[b.level] ?? 9));
  return NextResponse.json({ alerts: alerts.slice(0, 12) });
}
