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

const COLS = "1fr 64px 64px 116px 118px 132px 16px";
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "var(--hair) solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow)",
};
const dateShort = (s?: string) =>
  s ? fmtDate(s).replace(", 2026", "").replace(", 2025", " '25") : "";

function MetricCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: "17px 19px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500, marginBottom: 11 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)" }}>{value}</div>
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

export function Overview({ positions }: { positions: Position[] }) {
  const [active, setActive] = useState<AssetClass | null>(null);
  const [range, setRange] = useState<Range>("1W");
  const t = totals(positions);
  const cls = t.classes;
  const donutData = (Object.values(cls) as (typeof cls)[AssetClass][])
    .filter((c) => c.value > 0)
    .map((c) => ({ key: c.key, label: c.label, color: c.color, value: c.value }));
  const spark = netWorthSeries(t.net, range);
  const groups = donutData
    .map((d) => ({ ...d, positions: cls[d.key].positions.slice().sort((a, b) => mv(b) - mv(a)) }))
    .filter((g) => !active || g.key === active);

  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 36px 64px" }}>
      {/* hero */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500, marginBottom: 8 }}>Total net worth</div>
          <div className="num" style={{ fontSize: 52, fontWeight: 650, letterSpacing: "-.035em", lineHeight: 1, color: "var(--ink)" }}>{fmtUSD(t.net, { full: true })}</div>
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
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: 8 }}>
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

      {/* metric band */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <MetricCard label="Liquid" value={fmtUSD(t.liquid)} sub={`${t.net ? ((t.liquid / t.net) * 100).toFixed(0) : 0}% of net worth`} />
        <MetricCard label="Illiquid" value={fmtUSD(t.illiquid)} sub={`${t.net ? ((t.illiquid / t.net) * 100).toFixed(0) : 0}% of net worth`} />
        <MetricCard label="Loans out" value={fmtUSD(t.loansOut)} sub={`${cls.loans.count} active note${cls.loans.count === 1 ? "" : "s"}`} />
        <MetricCard label="Cost basis" value={fmtUSD(t.basis)} sub="total invested" />
        <MetricCard label="Total P / L" value={(t.pl >= 0 ? "+" : "−") + fmtUSD(Math.abs(t.pl))} sub={fmtPct(t.plPct, true)} subColor={t.pl >= 0 ? "var(--pos)" : "var(--neg)"} />
      </div>

      {/* allocation */}
      <div className="nw-stack-2" style={{ ...card, padding: "24px 28px", marginBottom: 18, display: "grid", gridTemplateColumns: "220px 1fr", gap: 40, alignItems: "center" }}>
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
          {["Asset", "24h", "7d", "Cost basis", "Value", "Total return", ""].map((h, i) => (
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
