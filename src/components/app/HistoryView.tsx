"use client";

import { useState } from "react";
import { netWorthSeries, FLOW_MARKERS, fmtUSD, fmtPct, fmtDate, CLASSES, type Range, type AssetClass } from "@/lib/engine";
import { ArrowUp, ArrowDown } from "@/components/ui/icons";

export interface LedgerTx {
  id: string;
  tx_date: string;
  type: string;
  cls: AssetClass | null;
  ticker: string | null;
  name: string | null;
  qty: number | null;
  price: number | null;
  amount: number | null;
  account: string | null;
  source: string | null;
  note: string | null;
}

const RANGE_LABEL: Record<Range, string> = { "1D": "today", "1W": "past week", "1M": "past month", "1Y": "past year", ALL: "all time" };
const RANGE_OVER: Record<Range, string> = { "1D": "1 day", "1W": "1 week", "1M": "1 month", "1Y": "1 year", ALL: "9 years" };
const X_LABELS: Record<Range, string[]> = {
  "1D": ["9:30", "11", "1", "3", "4:00"],
  "1W": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "1M": ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
  "1Y": ["Jul", "Sep", "Nov", "Jan", "Mar", "May"],
  ALL: ["2017", "2019", "2021", "2023", "2025", "Now"],
};

const TX_COLORS: Record<string, string> = {
  buy: "var(--pos)", sell: "var(--neg)", deposit: "var(--c-stocks)", withdrawal: "var(--c-crypto)",
  dividend: "var(--c-realest)", valuation: "var(--c-private)", loan_payment: "var(--c-loans)", transfer: "var(--ink-3)",
};
const txAmount = (t: LedgerTx) => (t.qty != null && t.price != null ? t.qty * t.price : t.amount ?? 0);

function BigChart({ points, markers, color, range }: { points: number[]; markers: { t: number; type: "in" | "out"; amt: number; label: string }[]; color: string; range: Range }) {
  const W = 1100, H = 360, padL = 8, padB = 28;
  const [hover, setHover] = useState<number | null>(null);
  const min = Math.min(...points), max = Math.max(...points);
  const pad = (max - min) * 0.15 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL * 2);
  const y = (v: number) => H - padB - ((v - lo) / (hi - lo)) * (H - padB - 12);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H - padB} L${padL} ${H - padB} Z`;
  const ticks = 4;
  const gl = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * (i / ticks));
  const xlabels = X_LABELS[range] || [];

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          const px = ((ev.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / (W - padL * 2)) * (points.length - 1));
          if (i >= 0 && i < points.length) setHover(i);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="bigfill" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {gl.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padL} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.5} strokeDasharray={i === 0 ? "none" : "3 4"} />
            <text x={W - padL} y={y(v) - 5} textAnchor="end" fontSize={11} fill="var(--ink-3)" className="num">{fmtUSD(v)}</text>
          </g>
        ))}
        {xlabels.map((lab, i) => (
          <text key={i} x={padL + (i / (xlabels.length - 1)) * (W - padL * 2)} y={H - 8} textAnchor={i === 0 ? "start" : i === xlabels.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--ink-3)">{lab}</text>
        ))}
        <path d={area} fill="url(#bigfill)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {markers.map((m, i) => {
          const idx = Math.round(m.t * (points.length - 1));
          return (
            <g key={i}>
              <line x1={x(idx)} x2={x(idx)} y1={y(points[idx])} y2={20} stroke={m.type === "in" ? "var(--pos)" : "var(--neg)"} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
              <circle cx={x(idx)} cy={y(points[idx])} r={4} fill={m.type === "in" ? "var(--pos)" : "var(--neg)"} stroke="var(--surface)" strokeWidth={2} />
              <g transform={`translate(${Math.min(Math.max(x(idx), 60), W - 60)}, 14)`}>
                <rect x={-52} y={-11} width={104} height={22} rx={6} fill="var(--surface)" stroke="var(--border)" strokeWidth={0.5} />
                <text x={0} y={4} textAnchor="middle" fontSize={10.5} fill={m.type === "in" ? "var(--pos)" : "var(--neg)"} fontWeight={600} className="num">{`${m.type === "in" ? "+" : "−"}${fmtUSD(Math.abs(m.amt))} ${m.label}`}</text>
              </g>
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={12} y2={H - padB} stroke="var(--ink-3)" strokeWidth={0.5} />
            <circle cx={x(hover)} cy={y(points[hover])} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover != null && (
        <div style={{ position: "absolute", left: `${(x(hover) / W) * 100}%`, top: -8, transform: "translate(-50%,-100%)", background: "var(--ink)", color: "var(--accent-ink)", padding: "6px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none" }}>
          <span className="num">{fmtUSD(points[hover], { full: true })}</span>
        </div>
      )}
    </div>
  );
}

export function HistoryView({ net, transactions }: { net: number; transactions: LedgerTx[] }) {
  const [range, setRange] = useState<Range>("1Y");
  const points = netWorthSeries(net, range);
  const markers = FLOW_MARKERS[range] || [];
  const first = points[0], last = points[points.length - 1];
  const chg = last - first;
  const chgPct = first ? (chg / first) * 100 : 0;
  const ranges: Range[] = ["1D", "1W", "1M", "1Y", "ALL"];

  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 36px 64px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>Net worth · {RANGE_LABEL[range]}</div>
          <div className="num" style={{ fontSize: 40, fontWeight: 650, letterSpacing: "-.03em", lineHeight: 1 }}>{fmtUSD(last, { full: true })}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 600, color: chg >= 0 ? "var(--pos)" : "var(--neg)" }}>
              {chg >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{fmtUSD(Math.abs(chg), { full: true })} ({fmtPct(chgPct, true)})
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>over {RANGE_OVER[range]}</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-sunk)", padding: 4, borderRadius: 9 }}>
          {ranges.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: range === r ? "var(--ink)" : "var(--ink-3)", background: range === r ? "var(--surface)" : "transparent", boxShadow: range === r ? "var(--shadow)" : "none" }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "28px 28px 18px" }}>
        <BigChart points={points} markers={markers} color={chg >= 0 ? "var(--pos)" : "var(--neg)"} range={range} />
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
        {([["Period high", fmtUSD(Math.max(...points), { full: true })], ["Period low", fmtUSD(Math.min(...points), { full: true })], ["Net change", (chg >= 0 ? "+" : "−") + fmtUSD(Math.abs(chg), { full: true })], ["Avg / point", fmtUSD(chg / points.length, { full: true })]] as Array<[string, string]>).map(([l, v], i) => (
          <div key={i} style={{ flex: 1, minWidth: 150, background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", padding: "15px 18px", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 7 }}>{l}</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, color: i === 2 ? (chg >= 0 ? "var(--pos)" : "var(--neg)") : "var(--ink)" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* transactions ledger */}
      <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden", marginTop: 24 }}>
        <div style={{ padding: "16px 24px", borderBottom: "var(--hair) solid var(--border)", fontSize: 14, fontWeight: 600 }}>Transactions <span style={{ color: "var(--ink-3)", fontWeight: 450 }}>· {transactions.length}</span></div>
        {transactions.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No transactions yet.</div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="nw-tx" style={{ display: "grid", gridTemplateColumns: "92px 110px 1fr 1fr 140px", alignItems: "center", gap: 12, padding: "12px 24px", borderTop: "var(--hair) solid var(--border)" }}>
              <span className="num" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{fmtDate(t.tx_date).replace(", 2026", "").replace(", 2025", " '25")}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: TX_COLORS[t.type] || "var(--ink-2)", textTransform: "capitalize" }}>{t.type.replace("_", " ")}</span>
              <span style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>{t.name}{t.ticker && t.ticker !== "—" ? <span style={{ color: "var(--ink-3)", fontWeight: 450 }}> · {t.ticker}</span> : null}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{t.account}</span>
              <span className="num" style={{ textAlign: "right", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(txAmount(t), { full: true })}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
