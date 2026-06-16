import type { AssetClass } from "./types";

export interface ClassMeta {
  key: AssetClass;
  label: string;
  color: string;
  tint: string;
  /** whether the class is unit-priced from a live feed */
  live: boolean;
}

/** Asset-class registry (color, label, pricing mode). */
export const CLASSES: Record<AssetClass, ClassMeta> = {
  crypto: { key: "crypto", label: "Crypto", color: "#E0992B", tint: "t-crypto", live: true },
  stocks: { key: "stocks", label: "Stocks & Equities", color: "#3E72F0", tint: "t-stocks", live: true },
  realest: { key: "realest", label: "Real Estate", color: "#14A6A0", tint: "t-realest", live: false },
  private: { key: "private", label: "Private & Collectibles", color: "#9466F0", tint: "t-private", live: false },
  cash: { key: "cash", label: "Cash", color: "#93999F", tint: "t-cash", live: true },
  loans: { key: "loans", label: "Loans Receivable", color: "#E5689A", tint: "t-loans", live: false },
  metals: { key: "metals", label: "Commodities & Metals", color: "#B5703C", tint: "t-metals", live: true },
};

/** Classes priced as qty * price (vs. a stored manual/cash value). */
export const UNIT_PRICED: Partial<Record<AssetClass, true>> = {
  crypto: true,
  stocks: true,
  metals: true,
};

export const isUnitPriced = (cls: AssetClass): boolean => UNIT_PRICED[cls] === true;

/** Per-class annual growth assumptions by retirement scenario. */
export const SCENARIOS: Record<string, Partial<Record<AssetClass, number>>> = {
  Conservative: { crypto: 0.06, stocks: 0.05, realest: 0.03, private: 0.04, cash: 0.02, metals: 0.03 },
  Base: { crypto: 0.12, stocks: 0.07, realest: 0.04, private: 0.06, cash: 0.02, metals: 0.05 },
  Aggressive: { crypto: 0.18, stocks: 0.09, realest: 0.05, private: 0.08, cash: 0.03, metals: 0.06 },
};
