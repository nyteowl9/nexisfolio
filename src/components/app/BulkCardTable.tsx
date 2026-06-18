"use client";

import { useState } from "react";
import { fmtUSD } from "@/lib/engine";
import { GAMES } from "@/lib/sample/sample-data";
import { addCardItemsBulk, type BulkCardRow } from "@/lib/db/cards";
import { Plus, Check } from "@/components/ui/icons";

// Type presets: sealed (boxes/cases/bundles — name carries the detail) + the
// common graded tiers + raw. Maps each label to the stored item shape.
const TYPES: Array<{ label: string; type: BulkCardRow["type"]; grader?: string; grade?: string }> = [
  { label: "Sealed", type: "sealed" },
  { label: "PSA 10", type: "graded", grader: "PSA", grade: "10" },
  { label: "PSA 9", type: "graded", grader: "PSA", grade: "9" },
  { label: "BGS 9.5", type: "graded", grader: "BGS", grade: "9.5" },
  { label: "BGS 10", type: "graded", grader: "BGS", grade: "10" },
  { label: "CGC 10", type: "graded", grader: "CGC", grade: "10" },
  { label: "Raw single", type: "raw" },
];

type Row = { name: string; game: string; typeIdx: number; qty: string; paid: string; value: string };
const blank = (): Row => ({ name: "", game: "op", typeIdx: 0, qty: "1", paid: "", value: "" });

const cell: React.CSSProperties = { width: "100%", padding: "8px 9px", border: "var(--hair) solid var(--border-strong)", borderRadius: 7, fontSize: 12.5, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const COLS = "1.9fr 1fr 1fr 0.55fr 0.85fr 0.85fr 26px";

export function BulkCardTable({ positionId, onAdded, onClose }: { positionId: string; onAdded: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([blank(), blank(), blank(), blank()]);
  const [pending, setPending] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const valid = rows.filter((r) => r.name.trim() && parseFloat(r.qty) > 0);
  const totVal = valid.reduce((s, r) => s + (parseFloat(r.value) || 0) * (parseFloat(r.qty) || 0), 0);
  const totPaid = valid.reduce((s, r) => s + (parseFloat(r.paid) || 0) * (parseFloat(r.qty) || 0), 0);
  const pl = totVal - totPaid;

  const submit = async () => {
    if (!valid.length) return;
    setPending(true);
    const payload: BulkCardRow[] = valid.map((r) => {
      const t = TYPES[r.typeIdx];
      return {
        name: r.name.trim(),
        game: r.game || null,
        type: t.type,
        grader: t.grader ?? null,
        grade: t.grade ?? null,
        qty: parseFloat(r.qty),
        basis: parseFloat(r.paid) || 0,
        value: parseFloat(r.value) || (parseFloat(r.paid) || 0),
      };
    });
    const n = await addCardItemsBulk(positionId, payload);
    setDoneCount((c) => c + (n || 0));
    setRows([blank(), blank(), blank(), blank()]);
    setPending(false);
    onAdded();
  };

  return (
    <div style={{ padding: 22, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Import your collection</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, maxWidth: 560, lineHeight: 1.5 }}>
            One row per item — sealed boxes, cases, bundles, or graded singles. Enter what you paid and
            today&rsquo;s value (you can update values anytime). Auto-pricing for singles lives under
            &ldquo;Search catalog.&rdquo;
          </div>
        </div>
        {doneCount > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--pos)", fontWeight: 600, whiteSpace: "nowrap" }}><Check size={14} /> {doneCount} added</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
        <span>Item</span><span>Game</span><span>Type</span><span>Qty</span><span>Paid (ea)</span><span>Value (ea)</span><span />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center" }}>
            <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="e.g. OP-05 Booster Box" style={cell} />
            <select value={r.game} onChange={(e) => setRow(i, { game: e.target.value })} style={{ ...cell, cursor: "pointer" }}>
              {Object.values(GAMES).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              <option value="">Other</option>
            </select>
            <select value={r.typeIdx} onChange={(e) => setRow(i, { typeIdx: Number(e.target.value) })} style={{ ...cell, cursor: "pointer" }}>
              {TYPES.map((t, ti) => <option key={t.label} value={ti}>{t.label}</option>)}
            </select>
            <input value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} type="number" step="any" min="1" style={cell} />
            <input value={r.paid} onChange={(e) => setRow(i, { paid: e.target.value })} type="number" step="any" placeholder="0" style={cell} />
            <input value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} type="number" step="any" placeholder="= paid" style={cell} />
            <button onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))} title="Remove row" style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <button onClick={() => setRows((rs) => [...rs, blank()])} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add row</button>
        {valid.length > 0 && (
          <div className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {valid.length} item{valid.length === 1 ? "" : "s"} · value <b style={{ color: "var(--ink)" }}>{fmtUSD(totVal, { full: true })}</b> · cost {fmtUSD(totPaid, { full: true })} ·{" "}
            <span style={{ color: pl >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600 }}>{pl >= 0 ? "+" : "−"}{fmtUSD(Math.abs(pl), { full: true })}</span>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {doneCount > 0 && <button onClick={onClose} style={{ padding: "9px 16px", background: "var(--bg-sunk)", color: "var(--ink)", border: "var(--hair) solid var(--border)", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Done</button>}
          <button onClick={submit} disabled={pending || valid.length === 0} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: valid.length ? "var(--accent)" : "var(--bg-sunk)", color: valid.length ? "var(--accent-ink)" : "var(--ink-3)", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: valid.length && !pending ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}>
            <Plus size={15} />{pending ? "Adding…" : `Add ${valid.length || ""} item${valid.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
