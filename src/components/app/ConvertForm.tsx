"use client";

import { useEffect, useRef, useState } from "react";
import { fmtUSD, fmtQty, isUnitPriced, type AssetClass } from "@/lib/engine";
import { convert } from "@/lib/db/trades";

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const flabel = "mb-1 block text-xs font-semibold";

interface Pos { id: string; name: string; ticker: string | null; cls: AssetClass; qty: number | null }
interface Pick { cls: string; ticker: string; name: string; providerId?: string }

const NEW_CLASSES: Array<[AssetClass, string]> = [["crypto", "Crypto"], ["stocks", "Stocks"], ["metals", "Metals"]];

function NewAssetSearch({ cls, onPick }: { cls: AssetClass; onPick: (p: Pick | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/symbols?cls=${cls}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults(j.results ?? []);
      setOpen(true);
    }, 220);
    return () => clearTimeout(t);
  }, [q, cls]);
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input value={q} onChange={(e) => { setQ(e.target.value); onPick(null); }} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search — e.g. bitcoin, NVDA, gold…" style={inputStyle} />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", zIndex: 10, marginTop: 4, maxHeight: 220, overflowY: "auto", width: "100%", borderRadius: 8, border: "var(--hair) solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          {results.map((r) => (
            <button type="button" key={r.cls + r.ticker + (r.providerId ?? "")} onMouseDown={() => { onPick(r); setQ(`${r.ticker} · ${r.name}`); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 11px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}>
              <b>{r.ticker}</b> <span style={{ color: "var(--ink-3)" }}>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConvertForm() {
  const [positions, setPositions] = useState<Pos[]>([]);
  const [fromId, setFromId] = useState("");
  const [amount, setAmount] = useState("");
  const [toMode, setToMode] = useState<"existing" | "new">("existing");
  const [toId, setToId] = useState("");
  const [newCls, setNewCls] = useState<AssetClass>("crypto");
  const [picked, setPicked] = useState<Pick | null>(null);

  useEffect(() => {
    fetch("/api/positions").then((r) => r.json()).then((j) => {
      const ps = (j.positions as Pos[]) ?? [];
      setPositions(ps);
      if (ps[0]) setFromId(ps[0].id);
      const other = ps.find((p) => p.id !== ps[0]?.id);
      if (other) setToId(other.id);
    });
  }, []);

  const from = positions.find((p) => p.id === fromId);
  const toOptions = positions.filter((p) => p.id !== fromId);
  const toSel = toOptions.find((p) => p.id === toId);
  const fromUnit = !!from && isUnitPriced(from.cls);
  const toUnit = toMode === "new" ? true : !!toSel && isUnitPriced(toSel.cls);
  const amt = parseFloat(amount) || 0;
  const ready = !!fromId && amt > 0 && (toMode === "existing" ? !!toId && toId !== fromId : !!picked);

  const label = (t: string) => <span className={flabel} style={{ color: "var(--ink-2)" }}>{t}</span>;
  const posLabel = (p: Pos) => `${p.ticker && p.ticker !== "—" ? p.ticker + " · " : ""}${p.name}${isUnitPriced(p.cls) && p.qty != null ? ` (${fmtQty(p.qty)})` : ""}`;

  return (
    <form action={convert}>
      <input type="hidden" name="from" value="/dashboard" />
      <input type="hidden" name="toMode" value={toMode} />
      {toMode === "new" && picked && (
        <>
          <input type="hidden" name="toCls" value={picked.cls} />
          <input type="hidden" name="toTicker" value={picked.ticker} />
          <input type="hidden" name="toName" value={picked.name} />
          <input type="hidden" name="toProviderId" value={picked.providerId ?? ""} />
        </>
      )}

      <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16 }}>Move value from one holding into another in one step — e.g. sell cash to buy Bitcoin. Selling crypto/stocks/metals records a taxable disposal.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "block" }}>
          {label("From")}
          <select name="fromId" value={fromId} onChange={(e) => setFromId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {positions.map((p) => <option key={p.id} value={p.id}>{posLabel(p)}</option>)}
          </select>
        </label>

        <label style={{ display: "block" }}>
          {label("Amount (USD)")}
          <input name="amount" type="number" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" style={inputStyle} />
        </label>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            {label("To")}
            <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
              {(["existing", "new"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setToMode(m)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize", color: toMode === m ? "var(--ink)" : "var(--ink-3)", background: toMode === m ? "var(--surface)" : "transparent", boxShadow: toMode === m ? "var(--shadow)" : "none" }}>{m === "existing" ? "A holding" : "New asset"}</button>
              ))}
            </div>
          </div>
          {toMode === "existing" ? (
            <select name="toId" value={toId} onChange={(e) => setToId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {toOptions.length === 0 && <option value="">No other holdings — use “New asset”</option>}
              {toOptions.map((p) => <option key={p.id} value={p.id}>{posLabel(p)}</option>)}
            </select>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8, width: "fit-content" }}>
                {NEW_CLASSES.map(([c, l]) => (
                  <button type="button" key={c} onClick={() => { setNewCls(c); setPicked(null); }} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: newCls === c ? "var(--ink)" : "var(--ink-3)", background: newCls === c ? "var(--surface)" : "transparent", boxShadow: newCls === c ? "var(--shadow)" : "none" }}>{l}</button>
                ))}
              </div>
              <NewAssetSearch cls={newCls} onPick={setPicked} />
            </div>
          )}
        </div>

        <label style={{ display: "block" }}>
          {label("Date")}
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
        </label>

        {(fromUnit || toUnit) && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: fromUnit && toUnit ? "1fr 1fr" : "1fr", gap: 12 }}>
              {fromUnit && <label>{label("Sell price (optional)")}<input name="fromPrice" type="number" step="any" placeholder="live" style={inputStyle} /></label>}
              {toUnit && <label>{label("Buy price (optional)")}<input name="toPrice" type="number" step="any" placeholder="live" style={inputStyle} /></label>}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.4 }}>Leave blank to use today&rsquo;s live price. For a past-dated conversion, enter the price you actually got and set the date above.</div>
          </div>
        )}

        {from && amt > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", background: "var(--surface-2)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
            Converting <b style={{ color: "var(--ink)" }}>{fmtUSD(amt)}</b> from {from.ticker && from.ticker !== "—" ? from.ticker : from.name} into {toMode === "new" ? (picked ? picked.ticker : "your chosen asset") : posLabel(toOptions.find((p) => p.id === toId) ?? ({} as Pos)) || "a holding"}{isUnitPriced(from.cls) ? " · taxable disposal" : ""}.
          </div>
        )}

        <button disabled={!ready} style={{ padding: 11, background: ready ? "var(--accent)" : "var(--bg-sunk)", color: ready ? "var(--accent-ink)" : "var(--ink-3)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: ready ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}>
          Convert
        </button>
      </div>
    </form>
  );
}
