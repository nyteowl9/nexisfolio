"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { netWorthSeries, fmtUSD, fmtPct, fmtDate, CLASSES, type Range, type AssetClass } from "@/lib/engine";
import { ArrowUp, ArrowDown } from "@/components/ui/icons";
import { addTransaction, updateTransaction, deleteTransaction } from "@/lib/db/transactions";
import type { Snap } from "@/lib/db/snapshots";

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
const RANGE_DAYS: Record<Range, number> = { "1D": 1, "1W": 7, "1M": 30, "1Y": 365, ALL: 100000 };
const DAYMS = 864e5;
const parseLocal = (s: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s);
const isoLocal = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TX_COLORS: Record<string, string> = {
  buy: "var(--pos)", sell: "var(--neg)", deposit: "var(--c-stocks)", withdrawal: "var(--c-crypto)",
  dividend: "var(--c-realest)", valuation: "var(--c-private)", loan_payment: "var(--c-loans)", transfer: "var(--ink-3)",
};
const txAmount = (t: LedgerTx) => (t.qty != null && t.price != null ? t.qty * t.price : t.amount ?? 0);

interface TxMarker { t: number; type: "in" | "out"; amt: number; label: string; date: string }

function BigChart({ points, markers, color, dates }: { points: number[]; markers: TxMarker[]; color: string; dates: string[] }) {
  const W = 1100, H = 360, padL = 8, padB = 28;
  const [hover, setHover] = useState<number | null>(null);
  const [mHover, setMHover] = useState<number | null>(null);
  const min = Math.min(...points), max = Math.max(...points);
  const pad = (max - min) * 0.15 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL * 2);
  const y = (v: number) => H - padB - ((v - lo) / (hi - lo)) * (H - padB - 12);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H - padB} L${padL} ${H - padB} Z`;
  const ticks = 4;
  const gl = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * (i / ticks));
  // x-axis labels derived from the REAL dates of the series
  const spanDays = dates.length > 1 ? (parseLocal(dates[dates.length - 1]).getTime() - parseLocal(dates[0]).getTime()) / DAYMS : 0;
  const fmtTick = (s: string) => {
    const d = parseLocal(s);
    if (spanDays > 700) return String(d.getFullYear());
    if (spanDays > 80) return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const tickCount = Math.min(6, dates.length);
  const tickIdx = Array.from({ length: tickCount }, (_, i) => Math.round((i / Math.max(1, tickCount - 1)) * (dates.length - 1)));

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
        {tickIdx.map((idx, i) => (
          <text key={i} x={x(idx)} y={H - 8} textAnchor={i === 0 ? "start" : i === tickCount - 1 ? "end" : "middle"} fontSize={11} fill="var(--ink-3)">{i === tickCount - 1 ? "Now" : fmtTick(dates[idx])}</text>
        ))}
        <path d={area} fill="url(#bigfill)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {markers.map((m, i) => {
          const idx = Math.round(m.t * (points.length - 1));
          const c = m.type === "in" ? "var(--pos)" : "var(--neg)";
          return (
            <g key={i} onMouseEnter={() => setMHover(i)} onMouseLeave={() => setMHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={x(idx)} cy={y(points[idx])} r={mHover === i ? 6 : 4} fill={c} stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(idx)} cy={y(points[idx])} r={11} fill="transparent" />
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
      {mHover != null && (() => {
        const m = markers[mHover];
        const idx = Math.round(m.t * (points.length - 1));
        return (
          <div style={{ position: "absolute", left: `${(x(idx) / W) * 100}%`, top: `${(y(points[idx]) / H) * 100}%`, transform: "translate(-50%,-118%)", background: "var(--surface)", border: "var(--hair) solid var(--border-strong)", borderRadius: 9, boxShadow: "var(--shadow)", padding: "8px 11px", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 3 }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{fmtDate(m.date).replace(", 2026", "").replace(", 2025", " '25")}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{m.label}</div>
            <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: m.type === "in" ? "var(--pos)" : "var(--neg)" }}>{m.type === "in" ? "+" : "−"}{fmtUSD(Math.abs(m.amt), { full: true })}</div>
          </div>
        );
      })()}
    </div>
  );
}

const TX_TYPES = ["buy", "sell", "deposit", "withdrawal", "dividend", "valuation", "loan_payment", "transfer"];
const CLS_LIST = ["crypto", "stocks", "metals", "realest", "private", "cash", "loans"];
const dInput: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const dLabel: React.CSSProperties = { fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6, display: "block" };

function TxDrawer({ tx, onClose, onSaved }: { tx: LedgerTx | "new"; onClose: () => void; onSaved: () => void }) {
  const e = tx === "new" ? null : tx;
  const [type, setType] = useState<string>(e?.type ?? "buy");
  const [qty, setQty] = useState<string>(e?.qty != null ? String(e.qty) : "");
  const [price, setPrice] = useState<string>(e?.price != null ? String(e.price) : "");
  const [amount, setAmount] = useState<string>(e?.amount != null ? String(e.amount) : "");
  const perUnit = type === "buy" || type === "sell";
  const computedAmount = perUnit ? (parseFloat(qty) || 0) * (parseFloat(price) || 0) : parseFloat(amount) || 0;
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (<label style={{ display: "block" }}><span style={dLabel}>{label}</span>{children}</label>);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{e ? "Edit transaction" : "Add transaction"}</span>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15 }}>✕</button>
        </div>
        <form action={async (fd) => { if (e) await updateTransaction(fd); else await addTransaction(fd); onClose(); onSaved(); }} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          {e && <input type="hidden" name="id" value={e.id} />}
          <input type="hidden" name="amount" value={computedAmount || ""} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Date"><input name="tx_date" type="date" defaultValue={e?.tx_date ?? new Date().toISOString().slice(0, 10)} style={dInput} /></F>
            <F label="Type"><select name="type" value={type} onChange={(ev) => setType(ev.target.value)} style={{ ...dInput, cursor: "pointer" }}>{TX_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select></F>
          </div>
          <F label="Name"><input name="name" defaultValue={e?.name ?? ""} placeholder="Bitcoin / HYSA · Marcus" style={dInput} /></F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Asset class"><select name="cls" defaultValue={e?.cls ?? "crypto"} style={{ ...dInput, cursor: "pointer" }}>{CLS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}</select></F>
            <F label="Ticker"><input name="ticker" defaultValue={e?.ticker ?? ""} placeholder="BTC" style={dInput} /></F>
          </div>
          {perUnit ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <F label="Quantity"><input name="qty" type="number" step="any" value={qty} onChange={(ev) => setQty(ev.target.value)} style={dInput} /></F>
                <F label="Price / unit"><input name="price" type="number" step="any" value={price} onChange={(ev) => setPrice(ev.target.value)} style={dInput} /></F>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Total: <span className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(computedAmount, { full: true })}</span> (qty × price)</div>
            </>
          ) : (
            <F label="Amount (total $)"><input value={amount} onChange={(ev) => setAmount(ev.target.value)} type="number" step="any" style={dInput} /></F>
          )}
          <F label="Account"><input name="account" defaultValue={e?.account ?? ""} style={dInput} /></F>
          <F label="Note"><input name="note" defaultValue={e?.note ?? ""} style={dInput} /></F>
          <button style={{ padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{e ? "Save changes" : "Add transaction"}</button>
        </form>
        {e && (
          <form action={async (fd) => { await deleteTransaction(fd); onClose(); onSaved(); }} style={{ padding: "0 22px 22px" }}>
            <input type="hidden" name="id" value={e.id} />
            <button style={{ width: "100%", padding: 10, background: "var(--bg-sunk)", color: "var(--neg)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{(e.note ?? "").startsWith("Converted") ? "Undo conversion (both legs)" : "Delete transaction"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export function HistoryView({ net, snapshots, transactions }: { net: number; snapshots: Snap[]; transactions: LedgerTx[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<LedgerTx | "new" | null>(null);
  const [range, setRange] = useState<Range>("1Y");

  const nowMs = Date.now();
  const sorted = snapshots; // {date,net}[] ascending (reconstruction or recorded)
  const earliestMs = sorted.length ? parseLocal(sorted[0].date).getTime() : nowMs - 365 * DAYMS;
  const startMs = range === "ALL" ? earliestMs : Math.max(earliestMs, nowMs - RANGE_DAYS[range] * DAYMS);

  // real windowed series when we have data; else a dated synthetic estimate
  const realWin = sorted.filter((s) => parseLocal(s.date).getTime() >= startMs - DAYMS);
  const isReal = realWin.length >= 2;
  let series: { date: string; net: number }[];
  if (isReal) {
    series = realWin;
  } else {
    const vals = netWorthSeries(net, range);
    const synStart = range === "ALL" ? nowMs - 365 * DAYMS : nowMs - RANGE_DAYS[range] * DAYMS;
    series = vals.map((v, i) => ({ date: isoLocal(synStart + (i / Math.max(1, vals.length - 1)) * (nowMs - synStart)), net: v }));
  }
  const points = series.map((s) => s.net);
  const seriesDates = series.map((s) => s.date);
  const seriesMs = seriesDates.map((d) => parseLocal(d).getTime());
  const idxForDate = (ts: number) => {
    let bi = 0, bd = Infinity;
    seriesMs.forEach((d, i) => { const dd = Math.abs(d - ts); if (dd < bd) { bd = dd; bi = i; } });
    return bi;
  };

  const INFLOW = new Set(["sell", "deposit", "dividend", "loan_payment"]);
  const markers: TxMarker[] = transactions
    .filter((t) => { const d = parseLocal(t.tx_date).getTime(); return d >= seriesMs[0] - DAYMS && d <= nowMs + DAYMS; })
    .map((t) => ({
      t: Math.min(1, Math.max(0, idxForDate(parseLocal(t.tx_date).getTime()) / Math.max(1, points.length - 1))),
      type: (INFLOW.has(t.type) ? "in" : "out") as "in" | "out",
      amt: txAmount(t),
      label: `${t.type.replace("_", " ")} · ${t.name ?? t.ticker ?? ""}`.trim(),
      date: t.tx_date,
    }));

  const first = points[0], last = points[points.length - 1];
  const chg = last - first;
  const chgPct = first ? (chg / first) * 100 : 0;
  const spanDays = (seriesMs[seriesMs.length - 1] - seriesMs[0]) / DAYMS;
  const spanText = spanDays < 2 ? "today" : spanDays < 45 ? `${Math.round(spanDays)} days` : spanDays < 400 ? `${Math.round(spanDays / 30)} months` : `${(spanDays / 365).toFixed(1)} years`;
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
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>over {spanText}</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-sunk)", padding: 4, borderRadius: 9 }}>
          {ranges.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: range === r ? "var(--ink)" : "var(--ink-3)", background: range === r ? "var(--surface)" : "transparent", boxShadow: range === r ? "var(--shadow)" : "none" }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "28px 28px 18px" }}>
        <BigChart points={points} markers={markers} color={chg >= 0 ? "var(--pos)" : "var(--neg)"} dates={seriesDates} />
        {!isReal && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
            Estimated trend, anchored to today&apos;s net worth — daily history is now recording and replaces this as it builds.
          </div>
        )}
        {isReal && range === "ALL" && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
            History reconstructed from your holdings × prices; free price data goes back ~1 year, so it can&apos;t show earlier.
          </div>
        )}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "var(--hair) solid var(--border)" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Transactions <span style={{ color: "var(--ink-3)", fontWeight: 450 }}>· {transactions.length}</span></span>
          <button onClick={() => setDrawer("new")} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add transaction</button>
        </div>
        {transactions.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No transactions yet.</div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} onClick={() => setDrawer(t)} className="nw-tx" style={{ display: "grid", gridTemplateColumns: "92px 110px 1fr 1fr 140px", alignItems: "center", gap: 12, padding: "12px 24px", borderTop: "var(--hair) solid var(--border)", cursor: "pointer" }}>
              <span className="num" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{fmtDate(t.tx_date).replace(", 2026", "").replace(", 2025", " '25")}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: TX_COLORS[t.type] || "var(--ink-2)", textTransform: "capitalize" }}>{t.type.replace("_", " ")}</span>
              <span style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>{t.name}{t.ticker && t.ticker !== "—" ? <span style={{ color: "var(--ink-3)", fontWeight: 450 }}> · {t.ticker}</span> : null}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{t.account}</span>
              <span className="num" style={{ textAlign: "right", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(txAmount(t), { full: true })}</span>
            </div>
          ))
        )}
      </div>

      {drawer && <TxDrawer tx={drawer} onClose={() => setDrawer(null)} onSaved={() => router.refresh()} />}
    </div>
  );
}
