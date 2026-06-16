import type { AccountingMethod, Lot } from "./types";

const MS_PER_DAY = 864e5;

/** A holding period over 365.25 days is long-term. */
export function isLongTerm(acq: string, sale: string): boolean {
  return new Date(sale).getTime() - new Date(acq).getTime() > 365.25 * MS_PER_DAY;
}

export interface LotMatch {
  basis: number;
  /** earliest matched lot date — drives the holding period */
  acq: string | null;
}

/**
 * Match a sale of `qty` against buy-lots per accounting method.
 * FIFO = oldest first, LIFO = newest first, HIFO = highest-price first.
 */
export function matchLots(
  lots: Lot[] | undefined,
  qty: number,
  method: AccountingMethod
): LotMatch {
  const ls = (lots ?? []).slice().sort((a, b) =>
    method === "LIFO"
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : method === "HIFO"
        ? b.price - a.price
        : new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let rem = qty;
  let basis = 0;
  let acq: string | null = null;
  for (const l of ls) {
    if (rem <= 0) break;
    const take = Math.min(rem, l.qty);
    basis += take * l.price;
    if (!acq) acq = l.date; // earliest-matched lot drives holding period
    rem -= take;
  }
  return { basis, acq };
}
