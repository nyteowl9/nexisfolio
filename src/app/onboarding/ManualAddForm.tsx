"use client";

import { useState } from "react";
import { addPosition } from "@/lib/db/positions";

type Cls = "crypto" | "stocks" | "metals" | "realest" | "private" | "cash" | "loans";

const UNIT: Cls[] = ["crypto", "stocks", "metals"];
const CLASS_LABEL: Record<Cls, string> = {
  crypto: "Crypto",
  stocks: "Stocks & Equities",
  metals: "Commodities & Metals",
  realest: "Real Estate",
  private: "Private & Collectibles",
  cash: "Cash & Stablecoins",
  loans: "Loans Receivable",
};

const field = "w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]";
const label = "mb-1 block text-xs font-semibold text-[#5C6168]";

export function ManualAddForm() {
  const [cls, setCls] = useState<Cls>("crypto");
  const unit = UNIT.includes(cls);

  return (
    <form action={addPosition} className="space-y-3">
      <input type="hidden" name="cls" value={cls} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>Asset class</span>
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value as Cls)}
            className={field}
          >
            {(Object.keys(CLASS_LABEL) as Cls[]).map((c) => (
              <option key={c} value={c}>
                {CLASS_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Name</span>
          <input name="name" required placeholder="e.g. Bitcoin / My condo" className={field} />
        </label>
      </div>

      {unit ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Ticker</span>
              <input name="ticker" required placeholder="BTC" className={field} />
            </label>
            <label className="block">
              <span className={label}>Account (optional)</span>
              <input name="account" placeholder="Coinbase" className={field} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={label}>Quantity</span>
              <input name="qty" type="number" step="any" required className={field} />
            </label>
            <label className="block">
              <span className={label}>Current price</span>
              <input name="currentPrice" type="number" step="any" required className={field} />
            </label>
            <label className="block">
              <span className={label}>Cost / unit</span>
              <input name="costPerUnit" type="number" step="any" className={field} />
            </label>
          </div>
          <label className="block">
            <span className={label}>Acquired date</span>
            <input name="acquiredDate" type="date" className={field} />
          </label>
        </>
      ) : (
        <>
          {cls === "private" && (
            <label className="block">
              <span className={label}>Sub-category</span>
              <select name="subcat" className={field} defaultValue="Trading Cards">
                <option>Trading Cards</option>
                <option>Watches</option>
                <option>Art</option>
                <option>Jewelry</option>
                <option>Other</option>
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Current value</span>
              <input name="value" type="number" step="any" required className={field} />
            </label>
            <label className="block">
              <span className={label}>{cls === "cash" ? "—" : "Cost basis"}</span>
              <input name="costBasis" type="number" step="any" disabled={cls === "cash"} className={field} />
            </label>
          </div>
          <label className="block">
            <span className={label}>Account (optional)</span>
            <input name="account" placeholder="Chase / Vault / Deed" className={field} />
          </label>
        </>
      )}

      <button className="w-full rounded-full bg-[#15171A] py-2.5 text-sm font-medium text-white transition hover:opacity-90">
        Add asset
      </button>
    </form>
  );
}
