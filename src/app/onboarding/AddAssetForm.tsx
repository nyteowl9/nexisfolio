"use client";

import { useEffect, useRef, useState } from "react";
import { addPosition, browseCardCatalog } from "@/lib/db/positions";
import { fmtUSD } from "@/lib/engine";

type Cls = "crypto" | "stocks" | "metals" | "realest" | "private" | "cash" | "loans";

interface PickResult {
  cls: string;
  ticker: string;
  name: string;
  providerId?: string;
  logo?: string;
}

const UNIT: Cls[] = ["crypto", "stocks", "metals"];
const CLASS_META: Record<Cls, { label: string; color: string }> = {
  crypto: { label: "Crypto", color: "#E0992B" },
  stocks: { label: "Stocks", color: "#3E72F0" },
  metals: { label: "Metals", color: "#B5703C" },
  realest: { label: "Real Estate", color: "#14A6A0" },
  private: { label: "Collectibles", color: "#9466F0" },
  cash: { label: "Cash", color: "#93999F" },
  loans: { label: "Loans", color: "#E5689A" },
};

const field =
  "w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]";
const flabel = "mb-1 block text-xs font-semibold text-[#5C6168]";

function SymbolSearch({
  cls,
  onPick,
}: {
  cls: Cls;
  onPick: (r: PickResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/symbols?cls=${cls}&q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setResults(j.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, cls]);

  return (
    <div ref={boxRef} className="relative">
      <span className={flabel}>Find asset</span>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search — e.g. bitcoin, NVDA, gold… (typos OK)"
        className={field}
      />
      <p className="mt-1 text-[11px] text-[#8A9099]">
        {loading ? "Searching…" : "Pick from the list — price fills in automatically."}
      </p>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-[10px] border border-[#E7E8EA] bg-white shadow-lg">
          {results.map((r) => (
            <button
              type="button"
              key={r.cls + r.ticker + (r.providerId ?? "")}
              onMouseDown={() => {
                onPick(r);
                setQ(`${r.ticker} · ${r.name}`);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F5F5F6]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.logo ? (
                <img src={r.logo} alt="" className="h-7 w-7 rounded-md" />
              ) : (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-bold text-white"
                  style={{ background: CLASS_META[cls].color }}
                >
                  {r.ticker.slice(0, 4)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {r.ticker} <span className="font-normal text-[#8A9099]">{r.name}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddAssetForm({ redirectTo = "/onboarding" }: { redirectTo?: string }) {
  const [cls, setCls] = useState<Cls>("crypto");
  const [subcat, setSubcat] = useState("Trading Cards");
  const [picked, setPicked] = useState<PickResult | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const unit = UNIT.includes(cls);
  // trading-card collections are valued from live card prices, not a typed
  // value — route these straight into the catalog instead of taking a value.
  const isCardCollection = cls === "private" && subcat === "Trading Cards";

  async function handlePick(r: PickResult) {
    setPicked(r);
    setPrice(null);
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/quote?cls=${cls}&ticker=${encodeURIComponent(r.ticker)}&id=${encodeURIComponent(r.providerId ?? "")}`
      );
      const j = await res.json();
      setPrice(j.quote?.price ?? null);
    } finally {
      setPriceLoading(false);
    }
  }

  function switchClass(c: Cls) {
    setCls(c);
    setPicked(null);
    setPrice(null);
    setQty("");
    setCost("");
  }

  const qtyN = parseFloat(qty) || 0;
  const costN = parseFloat(cost) || 0;
  const mkt = price ?? costN;
  const basis = qtyN * costN;
  const value = qtyN * mkt;
  const pl = value - basis;

  return (
    <form action={isCardCollection ? browseCardCatalog : addPosition} className="space-y-4">
      <input type="hidden" name="cls" value={cls} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {/* class chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CLASS_META) as Cls[]).map((c) => {
          const active = c === cls;
          return (
            <button
              type="button"
              key={c}
              onClick={() => switchClass(c)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              style={{
                borderColor: active ? CLASS_META[c].color : "#E7E8EA",
                background: active ? `${CLASS_META[c].color}14` : "#fff",
                color: active ? CLASS_META[c].color : "#5C6168",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: CLASS_META[c].color }} />
              {CLASS_META[c].label}
            </button>
          );
        })}
      </div>

      {unit ? (
        <>
          <SymbolSearch cls={cls} onPick={handlePick} />
          {/* selection carried to the server action */}
          <input type="hidden" name="ticker" value={picked?.ticker ?? ""} />
          <input type="hidden" name="name" value={picked?.name ?? ""} />
          <input type="hidden" name="providerId" value={picked?.providerId ?? ""} />
          <input type="hidden" name="currentPrice" value={price ?? ""} />

          {picked && (
            <div className="rounded-[10px] border border-[#E7E8EA] bg-[#FAFAFB] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {picked.ticker} · {picked.name}
                </span>
                <span className="tabular-nums text-[#5C6168]">
                  {priceLoading ? "fetching price…" : price != null ? `${fmtUSD(price, { full: true, cents: price < 1000 })} live` : "price unavailable"}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={flabel}>Quantity</span>
              <input
                name="qty"
                type="number"
                step="any"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={field}
              />
            </label>
            <label className="block">
              <span className={flabel}>Cost per unit (what you paid)</span>
              <input
                name="costPerUnit"
                type="number"
                step="any"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className={field}
              />
            </label>
          </div>
          <label className="block">
            <span className={flabel}>Acquired date</span>
            <input name="acquiredDate" type="date" className={field} />
          </label>

          {/* live preview */}
          {qtyN > 0 && (
            <div className="rounded-[10px] border border-[#E7E8EA] bg-white p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A9099]">
                Live preview
              </p>
              <Row k="Cost basis" v={fmtUSD(basis, { full: true })} />
              <Row
                k="Market price"
                v={price != null ? fmtUSD(mkt, { full: true, cents: mkt < 1000 }) : "— (will sync)"}
              />
              <Row
                k="Unrealized P/L"
                v={`${pl >= 0 ? "+" : "−"}${fmtUSD(Math.abs(pl), { full: true })}`}
                color={pl >= 0 ? "#0E9D6E" : "#E0443E"}
              />
              <div className="mt-2 flex items-baseline justify-between border-t border-[#E7E8EA] pt-2">
                <span className="text-sm font-semibold text-[#5C6168]">Current value</span>
                <span className="text-lg font-bold tabular-nums">{fmtUSD(value, { full: true })}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {cls === "private" && (
            <label className="block">
              <span className={flabel}>Sub-category</span>
              <select name="subcat" className={field} value={subcat} onChange={(e) => setSubcat(e.target.value)}>
                <option>Trading Cards</option>
                <option>Watches</option>
                <option>Art</option>
                <option>Jewelry</option>
                <option>Other</option>
              </select>
            </label>
          )}

          {isCardCollection ? (
            <div className="rounded-[10px] border border-[#E7E8EA] bg-[#FAFAFB] p-4 text-sm text-[#5C6168]">
              <p className="font-semibold text-[#15171A]">Trading-card collection</p>
              <p className="mt-1 text-[13px]">
                Card collections are valued automatically from live card prices — you don&rsquo;t enter a
                total. Continue to the catalog to add individual cards or sealed product, each priced for you.
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className={flabel}>Name</span>
                <input
                  name="name"
                  required
                  placeholder={cls === "realest" ? "Rental · Austin" : cls === "cash" ? "HYSA · Marcus" : cls === "loans" ? "Loan · Friend" : "Watch · Patek"}
                  className={field}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={flabel}>{cls === "loans" ? "Outstanding balance" : "Current value"}</span>
                  <input name="value" type="number" step="any" required className={field} />
                </label>
                <label className="block">
                  <span className={flabel}>{cls === "cash" ? "APY % (optional)" : "Cost basis"}</span>
                  <input name={cls === "cash" ? "apy" : "costBasis"} type="number" step="any" className={field} />
                </label>
              </div>
              <label className="block">
                <span className={flabel}>Account / where held (optional)</span>
                <input name="account" placeholder="Chase / Vault / Deed" className={field} />
              </label>
            </>
          )}
        </>
      )}

      <button className="w-full rounded-full bg-[#15171A] py-2.5 text-sm font-medium text-white transition hover:opacity-90">
        {isCardCollection ? "Continue to card catalog →" : "Add asset"}
      </button>
    </form>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <span className="text-[13px] text-[#8A9099]">{k}</span>
      <span className="text-[13px] font-semibold tabular-nums" style={color ? { color } : undefined}>
        {v}
      </span>
    </div>
  );
}
