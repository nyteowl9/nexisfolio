"use client";

import { useRef, useState } from "react";
import { addPositionsBulk, type BulkRow } from "@/lib/db/positions";
import { parseCsv, mapBrokerageRows } from "@/lib/csv";
import type { AssetClass } from "@/lib/engine";

type Row = { cls: AssetClass; ticker: string; qty: string; cost: string; date: string };
const blank = (): Row => ({ cls: "crypto", ticker: "", qty: "", cost: "", date: "" });

// CSS-var colors with light fallbacks → works in the themed app (incl. dark) AND on onboarding.
const cell: React.CSSProperties = { width: "100%", padding: "8px 9px", border: "1px solid var(--border-strong, #D8DADD)", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", background: "var(--surface-2, #FBFBFC)", color: "var(--ink, #15171A)", boxSizing: "border-box" };
const muted = "var(--ink-3, #8A9099)";

export function BulkAddTable({ onDone }: { onDone?: () => void } = {}) {
  const [rows, setRows] = useState<Row[]>([blank(), blank(), blank()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.ticker.trim() && parseFloat(r.qty) > 0).length;

  const importCsv = async (file: File) => {
    setError("");
    const text = await file.text();
    const mapped = mapBrokerageRows(parseCsv(text));
    if (!mapped.length) {
      setError("Couldn't find holdings in that file — needs Symbol and Quantity columns (try your broker's positions/portfolio export).");
      return;
    }
    setRows(mapped.map((m) => ({ cls: m.cls, ticker: m.ticker, qty: String(m.qty), cost: m.costPerUnit != null ? String(Math.round(m.costPerUnit * 100) / 100) : "", date: "" })));
  };

  const submit = async () => {
    const payload: BulkRow[] = rows
      .filter((r) => r.ticker.trim() && parseFloat(r.qty) > 0)
      .map((r) => ({ cls: r.cls, ticker: r.ticker.trim(), qty: parseFloat(r.qty), costPerUnit: r.cost ? parseFloat(r.cost) : undefined, acquiredDate: r.date || undefined }));
    if (!payload.length) return;
    setError("");
    setPending(true);
    try {
      // verify every symbol resolves to a live price before adding (no silent $0 rows)
      const checks = await Promise.all(
        payload.map(async (r) => {
          const res = await fetch(`/api/quote?cls=${r.cls}&ticker=${encodeURIComponent(r.ticker!)}`);
          const j = await res.json();
          return { ticker: r.ticker!, ok: !!(j.quote && j.quote.price) };
        })
      );
      const bad = checks.filter((c) => !c.ok).map((c) => c.ticker);
      if (bad.length) {
        setError(`Couldn't find a price for: ${bad.join(", ")}. Check the symbol — e.g. BTC / ETH (crypto), AAPL / VTI (stocks), XAU / XAG (metals).`);
        setPending(false);
        return;
      }
      if (onDone) {
        // in-app modal: add without redirect, then let the parent refresh + close
        await addPositionsBulk(payload, false);
        onDone();
      } else {
        await addPositionsBulk(payload); // onboarding: redirects on success
      }
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12.5, color: muted, marginBottom: 12 }}>
        Add several market holdings at once — or <b style={{ color: "var(--ink, #15171A)" }}>Import broker CSV</b> to
        pull them from an E-Trade / Fidelity / Schwab positions export. Live price fills in automatically.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.9fr 1fr 1.1fr 28px", gap: 8, fontSize: 10.5, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
        <span>Class</span><span>Ticker</span><span>Qty</span><span>Cost/unit</span><span>Acquired</span><span />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.9fr 1fr 1.1fr 28px", gap: 8, alignItems: "center" }}>
            <select value={r.cls} onChange={(e) => setRow(i, { cls: e.target.value as AssetClass })} style={{ ...cell, cursor: "pointer" }}>
              <option value="crypto">Crypto</option>
              <option value="stocks">Stocks</option>
              <option value="metals">Metals</option>
            </select>
            <input value={r.ticker} onChange={(e) => setRow(i, { ticker: e.target.value.toUpperCase() })} placeholder="BTC" style={cell} />
            <input value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} type="number" step="any" placeholder="0" style={cell} />
            <input value={r.cost} onChange={(e) => setRow(i, { cost: e.target.value })} type="number" step="any" placeholder="opt." style={cell} />
            <input value={r.date} onChange={(e) => setRow(i, { date: e.target.value })} type="date" style={cell} />
            <button onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))} title="Remove row" style={{ background: "transparent", border: "none", color: muted, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      {error && <div style={{ fontSize: 12, color: "var(--neg, #E0443E)", marginTop: 10, lineHeight: 1.4 }}>{error}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={() => setRows((rs) => [...rs, blank()])} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2, #5C6168)", background: "var(--bg-sunk, #F2F3F4)", border: "1px solid var(--border, #E7E8EA)", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit" }}>+ Add row</button>
        <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2, #5C6168)", background: "var(--bg-sunk, #F2F3F4)", border: "1px solid var(--border, #E7E8EA)", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit" }}>Import broker CSV</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
        <button onClick={submit} disabled={pending || filled === 0} style={{ marginLeft: "auto", padding: "9px 18px", background: filled ? "var(--accent, #15171A)" : "var(--bg-sunk, #F2F3F4)", color: filled ? "var(--accent-ink, #fff)" : muted, border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: filled && !pending ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {pending ? "Adding…" : `Add ${filled || ""} asset${filled === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
