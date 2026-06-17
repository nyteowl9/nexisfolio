"use client";

import { useEffect, useState } from "react";
import { fmtUSD, fmtQty, isUnitPriced, type AssetClass } from "@/lib/engine";
import { AddAssetForm } from "@/app/onboarding/AddAssetForm";
import { BulkAddTable } from "@/app/onboarding/BulkAddTable";
import { logTrade } from "@/lib/db/trades";

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const flabel = "mb-1 block text-xs font-semibold";

interface Pos { id: string; name: string; ticker: string | null; cls: AssetClass; qty: number | null }

function LogTradeForm() {
  const [positions, setPositions] = useState<Pos[]>([]);
  const [positionId, setPositionId] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    fetch("/api/positions").then((r) => r.json()).then((j) => {
      const tradeable = (j.positions as Pos[]).filter((p) => isUnitPriced(p.cls));
      setPositions(tradeable);
      if (tradeable[0]) setPositionId(tradeable[0].id);
    });
  }, []);

  const p = positions.find((x) => x.id === positionId);
  const q = parseFloat(qty) || 0;
  const pr = parseFloat(price) || 0;
  const newQty = side === "sell" ? Math.max(0, (p?.qty ?? 0) - q) : (p?.qty ?? 0) + q;

  if (positions.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No live (crypto/stock/metal) positions yet. Add one in the &ldquo;Add position&rdquo; tab first.</div>;
  }

  return (
    <form action={logTrade} className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 20, alignItems: "start" }}>
      <input type="hidden" name="from" value="/dashboard" />
      <input type="hidden" name="side" value={side} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "block" }}>
          <span className={flabel} style={{ color: "var(--ink-2)" }}>Position</span>
          <select name="positionId" value={positionId} onChange={(e) => setPositionId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {positions.map((h) => <option key={h.id} value={h.id}>{h.ticker} · {h.name} ({fmtQty(h.qty ?? 0)})</option>)}
          </select>
        </label>
        <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8, width: "fit-content" }}>
          {(["buy", "sell"] as const).map((s) => (
            <button type="button" key={s} onClick={() => setSide(s)} style={{ padding: "7px 18px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize", color: side === s ? "var(--ink)" : "var(--ink-3)", background: side === s ? "var(--surface)" : "transparent", boxShadow: side === s ? "var(--shadow)" : "none" }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label><span className={flabel} style={{ color: "var(--ink-2)" }}>Quantity</span><input name="qty" type="number" step="any" required value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} /></label>
          <label><span className={flabel} style={{ color: "var(--ink-2)" }}>Price</span><input name="price" type="number" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label><span className={flabel} style={{ color: "var(--ink-2)" }}>Date</span><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} /></label>
          <label><span className={flabel} style={{ color: "var(--ink-2)" }}>Account</span><input name="account" placeholder={p?.name} style={inputStyle} /></label>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          {side === "sell" ? "Log sale" : "Log buy"}
        </button>
      </div>
      <div style={{ background: "var(--surface-2)", border: "var(--hair) solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 11 }}>Preview</div>
        {[["Position", p ? `${p.ticker} · ${fmtQty(p.qty ?? 0)}` : "—"], [side === "sell" ? "Selling" : "Buying", `${fmtQty(q)} @ ${fmtUSD(pr, { full: true, cents: pr < 1000 })}`], ["New quantity", fmtQty(newQty)]].map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{k}</span>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: i === 2 ? (side === "sell" ? "var(--neg)" : "var(--pos)") : "var(--ink)" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 10, borderTop: "var(--hair) solid var(--border)" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>{side === "sell" ? "Proceeds" : "Cost"}</span>
          <span className="num" style={{ fontSize: 16, fontWeight: 700, color: side === "sell" ? "var(--neg)" : "var(--ink)" }}>{fmtUSD(q * pr, { full: true })}</span>
        </div>
      </div>
    </form>
  );
}

export function AddTradeModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"add" | "bulk" | "trade">("add");
  const tab = (m: "add" | "bulk" | "trade", label: string) => (
    <button onClick={() => setMode(m)} style={{ padding: "8px 4px", fontSize: 14, fontWeight: mode === m ? 700 : 500, color: mode === m ? "var(--ink)" : "var(--ink-3)", background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "var(--ink)" : "transparent"}`, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "relative", width: 660, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0" }}>
          <div style={{ display: "flex", gap: 22 }}>{tab("add", "Add position")}{tab("bulk", "Add multiple")}{tab("trade", "Log trade")}</div>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: "var(--ink-2)", fontSize: 17 }}>✕</button>
        </div>
        <div style={{ borderBottom: "var(--hair) solid var(--border)", marginTop: 14 }} />
        <div style={{ padding: "22px 24px" }}>
          {mode === "add" ? (
            <>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14 }}>Add any asset. Crypto/stocks/metals auto-price; everything else by value.</p>
              <AddAssetForm redirectTo="/dashboard" />
            </>
          ) : mode === "bulk" ? (
            <BulkAddTable />
          ) : (
            <LogTradeForm />
          )}
        </div>
      </div>
    </div>
  );
}
