import type { AssetClass } from "@/lib/engine";

/** Ticker → company domain for stock logos (demo-grade favicon service). */
const STOCK_DOMAINS: Record<string, string> = {
  AAPL: "apple.com", MSFT: "microsoft.com", NVDA: "nvidia.com", GOOGL: "google.com", GOOG: "google.com",
  AMZN: "amazon.com", META: "meta.com", TSLA: "tesla.com", VTI: "vanguard.com", VOO: "vanguard.com",
  SPY: "ssga.com", QQQ: "invesco.com", AMD: "amd.com", NFLX: "netflix.com", DIS: "disney.com",
  JPM: "jpmorganchase.com", V: "visa.com", MA: "mastercard.com", UNH: "unitedhealthgroup.com",
  XOM: "exxonmobil.com", JNJ: "jnj.com", WMT: "walmart.com", PG: "pg.com", HD: "homedepot.com",
  COST: "costco.com", BAC: "bankofamerica.com", KO: "coca-cola.com", PEP: "pepsico.com",
  ADBE: "adobe.com", CRM: "salesforce.com", INTC: "intel.com", ORCL: "oracle.com",
  AVGO: "broadcom.com", LLY: "lilly.com", BRK: "berkshirehathaway.com",
};

/**
 * Brand logo URL for an asset (crypto icon CDN / stock favicon), or null to
 * fall back to a monogram tile. Mirrors the prototype's assetLogo().
 */
export function assetLogo(cls: AssetClass, ticker?: string | null): string | null {
  if (!ticker || ticker === "—") return null;
  if (cls === "crypto")
    return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${ticker.toLowerCase()}.svg`;
  if (cls === "stocks") {
    const d = STOCK_DOMAINS[ticker.toUpperCase().split("-")[0]];
    return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : null;
  }
  return null;
}
