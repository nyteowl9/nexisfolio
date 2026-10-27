"use client";

import { useEffect, useMemo, useState } from "react";
import { applyBulkEdit, loadBulkRows, type BulkAdd, type BulkEditRow, type BulkUpdate } from "@/lib/db/bulk-edit";
import { CLASSES, fmtUSD, fmtQty, isUnitPriced, type AssetClass } from "@/lib/engine";

/** Existing position + the user's edits (kept as strings so typing stays smooth). */
type EditRow = { base: BulkEditRow; cls: AssetClass; ticker: string; name: string; account: string; qty: string; cost: string; value: string; costBasis: string; del: boolean };
/** A brand-new position typed into the bottom of the grid. */
type NewRow = { key: number; cls: AssetClass; ticker: string; name: string; account: string; qty: string; cost: string; date: string; value: string; costBasis: string; subcat: string };

const COLS = "26px 118px 1.5fr 1fr 0.95fr 0.95fr 92px 0.9fr";
const CLASS_ORDER: AssetClass[] = ["crypto", "stocks", "metals", "cash", "realest", "private", "loans"];
const SUBCATS = ["Other", "Art", "Watches", "Jewelry", "Vehicles", "Business"];

const cell: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box", minWidth: 0 };
const changed: React.CSSProperties = { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" };
const numCell: React.CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const chip: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" };
const ghostBtn: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit" };

const fmt = (n: number | null | undefined, digits = 2) => (n == null || !Number.isFinite(n) ? "" : String(Math.round(n * 10 ** digits) / 10 ** digits));
const parse = (s: string): number | undefined => {
  const t = s.replace(/[$,\s]/g, "");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const toEdit = (b: BulkEditRow): EditRow => ({
  base: b,
  cls: b.cls,
  ticker: b.ticker ?? "",
  name: b.name,
  account: b.account ?? "",
  qty: b.unit ? fmt(b.qty, 8) : "",
  cost: b.unit ? fmt(b.avgCost) : "",
  value: b.unit ? "" : fmt(b.value),
  costBasis: b.unit ? "" : fmt(b.costBasis),
  del: false,
});
/** Why a row can't be applied yet (e.g. reclassed to market without a ticker). */
const rowProblem = (r: EditRow): string | null => {
  if (r.del) return null;
  const unit = isUnitPriced(r.cls);
  if (unit && !r.ticker.trim()) return "ticker needed";
  if (unit && !r.base.unit && !((parse(r.qty) ?? 0) > 0)) return "qty needed";
  return null;
};
let nextKey = 1;
const blankNew = (cls: AssetClass = "stocks"): NewRow => ({ key: nextKey++, cls, ticker: "", name: "", account: "", qty: "", cost: "", date: "", value: "", costBasis: "", subcat: "Other" });

/** Diff one edited row against its original → the update payload (or null if untouched). */
function diffRow(r: EditRow): BulkUpdate | null {
  const b = r.base;
  const u: BulkUpdate = { id: b.id };
  let dirty = false;
  const unit = isUnitPriced(r.cls);
  const crossing = unit !== b.unit; // market ↔ manual: every field counts
  if (r.cls !== b.cls) { u.cls = r.cls; dirty = true; }
  if (r.name.trim() && r.name.trim() !== b.name) { u.name = r.name.trim(); dirty = true; }
  if ((r.account.trim() || null) !== (b.account ?? null)) { u.account = r.account.trim() || null; dirty = true; }
  if (unit) {
    const t = r.ticker.trim().toUpperCase();
    if (t && t !== (b.ticker ?? "")) { u.ticker = t; dirty = true; }
    const q = parse(r.qty);
    if (q != null && (crossing || Math.abs(q - b.qty) > 1e-9)) { u.qty = q; dirty = true; }
    const c = parse(r.cost);
    if (c != null && (crossing || (b.lotCount <= 1 && Math.abs(c - (b.avgCost ?? NaN)) > 1e-9))) { u.costPerUnit = c; dirty = true; }
  } else if (b.itemCount === 0) {
    const v = parse(r.value);
    if (v != null && (crossing || Math.abs(v - b.value) > 1e-9)) { u.value = v; dirty = true; }
    if (r.cls !== "cash") {
      const cb = r.costBasis.trim() ? parse(r.costBasis) ?? null : null;
      if (crossing ? cb != null : (cb ?? null) !== (b.costBasis ?? null)) { u.costBasis = cb; dirty = true; }
    }
  }
  if (dirty) u.name = u.name ?? b.name; // label for error messages
  return dirty ? u : null;
}

function newRowToAdd(n: NewRow): BulkAdd | null {
  const unit = isUnitPriced(n.cls);
  if (unit) {
    const qty = parse(n.qty);
    if (!n.ticker.trim() || !qty || qty <= 0) return null;
    return { cls: n.cls, ticker: n.ticker.trim().toUpperCase(), name: n.name.trim() || undefined, account: n.account.trim() || undefined, qty, costPerUnit: parse(n.cost), acquiredDate: n.date || undefined };
  }
  if (!n.name.trim()) return null;
  return { cls: n.cls, name: n.name.trim(), account: n.account.trim() || undefined, subcat: n.cls === "private" ? n.subcat : undefined, value: parse(n.value) ?? 0, costBasis: n.cls === "cash" ? undefined : parse(n.costBasis) };
}

export function BulkEditTable({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<EditRow[] | null>(null);
  const [adds, setAdds] = useState<NewRow[]>([]);
  const [q, setQ] = useState("");
  const [clsFilter, setClsFilter] = useState<AssetClass | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () =>
    loadBulkRows()
      .then((rs) => setRows(rs.map(toEdit)))
      .catch(() => { setError("Couldn't load your positions — please try again."); setRows([]); });
  useEffect(() => { void load(); }, []);

  const setRow = (id: string, patch: Partial<EditRow>) => setRows((rs) => (rs ?? []).map((r) => (r.base.id === id ? { ...r, ...patch } : r)));
  const setAdd = (key: number, patch: Partial<NewRow>) => setAdds((as) => as.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  /** Change a row's class; when it crosses market ↔ manual, prefill the other family's cells from today's numbers. */
  const changeCls = (id: string, cls: AssetClass) => setRows((rs) => (rs ?? []).map((r) => {
    if (r.base.id !== id) return r;
    const b = r.base;
    const toUnit = isUnitPriced(cls);
    if (toUnit && !isUnitPriced(r.cls)) return { ...r, cls, ticker: b.unit ? b.ticker ?? "" : r.ticker, qty: b.unit ? fmt(b.qty, 8) : r.qty, cost: b.unit ? fmt(b.avgCost) : r.cost };
    if (!toUnit && isUnitPriced(r.cls)) return { ...r, cls, value: b.unit ? fmt(b.qty * (b.price ?? 0)) : fmt(b.value), costBasis: b.unit ? fmt(b.qty * (b.avgCost ?? 0)) : fmt(b.costBasis) };
    return { ...r, cls };
  }));

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!clsFilter || r.base.cls === clsFilter) && (!needle || `${r.base.ticker ?? ""} ${r.name} ${r.account} ${r.base.subcat ?? ""}`.toLowerCase().includes(needle)));
  }, [rows, q, clsFilter]);

  const updates = useMemo(() => (rows ?? []).filter((r) => !r.del && !rowProblem(r)).map(diffRow).filter((u): u is BulkUpdate => !!u), [rows]);
  const problems = useMemo(() => (rows ?? []).filter((r) => rowProblem(r)).length, [rows]);
  const deletes = useMemo(() => (rows ?? []).filter((r) => r.del).map((r) => r.base.id), [rows]);
  const addPayload = useMemo(() => adds.map(newRowToAdd).filter((a): a is BulkAdd => !!a), [adds]);
  const total = updates.length + deletes.length + addPayload.length;
  const canApply = total > 0 && problems === 0;
  const allVisibleDel = visible.length > 0 && visible.every((r) => r.del);

  /** Paste a spreadsheet block into a new row: fills that row and appends more rows below. */
  const pasteInto = (key: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return; // single value → let the browser paste normally
    e.preventDefault();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    setAdds((as) => {
      const idx = as.findIndex((a) => a.key === key);
      if (idx < 0) return as;
      const cls = as[idx].cls;
      const unit = isUnitPriced(cls);
      const filled = lines.map((line, i) => {
        const c = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((s) => s.replace(/^"|"$/g, "").trim());
        const base = i === 0 ? as[idx] : blankNew(cls);
        return unit
          ? { ...base, ticker: (c[0] ?? "").toUpperCase(), qty: c[1] ?? "", cost: c[2] ?? "", date: c[3] ?? "", name: c[4] ?? base.name }
          : { ...base, name: c[0] ?? "", value: c[1] ?? "", costBasis: c[2] ?? "", account: c[3] ?? base.account };
      });
      return [...as.slice(0, idx), ...filled, ...as.slice(idx + 1)];
    });
  };

  const apply = async () => {
    if (!total) return;
    if (deletes.length && !confirm(`Delete ${deletes.length} position${deletes.length === 1 ? "" : "s"}?\n\nThis removes them and their history. It can't be undone.`)) return;
    setError("");
    setNotice("");
    setPending(true);
    try {
      // make sure every new or reclassed market symbol prices before writing anything
      const market: Array<{ cls: AssetClass; ticker: string }> = addPayload.filter((a) => isUnitPriced(a.cls)).map((a) => ({ cls: a.cls, ticker: a.ticker! }));
      for (const r of rows ?? []) {
        const u = r.del ? null : diffRow(r);
        if (u && isUnitPriced(r.cls) && (u.cls || u.ticker)) market.push({ cls: r.cls, ticker: r.ticker.trim().toUpperCase() });
      }
      const checks = await Promise.all(market.map(async (a) => {
        const res = await fetch(`/api/quote?cls=${a.cls}&ticker=${encodeURIComponent(a.ticker)}`);
        const j = await res.json();
        return { ticker: a.ticker, ok: !!(j.quote && j.quote.price) };
      }));
      const bad = checks.filter((c) => !c.ok).map((c) => c.ticker);
      if (bad.length) {
        setError(`Couldn't find a price for: ${bad.join(", ")}. Check the symbol (e.g. BTC, AAPL, XAU) or change its class.`);
        setPending(false);
        return;
      }
      const res = await applyBulkEdit({ deletes, updates, adds: addPayload });
      if (res.errors.length) {
        setError(`${res.errors.length} item${res.errors.length === 1 ? "" : "s"} failed: ${res.errors.slice(0, 4).join(" · ")}${res.errors.length > 4 ? " …" : ""}`);
        setNotice(`Applied ${res.deleted} delete${res.deleted === 1 ? "" : "s"}, ${res.updated} edit${res.updated === 1 ? "" : "s"}, ${res.added} add${res.added === 1 ? "" : "s"}.`);
        setAdds([]);
        setRows(null);
        await load();
        setPending(false);
        return;
      }
      onDone();
    } catch {
      setError("Something went wrong — please try again.");
      setPending(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.45 }}>
        Edit everything in one grid: tick rows to delete, change quantities, values, cost or names inline, and add new rows
        at the bottom (paste straight from a spreadsheet). Nothing is saved until you hit <b style={{ color: "var(--ink)" }}>Apply</b>.
      </p>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ticker, name, account…" style={{ ...cell, width: 240 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {CLASS_ORDER.map((c) => (
            <button key={c} onClick={() => setClsFilter(clsFilter === c ? null : c)} style={{ ...chip, cursor: "pointer", border: `1px solid ${clsFilter === c ? `var(--c-${c})` : "var(--border)"}`, background: clsFilter === c ? `var(--t-${c})` : "transparent", color: clsFilter === c ? `var(--c-${c})` : "var(--ink-3)", fontFamily: "inherit" }}>
              {CLASSES[c].label.split(" ")[0]}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
          {rows ? `${visible.length} of ${rows.length} shown` : "Loading…"}
        </span>
      </div>

      <div style={{ overflowX: "auto", border: "var(--hair) solid var(--border)", borderRadius: 10 }}>
        <div style={{ minWidth: 900 }}>
          {/* header */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "8px 10px", background: "var(--surface-2)", borderBottom: "var(--hair) solid var(--border)", fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
            <input type="checkbox" title="Mark all shown for deletion" checked={allVisibleDel} onChange={(e) => { const on = e.target.checked; const ids = new Set(visible.map((r) => r.base.id)); setRows((rs) => (rs ?? []).map((r) => (ids.has(r.base.id) ? { ...r, del: on } : r))); }} style={{ cursor: "pointer" }} />
            <span>Class</span><span>Asset</span><span>Account</span>
            <span style={{ textAlign: "right" }}>Qty · Value</span>
            <span style={{ textAlign: "right" }}>Cost/unit · Basis</span>
            <span style={{ textAlign: "right" }}>Lots · Date</span>
            <span style={{ textAlign: "right" }}>Market value</span>
          </div>

          {/* existing rows */}
          {rows && visible.length === 0 && adds.length === 0 && (
            <div style={{ padding: "22px 12px", fontSize: 12.5, color: "var(--ink-3)", textAlign: "center" }}>{rows.length ? "No positions match that filter." : "No positions yet — add rows below."}</div>
          )}
          {visible.map((r) => {
            const b = r.base;
            const u = diffRow(r);
            const locked = !b.unit && b.itemCount > 0;
            const unit = isUnitPriced(r.cls);
            const crossing = unit !== b.unit;
            const problem = rowProblem(r);
            const mkt = b.unit ? b.qty * (b.price ?? 0) : b.value;
            const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "6px 10px", borderBottom: "var(--hair) solid var(--border)", opacity: r.del ? 0.45 : 1, textDecoration: r.del ? "line-through" : "none", background: r.del ? "var(--bg-sunk)" : u ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent" };
            return (
              <div key={b.id} style={rowStyle}>
                <input type="checkbox" checked={r.del} onChange={(e) => setRow(b.id, { del: e.target.checked })} title="Delete this position" style={{ cursor: "pointer" }} />
                <select value={r.cls} disabled={r.del || locked} onChange={(e) => changeCls(b.id, e.target.value as AssetClass)} title={locked ? "Card collections keep their class" : "Asset class"} style={{ ...cell, padding: "4px 4px", fontSize: 11.5, fontWeight: 600, cursor: locked ? "default" : "pointer", color: `var(--c-${r.cls})`, background: `var(--t-${r.cls})`, border: `1px solid ${r.cls !== b.cls ? "var(--accent)" : "transparent"}` }}>
                  {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASSES[c].label.split(" ")[0]}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  {unit && <input value={r.ticker} disabled={r.del} onChange={(e) => setRow(b.id, { ticker: e.target.value.toUpperCase() })} placeholder="TICKER" style={{ ...cell, width: 82, flex: "none", fontWeight: 700, ...(u?.ticker || (crossing && !r.ticker) ? changed : {}) }} title="Symbol" />}
                  <input value={r.name} disabled={r.del} onChange={(e) => setRow(b.id, { name: e.target.value })} style={{ ...cell, ...(u?.name ? changed : {}) }} />
                </div>
                <input value={r.account} disabled={r.del} onChange={(e) => setRow(b.id, { account: e.target.value })} placeholder="—" style={{ ...cell, ...(u?.account !== undefined ? changed : {}) }} />
                {unit ? (
                  <input value={r.qty} disabled={r.del} onChange={(e) => setRow(b.id, { qty: e.target.value })} inputMode="decimal" placeholder="Qty" style={{ ...numCell, ...(u?.qty != null ? changed : {}) }} title="Quantity. 0 deletes the position." />
                ) : (
                  <input value={r.value} disabled={r.del || locked} onChange={(e) => setRow(b.id, { value: e.target.value })} inputMode="decimal" placeholder="Value" style={{ ...numCell, ...(u?.value != null ? changed : {}) }} title={locked ? "Value comes from the card items — edit them in Asset Detail" : "Current value"} />
                )}
                {unit ? (
                  <input value={r.cost} disabled={r.del || (b.unit && b.lotCount > 1)} onChange={(e) => setRow(b.id, { cost: e.target.value })} inputMode="decimal" placeholder="—" style={{ ...numCell, ...(u?.costPerUnit != null ? changed : {}) }} title={b.unit && b.lotCount > 1 ? "Average of several lots — edit individual lots in Asset Detail" : "Cost per unit"} />
                ) : r.cls === "cash" ? (
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)", textAlign: "right" }}>—</span>
                ) : (
                  <input value={r.costBasis} disabled={r.del || locked} onChange={(e) => setRow(b.id, { costBasis: e.target.value })} inputMode="decimal" placeholder="—" style={{ ...numCell, ...(u?.costBasis !== undefined ? changed : {}) }} title="Cost basis" />
                )}
                <span className="num" style={{ fontSize: 11.5, color: problem ? "var(--neg)" : crossing ? "var(--accent)" : "var(--ink-3)", textAlign: "right", fontWeight: problem || crossing ? 600 : 400 }} title={crossing ? "Switching between market and manual rebuilds this position from the values here" : undefined}>
                  {problem ? problem : crossing ? "rebuild" : b.unit ? `${b.lotCount} lot${b.lotCount === 1 ? "" : "s"}` : locked ? `${b.itemCount} cards` : b.subcat ?? "manual"}
                </span>
                <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>
                  {fmtUSD(mkt)}
                  {b.unit && b.price != null && <span style={{ display: "block", fontSize: 10.5, fontWeight: 450, color: "var(--ink-3)" }}>{fmtQty(b.qty)} × {fmtUSD(b.price)}</span>}
                </span>
              </div>
            );
          })}

          {/* new rows */}
          {adds.length > 0 && (
            <div style={{ padding: "7px 10px", background: "var(--surface-2)", borderBottom: "var(--hair) solid var(--border)", fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
              New positions · paste rows as <span className="num">ticker, qty, cost, date</span> (market) or <span className="num">name, value, basis, account</span> (manual)
            </div>
          )}
          {adds.map((a) => {
            const unit = isUnitPriced(a.cls);
            const ok = !!newRowToAdd(a);
            return (
              <div key={a.key} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "6px 10px", borderBottom: "var(--hair) solid var(--border)", background: ok ? "color-mix(in srgb, var(--pos) 6%, transparent)" : "transparent" }}>
                <button onClick={() => setAdds((as) => as.filter((x) => x.key !== a.key))} title="Remove row" style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                <select value={a.cls} onChange={(e) => setAdd(a.key, { cls: e.target.value as AssetClass })} style={{ ...cell, cursor: "pointer", padding: "6px 4px" }}>
                  {CLASS_ORDER.map((c) => <option key={c} value={c}>{CLASSES[c].label.split(" ")[0]}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  {unit && <input value={a.ticker} onChange={(e) => setAdd(a.key, { ticker: e.target.value.toUpperCase() })} onPaste={(e) => pasteInto(a.key, e)} placeholder="TICKER" style={{ ...cell, width: 82, flex: "none", fontWeight: 700 }} />}
                  <input value={a.name} onChange={(e) => setAdd(a.key, { name: e.target.value })} onPaste={(e) => pasteInto(a.key, e)} placeholder={unit ? "Name (optional)" : "Name"} style={cell} />
                </div>
                <input value={a.account} onChange={(e) => setAdd(a.key, { account: e.target.value })} placeholder="Account (opt.)" style={cell} />
                {unit ? (
                  <input value={a.qty} onChange={(e) => setAdd(a.key, { qty: e.target.value })} inputMode="decimal" placeholder="Qty" style={numCell} />
                ) : (
                  <input value={a.value} onChange={(e) => setAdd(a.key, { value: e.target.value })} inputMode="decimal" placeholder="Value" style={numCell} />
                )}
                {unit ? (
                  <input value={a.cost} onChange={(e) => setAdd(a.key, { cost: e.target.value })} inputMode="decimal" placeholder="Cost/unit (opt.)" style={numCell} />
                ) : a.cls === "cash" ? (
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)", textAlign: "right" }}>—</span>
                ) : (
                  <input value={a.costBasis} onChange={(e) => setAdd(a.key, { costBasis: e.target.value })} inputMode="decimal" placeholder="Basis (opt.)" style={numCell} />
                )}
                {unit ? (
                  <input value={a.date} onChange={(e) => setAdd(a.key, { date: e.target.value })} type="date" style={{ ...cell, padding: "5px 4px", fontSize: 11.5 }} />
                ) : a.cls === "private" ? (
                  <select value={a.subcat} onChange={(e) => setAdd(a.key, { subcat: e.target.value })} style={{ ...cell, cursor: "pointer", padding: "6px 4px", fontSize: 11.5 }}>
                    {SUBCATS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: 11.5, fontWeight: 600, color: ok ? "var(--pos)" : "var(--ink-3)", textAlign: "right" }}>{ok ? "new" : unit ? "ticker + qty" : "name needed"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: "var(--neg)", marginTop: 10, lineHeight: 1.4 }}>{error}</div>}
      {notice && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.4 }}>{notice}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={() => setAdds((as) => [...as, blankNew(as[as.length - 1]?.cls ?? clsFilter ?? "stocks")])} style={ghostBtn}>+ Add row</button>
        <button onClick={() => setAdds((as) => [...as, ...Array.from({ length: 5 }, () => blankNew(as[as.length - 1]?.cls ?? clsFilter ?? "stocks"))])} style={ghostBtn}>+ 5 rows</button>
        <button onClick={() => { setRows((rs) => (rs ?? []).map((r) => toEdit(r.base))); setAdds([]); setError(""); }} disabled={!total} style={{ ...ghostBtn, color: total ? "var(--ink-2)" : "var(--ink-3)", cursor: total ? "pointer" : "default" }}>Reset</button>
        <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 4 }}>
          {deletes.length > 0 && <span style={{ color: "var(--neg)", fontWeight: 600 }}>{deletes.length} to delete</span>}
          {deletes.length > 0 && (updates.length > 0 || addPayload.length > 0) && " · "}
          {updates.length > 0 && <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{updates.length} changed</span>}
          {updates.length > 0 && addPayload.length > 0 && " · "}
          {addPayload.length > 0 && <span style={{ color: "var(--pos)", fontWeight: 600 }}>{addPayload.length} new</span>}
          {problems > 0 && <span style={{ color: "var(--neg)", fontWeight: 600 }}> · {problems} row{problems === 1 ? "" : "s"} incomplete</span>}
        </span>
        <button onClick={apply} disabled={pending || !canApply} style={{ marginLeft: "auto", padding: "9px 18px", background: canApply ? "var(--accent)" : "var(--bg-sunk)", color: canApply ? "var(--accent-ink)" : "var(--ink-3)", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: canApply && !pending ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {pending ? "Applying…" : total ? `Apply ${total} change${total === 1 ? "" : "s"}` : "No changes"}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.45 }}>
        Quantity changes adjust your most recent lot so older tax lots stay intact; cost/unit is editable only for single-lot
        holdings. Setting a quantity to 0 deletes the position. Changing class within market (crypto/stocks/metals) or within
        manual (cash/real estate/collectibles/loans) edits in place; switching between the two rebuilds the position from the
        row&apos;s values and replaces its ledger history.
      </p>
    </div>
  );
}
