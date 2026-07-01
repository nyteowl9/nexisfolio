"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  totals,
  mv,
  costBasis,
  change24,
  change7d,
  fmtUSD,
  fmtPct,
  fmtQty,
  fmtDate,
  netWorthSeries,
  isUnitPriced,
  CLASSES,
  type Position,
  type AssetClass,
  type Range,
} from "@/lib/engine";
import { Donut, Area } from "@/components/ui/charts";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { Bolt, ArrowUp, ArrowDown, Chevron, Refresh } from "@/components/ui/icons";
import { refreshPrices } from "@/lib/db/refresh";
import { usePrefs } from "@/components/app/prefs-context";
import { GoalCard } from "@/components/app/GoalCard";
import type { Liability } from "@/lib/db/liabilities";
import type { Performance } from "@/lib/db/performance";

const LIQUID_CLASSES = new Set<AssetClass>(["crypto", "stocks", "cash", "metals"]);

const COLS = "1fr 104px 64px 64px 112px 116px 128px 16px";
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "var(--hair) solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow)",
};
const dateShort = (s?: string) =>
  s ? fmtDate(s).replace(", 2026", "").replace(", 2025", " '25") : "";

function MetricCard({ label, value, sub, subColor, valueColor }: { label: string; value: string; sub?: string; subColor?: string; valueColor?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: "17px 19px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 11 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", color: valueColor || "var(--ink)" }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 12.5, color: subColor || "var(--ink-2)", marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function pctCell(v: number | null) {
  return (
    <div className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: v != null ? (v >= 0 ? "var(--pos)" : "var(--neg)") : "var(--ink-3)" }}>
      {v != null ? fmtPct(v, true) : "—"}
    </div>
  );
}

function HoldingRow({ p }: { p: Position }) {
  const value = mv(p);
  const basis = costBasis(p);
  const pl = value - basis;
  const plPct = basis ? (pl / basis) * 100 : 0;
  const [hov, setHov] = useState(false);
  const sub = isUnitPriced(p.cls)
    ? `${fmtQty(p.qty ?? 0)} ${p.ticker}`
    : p.cls === "cash"
      ? p.apy != null ? `${p.account ?? ""} · ${p.apy}% APY` : p.account ?? ""
      : p.cls === "loans" && p.loan
        ? `${p.loan.rate}% APR · ${p.loan.paymentsMade} pmts`
        : p.grade
          ? `${p.grade} · valued ${dateShort(p.valued)}`
          : `valued ${dateShort(p.valued)}`;
  return (
    <Link
      href={`/detail/${p.id}`}
      className="nw-holding"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: 12, padding: "12px 22px 12px 24px", borderTop: "var(--hair) solid var(--border)", background: hov ? "var(--surface-2)" : "transparent", color: "var(--ink)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <AssetIcon cls={p.cls} ticker={p.ticker} name={p.name} size={36} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 550, color: "var(--ink)" }}>{p.name}</div>
          <div className={isUnitPriced(p.cls) ? "num" : ""} style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div className="num" style={{ textAlign: "right", fontSize: 13, color: "var(--ink)" }}>
        {isUnitPriced(p.cls) ? fmtUSD(p.price ?? 0, { full: true, cents: (p.price ?? 0) < 1000 }) : "—"}
      </div>
      {pctCell(change24(p))}
      {pctCell(change7d(p))}
      <div className="num" style={{ textAlign: "right", fontSize: 13, color: "var(--ink-3)" }}>{fmtUSD(basis)}</div>
      <div className="num" style={{ textAlign: "right", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(value)}</div>
      <div style={{ textAlign: "right" }}>
        <div className="num" style={{ fontSize: 13.5, fontWeight: 600, color: pl >= 0 ? "var(--pos)" : "var(--neg)" }}>{(pl >= 0 ? "+" : "−") + fmtUSD(Math.abs(pl))}</div>
        <div className="num" style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-3)", marginTop: 1 }}>{fmtPct(plPct, true)}</div>
      </div>
      <div style={{ color: hov ? "var(--ink-3)" : "transparent", display: "flex", justifyContent: "flex-end" }}><Chevron size={15} /></div>
    </Link>
  );
}

function subGroups(positions: Position[]) {
  const order = ["Art", "Watches", "Trading Cards", "Jewelry", "Other"];
  const map: Record<string, Position[]> = {};
  for (const p of positions) {
    const k = p.subcat || "Other";
    (map[k] = map[k] || []).push(p);
  }
  return Object.keys(map)
    .sort((a, b) => (order.indexOf(a) + 99 * (order.indexOf(a) < 0 ? 1 : 0)) - (order.indexOf(b) + 99 * (order.indexOf(b) < 0 ? 1 : 0)))
    .map((name) => ({
      name,
      positions: map[name].sort((a, b) => mv(b) - mv(a)),
      value: map[name].reduce((s, p) => s + mv(p), 0),
    }));
}

function UpdatePricesBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--ink-2)", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: pending ? "default" : "pointer", fontFamily: "var(--font-sans)", opacity: pending ? 0.6 : 1 }}
    >
      <span style={{ display: "inline-flex", animation: pending ? "allspin 0.7s linear infinite" : "none" }}>
        <Refresh size={13} />
      </span>
      {pending ? "Updating…" : "Update prices"}
    </button>
  );
}

const SPARK_DAYS: Record<Range, number> = { "1D": 1, "1W": 7, "1M": 30, "1Y": 365, ALL: 99999 };

interface TreeItem { key: AssetClass; label: string; color: string; value: number }
type Box = TreeItem & { x: number; y: number; w: number; h: number };
function squarify(items: TreeItem[], x: number, y: number, w: number, h: number): Box[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0, i = 0;
  for (; i < items.length - 1; i++) { if (acc + items[i].value >= total / 2) { i++; break; } acc += items[i].value; }
  const a = items.slice(0, i), b = items.slice(i);
  const aVal = a.reduce((s, it) => s + it.value, 0);
  if (w >= h) { const aw = w * (aVal / total); return [...squarify(a, x, y, aw, h), ...squarify(b, x + aw, y, w - aw, h)]; }
  const ah = h * (aVal / total); return [...squarify(a, x, y, w, ah), ...squarify(b, x, y + ah, w, h - ah)];
}

function Treemap({ data, total, activeKey, onSlice }: { data: TreeItem[]; total: number; activeKey: AssetClass | null; onSlice: (k: AssetClass | null) => void }) {
  const W = 760, H = 260;
  const boxes = squarify(data.slice().sort((a, b) => b.value - a.value), 0, 0, W, H);
  return (
    <svg className="nw-treemap" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {boxes.map((b) => {
        const pct = total ? (b.value / total) * 100 : 0;
        const big = b.w > 78 && b.h > 38;
        return (
          <g key={b.key} onMouseEnter={() => onSlice(b.key)} onMouseLeave={() => onSlice(null)} onClick={() => onSlice(activeKey === b.key ? null : b.key)} style={{ cursor: "pointer" }}>
            <rect x={b.x + 2} y={b.y + 2} width={Math.max(0, b.w - 4)} height={Math.max(0, b.h - 4)} rx={8} fill={b.color} opacity={activeKey && activeKey !== b.key ? 0.4 : 1} />
            {big && <text x={b.x + 13} y={b.y + 24} fill="#fff" fontSize={12.5} fontWeight={650}>{b.label}</text>}
            {big && <text x={b.x + 13} y={b.y + 42} fill="#fff" fontSize={12} opacity={0.9} className="num">{fmtUSD(b.value)} · {pct.toFixed(0)}%</text>}
          </g>
        );
      })}
    </svg>
  );
}

function MoverChip({ p }: { p: Position }) {
  const c = change24(p) ?? 0;
  const pos = c >= 0;
  return (
    <Link href={`/detail/${p.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "var(--surface-2)", border: "var(--hair) solid var(--border)", color: "var(--ink)" }}>
      <AssetIcon cls={p.cls} ticker={p.ticker} name={p.name} size={18} />
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.ticker && p.ticker !== "—" ? p.ticker : p.name}</span>
      <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: pos ? "var(--pos)" : "var(--neg)", display: "inline-flex", alignItems: "center", gap: 2 }}>
        {pos ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{fmtPct(c, true)}
      </span>
    </Link>
  );
}

export function Overview({ positions, history, debt = 0, liabilities = [], performance }: { positions: Position[]; history?: { date: string; net: number }[]; debt?: number; liabilities?: Liability[]; performance?: Performance | null }) {
  const { prefs } = usePrefs();
  const useBars = prefs.allocChart === "bars";
  const useTree = prefs.allocChart === "treemap";
  const [active, setActive] = useState<AssetClass | null>(null);
  const [range, setRange] = useState<Range>("1W");
  const t = totals(positions);
  const netWorth = t.net - debt;
  const cls = t.classes;

  // Net liquidity must reflect debt. Allocate each loan to a bucket by what
  // secures it: debt against an illiquid asset (e.g. mortgage) reduces
  // illiquid; debt against a liquid asset (e.g. crypto loan) or unsecured
  // debt reduces liquid. So Liquid/Illiquid + Loans out sum to net worth.
  let illiquidDebt = 0;
  for (const l of liabilities) {
    const coll = l.collateral_position_id ? positions.find((p) => p.id === l.collateral_position_id) : null;
    if (coll && !LIQUID_CLASSES.has(coll.cls)) illiquidDebt += l.balance || 0;
  }
  const liquidDebt = debt - illiquidDebt; // liquid-secured + unsecured
  const netLiquid = t.liquid - liquidDebt;
  const netIlliquid = t.illiquid - illiquidDebt;
  const pctOfNet = (v: number) => (netWorth ? Math.round((v / netWorth) * 100) : 0);
  const donutData = (Object.values(cls) as (typeof cls)[AssetClass][])
    .filter((c) => c.value > 0)
    .map((c) => ({ key: c.key, label: c.label, color: c.color, value: c.value }));
  // real reconstructed net-worth curve when available; else a synthetic line
  let spark: number[];
  if (history && history.length >= 2) {
    const startMs = Date.now() - SPARK_DAYS[range] * 864e5;
    const win = history.filter((h) => new Date(h.date).getTime() >= startMs);
    spark = (win.length >= 2 ? win : history).map((h) => h.net);
  } else {
    spark = netWorthSeries(t.net, range);
  }
  const groups = donutData
    .map((d) => ({ ...d, positions: cls[d.key].positions.slice().sort((a, b) => mv(b) - mv(a)) }))
    .filter((g) => !active || g.key === active);

  // today's movers (live holdings only)
  const moverList = positions
    .filter((p) => isUnitPriced(p.cls) && change24(p) != null)
    .sort((a, b) => (change24(b) ?? 0) - (change24(a) ?? 0));
  const gainers = moverList.filter((p) => (change24(p) ?? 0) > 0).slice(0, 2);
  const losers = moverList.filter((p) => (change24(p) ?? 0) < 0).slice(-2).reverse();

  // net-worth growth split: what you put in (cost basis) vs market gains
  const gains = t.net - t.basis;
  const contribPct = t.net > 0 ? Math.max(0, Math.min(100, (t.basis / t.net) * 100)) : 0;

  // holdings price-return vs S&P 500 over the selected range
  let bench: { port: number; sp: number } | null = null;
  if (performance && performance.port.length > 1) {
    const n = performance.port.length;
    const startIdx = SPARK_DAYS[range] >= 9999 ? 0 : Math.max(0, n - 1 - SPARK_DAYS[range]);
    const p0 = performance.port[startIdx], p1 = performance.port[n - 1];
    const s0 = performance.sp[startIdx], s1 = performance.sp[n - 1];
    if (p0 > 0 && s0 > 0) bench = { port: (p1 / p0 - 1) * 100, sp: (s1 / s0 - 1) * 100 };
  }

  // auto-generated insights (top few)
  const insights: { text: string; tone: "pos" | "neg" | "warn" | "info" }[] = [];
  const topClass = donutData.slice().sort((a, b) => b.value - a.value)[0];
  if (topClass && t.net > 0) {
    const p = (topClass.value / t.net) * 100;
    if (p >= 40) insights.push({ text: `${topClass.label} is ${p.toFixed(0)}% of your portfolio — concentrated.`, tone: "warn" });
  }
  if (history && history.length >= 2) {
    const monthAgo = Date.now() - 30 * 864e5;
    const win = history.filter((h) => new Date(h.date).getTime() >= monthAgo);
    if (win.length >= 2) {
      const ch = win[win.length - 1].net - win[0].net;
      insights.push({ text: `Net worth ${ch >= 0 ? "+" : "−"}${fmtUSD(Math.abs(ch))} over the last 30 days.`, tone: ch >= 0 ? "pos" : "neg" });
    }
  }
  if (bench) {
    const d = bench.port - bench.sp;
    insights.push({ text: `Your holdings are ${d >= 0 ? "beating" : "trailing"} the S&P by ${Math.abs(d).toFixed(1)} pts (${range}).`, tone: d >= 0 ? "pos" : "neg" });
  }
  const cashPct = t.net > 0 ? (cls.cash.value / t.net) * 100 : 0;
  if (cashPct >= 40) insights.push({ text: `${cashPct.toFixed(0)}% of your net worth is in cash — a lot of dry powder.`, tone: "info" });
  if (gainers[0] && insights.length < 3) insights.push({ text: `${gainers[0].ticker && gainers[0].ticker !== "—" ? gainers[0].ticker : gainers[0].name} is your top mover today, ${fmtPct(change24(gainers[0]) ?? 0, true)}.`, tone: "pos" });
  const insightColor = (tone: string) => tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : tone === "warn" ? "var(--c-crypto)" : "var(--c-stocks)";

  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 36px 64px" }}>
      {/* hero */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500, marginBottom: 8 }}>Total net worth</div>
          <div className="num" style={{ fontSize: 52, fontWeight: 650, letterSpacing: "-.035em", lineHeight: 1, color: "var(--ink)" }}>{fmtUSD(netWorth, { full: true })}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 600, color: t.change24 >= 0 ? "var(--pos)" : "var(--neg)" }}>
              {t.change24 >= 0 ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
              {fmtUSD(Math.abs(t.change24), { full: true })} ({fmtPct(t.changePct, true)})
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>today</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 6, fontSize: 12.5, color: "var(--pos)", fontWeight: 500 }}>
              <Bolt size={13} /> markets live
            </span>
          </div>
          {bench && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12.5, background: "var(--surface-2)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "6px 11px", width: "fit-content", maxWidth: "100%" }}>
              <span style={{ color: "var(--ink-3)" }}>{range} return</span>
              <span className="num" style={{ fontWeight: 700, color: bench.port >= 0 ? "var(--pos)" : "var(--neg)" }}>You {fmtPct(bench.port, true)}</span>
              <span style={{ color: "var(--ink-3)" }}>vs</span>
              <span className="num" style={{ fontWeight: 600, color: "var(--ink-2)" }}>S&amp;P {fmtPct(bench.sp, true)}</span>
              <span className="num" style={{ fontWeight: 600, color: bench.port - bench.sp >= 0 ? "var(--pos)" : "var(--neg)" }}>
                ({bench.port - bench.sp >= 0 ? "+" : "−"}{Math.abs(bench.port - bench.sp).toFixed(1)} pts)
              </span>
            </div>
          )}
        </div>
        <div className="nw-hero-right" style={{ textAlign: "right" }}>
          <div className="nw-hero-spark" style={{ marginBottom: 8 }}>
            <Area points={spark} width={320} height={70} color={t.change24 >= 0 ? "var(--pos)" : "var(--neg)"} />
          </div>
          <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
            {(["1D", "1W", "1M", "1Y", "ALL"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{ padding: "4px 12px", fontSize: 12, fontWeight: 550, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: r === range ? "var(--ink)" : "var(--ink-3)", background: r === range ? "var(--surface)" : "transparent", boxShadow: r === range ? "var(--shadow)" : "none" }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* insights */}
      {insights.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {insights.slice(0, 3).map((it, i) => (
            <div key={i} style={{ ...card, display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 14px", flex: "1 1 240px", minWidth: 220 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: insightColor(it.tone), flex: "none" }} />
              <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.4 }}>{it.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* metric band */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <MetricCard label="Liquid" value={fmtUSD(netLiquid)} sub={debt > 0 ? `${pctOfNet(netLiquid)}% of net worth · net of debt` : `${pctOfNet(netLiquid)}% of net worth`} />
        <MetricCard label="Illiquid" value={fmtUSD(netIlliquid)} sub={`${pctOfNet(netIlliquid)}% of net worth`} />
        <MetricCard label="Loans out" value={fmtUSD(t.loansOut)} sub={`${cls.loans.count} active note${cls.loans.count === 1 ? "" : "s"}`} />
        <MetricCard label="Cost basis" value={fmtUSD(t.basis)} sub="total invested" />
        {debt > 0 && <MetricCard label="Debt" value={"−" + fmtUSD(debt)} valueColor="var(--neg)" sub="owed" subColor="var(--neg)" />}
        <MetricCard label="Total P / L" value={(t.pl >= 0 ? "+" : "−") + fmtUSD(Math.abs(t.pl))} sub={fmtPct(t.plPct, true)} subColor={t.pl >= 0 ? "var(--pos)" : "var(--neg)"} />
      </div>

      {/* goal + movers + growth split */}
      <div className="nw-stack-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18, alignItems: "stretch" }}>
          <GoalCard net={netWorth} />
          <div style={{ ...card, padding: "15px 19px" }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 11 }}>Today&rsquo;s movers</div>
            {moverList.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No live holdings yet.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {gainers.map((p) => <MoverChip key={p.id} p={p} />)}
                {losers.map((p) => <MoverChip key={p.id} p={p} />)}
              </div>
            )}
          </div>
          <div style={{ ...card, padding: "15px 19px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 }}>
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>How your wealth was built</span>
              <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: gains >= 0 ? "var(--pos)" : "var(--neg)" }}>{gains >= 0 ? "+" : "−"}{fmtUSD(Math.abs(gains))} gains</span>
            </div>
            <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", background: "var(--bg-sunk)" }}>
              <div style={{ width: `${contribPct}%`, background: "var(--ink-3)" }} />
              <div style={{ width: `${100 - contribPct}%`, background: gains >= 0 ? "var(--pos)" : "var(--neg)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: "var(--ink-3)" }}>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--ink-3)", marginRight: 5 }} />You added {fmtUSD(t.basis)}</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: gains >= 0 ? "var(--pos)" : "var(--neg)", marginRight: 5 }} />Market {gains >= 0 ? "gains" : "losses"} {fmtUSD(Math.abs(gains))}</span>
            </div>
          </div>
      </div>

      {/* allocation */}
      <div className="nw-stack-2" style={{ ...card, padding: "24px 28px", marginBottom: 18, display: "grid", gridTemplateColumns: (useBars || useTree) ? "1fr" : "220px 1fr", gap: useTree ? 20 : 40, alignItems: "center" }}>
        {!useBars && !useTree && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Donut
              data={donutData}
              size={200}
              thickness={30}
              activeKey={active}
              onSlice={(k) => setActive(k as AssetClass)}
              centerTop="Allocation"
              centerMain={active ? `${((cls[active].value / t.net) * 100).toFixed(0)}%` : `${donutData.length}`}
              centerSub={active ? CLASSES[active].label : "classes"}
            />
          </div>
        )}
        {useTree && <Treemap data={donutData} total={t.net} activeKey={active} onSlice={setActive} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
          {donutData.map((d) => {
            const pct = (d.value / t.net) * 100;
            return (
              <div
                key={d.key}
                className="nw-alloc-row"
                onMouseEnter={() => setActive(d.key)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === d.key ? null : d.key)}
                style={{ display: "grid", gridTemplateColumns: "168px 1fr 110px 54px", alignItems: "center", gap: 16, padding: "10px", borderRadius: 8, cursor: "pointer", background: active === d.key ? "var(--bg-sunk)" : "transparent", opacity: active && active !== d.key ? 0.4 : 1, transition: "opacity .15s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flex: "none" }} />
                  <span style={{ fontSize: 13.5, fontWeight: active === d.key ? 600 : 500, color: "var(--ink)" }}>{d.label}</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: d.color, borderRadius: 99 }} />
                </div>
                <span className="num" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>{fmtUSD(d.value)}</span>
                <span className="num" style={{ fontSize: 12.5, color: "var(--ink-3)", textAlign: "right" }}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* holdings */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "var(--hair) solid var(--border)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            Holdings
            {active && <span style={{ color: "var(--ink-3)", fontWeight: 450 }}> · {CLASSES[active].label}</span>}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {active && (
              <button onClick={() => setActive(null)} style={{ fontSize: 12, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "none", padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Clear filter
              </button>
            )}
            <form action={refreshPrices}>
              <UpdatePricesBtn />
            </form>
          </div>
        </div>

        {/* column headers */}
        <div className="nw-holding" style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "9px 22px 9px 24px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface-2)" }}>
          {["Asset", "Price", "24h", "7d", "Cost basis", "Value", "Total return", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase", textAlign: i === 0 ? "left" : "right" }}>{h}</span>
          ))}
        </div>

        {groups.map((g) => (
          <div key={g.key}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 24px", background: "var(--surface-2)", borderTop: "var(--hair) solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: g.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{g.label}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{g.positions.length}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: cls[g.key].live ? "var(--pos)" : "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {cls[g.key].live ? <><Bolt size={11} /> live</> : "manual"}
                </span>
              </div>
              <span className="num" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(g.value)}</span>
            </div>
            {g.key === "private"
              ? subGroups(g.positions).map((sg) => (
                  <div key={sg.name}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 24px 7px 30px", borderTop: "var(--hair) solid var(--border)" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase" }}>{sg.name} · {sg.positions.length}</span>
                      <span className="num" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)" }}>{fmtUSD(sg.value)}</span>
                    </div>
                    {sg.positions.map((p) => <HoldingRow key={p.id} p={p} />)}
                  </div>
                ))
              : g.positions.map((p) => <HoldingRow key={p.id} p={p} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
