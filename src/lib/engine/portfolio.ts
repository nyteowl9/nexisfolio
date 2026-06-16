import type { AssetClass, Position } from "./types";
import { CLASSES, isUnitPriced, type ClassMeta } from "./classes";

/** Current market value of a position. */
export function mv(p: Position): number {
  if (isUnitPriced(p.cls)) return (p.qty ?? 0) * (p.price ?? 0);
  return p.value ?? 0;
}

/** Previous (prior-close) value, for intraday change. */
export function prevMv(p: Position): number {
  if (isUnitPriced(p.cls)) return (p.qty ?? 0) * (p.prev ?? 0);
  if (p.cls === "cash") return p.prevValue != null ? p.prevValue : p.value ?? 0;
  return p.value ?? 0; // manual assets don't move intraday
}

/** Cost basis: explicit > sum of lots > market value (cash). */
export function costBasis(p: Position): number {
  if (p.basis != null) return p.basis;
  if (p.lots) return p.lots.reduce((s, l) => s + l.basis, 0);
  return mv(p);
}

export interface ClassRollup extends ClassMeta {
  value: number;
  prev: number;
  basis: number;
  count: number;
  positions: Position[];
}

/** Roll positions up by asset class. */
export function byClass(positions: Position[]): Record<AssetClass, ClassRollup> {
  const out = {} as Record<AssetClass, ClassRollup>;
  for (const k of Object.keys(CLASSES) as AssetClass[]) {
    out[k] = { ...CLASSES[k], value: 0, prev: 0, basis: 0, count: 0, positions: [] };
  }
  for (const p of positions) {
    const c = out[p.cls];
    c.value += mv(p);
    c.prev += prevMv(p);
    c.basis += costBasis(p);
    c.count++;
    c.positions.push(p);
  }
  return out;
}

export interface Totals {
  net: number;
  prevNet: number;
  change24: number;
  changePct: number;
  liquid: number;
  illiquid: number;
  loansOut: number;
  basis: number;
  pl: number;
  plPct: number;
  classes: Record<AssetClass, ClassRollup>;
}

/** Portfolio-wide totals. */
export function totals(positions: Position[]): Totals {
  const c = byClass(positions);
  const liquid = c.crypto.value + c.stocks.value + c.cash.value + c.metals.value;
  const illiquid = c.realest.value + c.private.value;
  const loansOut = c.loans.value;
  const net = liquid + illiquid + loansOut;
  const prevNet = Object.values(c).reduce((s, x) => s + x.prev, 0);
  const basis = Object.values(c).reduce((s, x) => s + x.basis, 0);
  return {
    net,
    prevNet,
    change24: net - prevNet,
    changePct: prevNet ? ((net - prevNet) / prevNet) * 100 : 0,
    liquid,
    illiquid,
    loansOut,
    basis,
    pl: net - basis,
    plPct: basis ? ((net - basis) / basis) * 100 : 0,
    classes: c,
  };
}

/** Intraday % change for a position (live/cash only; manual → null). */
export function change24(p: Position): number | null {
  if (isUnitPriced(p.cls) && p.prev) return ((p.price ?? 0) - p.prev) / p.prev * 100;
  if (p.cls === "cash" && p.prevValue) return ((p.value ?? 0) - p.prevValue) / p.prevValue * 100;
  return null;
}

/**
 * 7-day % change. Requires persisted price history (price_cache.change_7d /
 * net_worth_snapshots), which isn't populated yet — returns null ("—") for now.
 */
export function change7d(_p: Position): number | null {
  return null;
}
