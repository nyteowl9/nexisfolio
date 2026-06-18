const MS_PER_DAY = 864e5;

export interface FmtUSDOpts {
  /** show full (non-abbreviated) number */
  full?: boolean;
  /** include cents */
  cents?: boolean;
  /** abbreviate large numbers ($2.4M / $3.1K). Default true. */
  abbr?: boolean;
}

// Global default for abbreviation, driven by the user's "numbers" preference.
// Explicit `full`/`abbr` options on a call still win. Set in PrefsProvider so
// SSR and the client first paint agree.
let GLOBAL_ABBR = true;
export function setNumberAbbreviation(on: boolean): void {
  GLOBAL_ABBR = on;
}

/** Format a USD figure (uses a minus-sign glyph, tabular-friendly). */
export function fmtUSD(n: number, opts: FmtUSDOpts = {}): string {
  const abbr = opts.abbr !== undefined ? opts.abbr : GLOBAL_ABBR;
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (opts.full || !abbr) {
    s = a.toLocaleString("en-US", {
      maximumFractionDigits: opts.cents ? 2 : 0,
      minimumFractionDigits: opts.cents ? 2 : 0,
    });
  } else if (a >= 1e6) s = (a / 1e6).toFixed(2) + "M";
  else if (a >= 1e3) s = (a / 1e3).toFixed(1) + "K";
  else s = a.toFixed(opts.cents ? 2 : 0);
  return (neg ? "−$" : "$") + s;
}

export function fmtPct(n: number, signed?: boolean): string {
  return (signed && n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "%";
}

export function fmtQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 2 });
}

/** Parse a date string; treat YYYY-MM-DD as a LOCAL date (avoids UTC off-by-one). */
function parseDate(s: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : new Date(s);
}

/** Holding period in years between a date and `now` (defaults to today). */
export function holdYears(dateStr: string, now: Date = new Date()): number {
  const d = parseDate(dateStr);
  return (now.getTime() - d.getTime()) / (365.25 * MS_PER_DAY);
}

export function fmtDate(s: string): string {
  return parseDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
