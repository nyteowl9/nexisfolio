import type { AssetClass } from "@/lib/engine";

/** Minimal CSV parser — handles quoted fields, escaped quotes, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

export interface MappedHolding { cls: AssetClass; ticker: string; qty: number; costPerUnit?: number }

const num = (s: string | undefined) => {
  if (!s) return NaN;
  const n = parseFloat(s.replace(/[$,()\s]/g, "").replace(/^-$/, ""));
  return Number.isFinite(n) ? n : NaN;
};
const findCol = (header: string[], res: RegExp[]) => header.findIndex((h) => res.some((r) => r.test(h)));

/**
 * Map a brokerage holdings CSV (E-Trade, Fidelity, Schwab, …) to importable
 * rows. Auto-detects the symbol / quantity / cost columns by header name.
 * Cost basis may be per-share (Price Paid / Avg Cost) or a total (Cost Basis
 * Total) — we normalize to per-unit. Skips cash/total/blank rows.
 */
export function mapBrokerageRows(rows: string[][]): MappedHolding[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const iSym = findCol(header, [/symbol/, /ticker/]);
  const iQty = findCol(header, [/quantity/, /\bqty\b/, /shares/]);
  const iPer = findCol(header, [/price paid/, /average cost/, /avg cost/, /cost\s*\/?\s*share/, /cost per share/, /unit cost/]);
  const iTot = findCol(header, [/cost basis total/, /total cost/, /^cost basis$/, /cost basis/]);
  if (iSym < 0 || iQty < 0) return [];

  const out: MappedHolding[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const ticker = (cells[iSym] || "").trim().replace(/^\$/, "").toUpperCase();
    const qty = num(cells[iQty]);
    if (!ticker || !Number.isFinite(qty) || qty <= 0) continue;
    if (/^(cash|total|totals|--|n\/a)$/i.test(ticker)) continue;
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) continue; // looks like a real symbol

    let costPerUnit: number | undefined;
    const per = iPer >= 0 ? num(cells[iPer]) : NaN;
    const tot = iTot >= 0 ? num(cells[iTot]) : NaN;
    if (Number.isFinite(per) && per > 0) costPerUnit = per;
    else if (Number.isFinite(tot) && tot > 0) costPerUnit = tot / qty;

    out.push({ cls: "stocks", ticker, qty, costPerUnit });
  }
  return out;
}
