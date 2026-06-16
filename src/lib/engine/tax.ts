import type { AccountingMethod, AssetClass, Disposal } from "./types";
import { isLongTerm, matchLots } from "./lots";

/**
 * ⚠️ HIGHEST-LIABILITY MODULE — ported illustratively from the prototype.
 * Lot-matching, wash-sale rules (securities), and crypto per-wallet cost-basis
 * (2025 rule) are NOT yet implemented to filing standard. This MUST be reviewed
 * and validated by a tax professional before any user files off an export.
 * Until validated, all exports must be labeled "draft — review with your CPA".
 */

export interface LoanInterest {
  name: string;
  amt: number;
}

export interface TaxRates {
  /** short-term cap-gain rate (default 35%) */
  st: number;
  /** long-term cap-gain rate (default 20%) */
  lt: number;
  /** ordinary income rate applied to interest (default 35%) */
  interest: number;
}

const DEFAULT_RATES: TaxRates = { st: 0.35, lt: 0.2, interest: 0.35 };

export interface TaxRow {
  id: string;
  cls: AssetClass;
  asset: string;
  qty: number;
  proceeds: number;
  date: string;
  basis: number;
  acq: string;
  gain: number;
  term: "short" | "long";
  live?: boolean;
}

export interface TaxSummary {
  method: AccountingMethod;
  rows: TaxRow[];
  stGain: number;
  stLoss: number;
  ltGain: number;
  ltLoss: number;
  netST: number;
  netLT: number;
  realizedGains: number;
  realizedLosses: number;
  netCapGain: number;
  interestIncome: number;
  estTax: number;
  byClassGain: Partial<Record<AssetClass, number>>;
  loanInterest: LoanInterest[];
}

export interface TaxOptions {
  method?: AccountingMethod;
  loanInterest?: LoanInterest[];
  rates?: Partial<TaxRates>;
}

/**
 * Resolve realized disposals to a tax summary under the chosen accounting method.
 * Each disposal carries either precomputed per-method basis/acq maps (seeded
 * history) or a `lotsSnapshot` matched live via matchLots().
 */
export function taxSummary(disposals: Disposal[], opts: TaxOptions = {}): TaxSummary {
  const method = opts.method ?? "FIFO";
  const loanInterest = opts.loanInterest ?? [];
  const rates: TaxRates = { ...DEFAULT_RATES, ...opts.rates };

  const rows: TaxRow[] = [];
  for (const d of disposals) {
    let basis: number;
    let acq: string;
    if (d.lots && d.acq) {
      basis = d.lots[method];
      acq = d.acq[method];
    } else {
      const m = matchLots(d.lotsSnapshot, d.qty, method);
      basis = m.basis;
      acq = m.acq ?? d.date;
    }
    const gain = d.proceeds - basis;
    rows.push({
      id: d.id,
      cls: d.cls,
      asset: d.asset,
      qty: d.qty,
      proceeds: d.proceeds,
      date: d.date,
      basis,
      acq,
      gain,
      term: isLongTerm(acq, d.date) ? "long" : "short",
      live: d.live,
    });
  }
  rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let stGain = 0,
    stLoss = 0,
    ltGain = 0,
    ltLoss = 0;
  const byClassGain: Partial<Record<AssetClass, number>> = {};
  for (const r of rows) {
    if (r.term === "long") {
      if (r.gain >= 0) ltGain += r.gain;
      else ltLoss += -r.gain;
    } else {
      if (r.gain >= 0) stGain += r.gain;
      else stLoss += -r.gain;
    }
    byClassGain[r.cls] = (byClassGain[r.cls] || 0) + r.gain;
  }

  const realizedGains = stGain + ltGain;
  const realizedLosses = stLoss + ltLoss;
  const netST = stGain - stLoss;
  const netLT = ltGain - ltLoss;
  const netCapGain = netST + netLT;
  const interestIncome = loanInterest.reduce((s, x) => s + x.amt, 0);
  const estTax =
    Math.max(0, netST) * rates.st +
    Math.max(0, netLT) * rates.lt +
    interestIncome * rates.interest;

  return {
    method,
    rows,
    stGain,
    stLoss,
    ltGain,
    ltLoss,
    netST,
    netLT,
    realizedGains,
    realizedLosses,
    netCapGain,
    interestIncome,
    estTax,
    byClassGain,
    loanInterest,
  };
}
