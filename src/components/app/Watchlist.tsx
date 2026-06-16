"use client";

import Link from "next/link";
import { useState } from "react";
import { WATCHLIST } from "@/lib/sample/market";
import { spark, fmtUSD, fmtPct, CLASSES, type AssetClass } from "@/lib/engine";
import { Area } from "@/components/ui/charts";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { Bolt, Plus, Search, ArrowUp, ArrowDown, Check } from "@/components/ui/icons";

const GRID = "1fr 120px 130px 120px 132px";

export function WatchlistView() {
  const [filter, setFilter] = useState<"all" | "crypto" | "stocks">("all");
  const [query, setQuery] = useState("");
  let list = WATCHLIST;
  if (filter !== "all") list = list.filter((w) => w.cls === filter);
  if (query) list = list.filter((w) => (w.sym + " " + w.name).toLowerCase().includes(query.toLowerCase()));
  const tabs: Array<["all" | "crypto" | "stocks", string, number]> = [
    ["all", "All", WATCHLIST.length],
    ["crypto", "Crypto", WATCHLIST.filter((w) => w.cls === "crypto").length],
    ["stocks", "Stocks", WATCHLIST.filter((w) => w.cls === "stocks").length],
  ];
  const gainers = WATCHLIST.filter((w) => w.chg > 0).length;

  return (
    <div className="nw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px 64px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Watchlist</h1>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 5, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Bolt size={13} color="var(--pos)" /> {WATCHLIST.length} tracked · {gainers} up today · default market list
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "var(--hair) solid var(--border)", borderRadius: 9, background: "var(--surface)", minWidth: 200 }}>
          <Search size={15} color="var(--ink-3)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a ticker…" style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-sans)", width: "100%" }} />
        </div>
      </div>

      <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 9, marginBottom: 16 }}>
        {tabs.map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: filter === k ? "var(--ink)" : "var(--ink-3)", background: filter === k ? "var(--surface)" : "transparent", boxShadow: filter === k ? "var(--shadow)" : "none" }}>
            {l} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 14, padding: "11px 24px", borderBottom: "var(--hair) solid var(--border)" }}>
          {["Asset", "7-day", "Price", "24h", ""].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textAlign: i > 0 && i < 4 ? "right" : i === 1 ? "center" : "left" }}>{h}</span>
          ))}
        </div>
        {list.length ? (
          list.map((w) => {
            const up = w.chg >= 0;
            return (
              <div key={w.sym} style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 14, padding: "13px 24px", borderTop: "var(--hair) solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <AssetIcon cls={w.cls as AssetClass} ticker={w.sym} name={w.sym} size={34} radius={8} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{w.sym}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: CLASSES[w.cls].color, background: `var(--t-${w.cls})`, padding: "1px 7px", borderRadius: 99 }}>{CLASSES[w.cls].label.split(" ")[0]}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{w.name}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Area points={spark(w.sym, w.price)} width={96} height={30} color={up ? "var(--pos)" : "var(--neg)"} fill={false} strokeWidth={1.4} />
                </div>
                <div className="num" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{fmtUSD(w.price, { full: true, cents: w.price < 1000 })}</div>
                <div className="num" style={{ textAlign: "right", fontSize: 13.5, fontWeight: 600, color: up ? "var(--pos)" : "var(--neg)", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                  {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  {fmtPct(Math.abs(w.chg))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link href={`/onboarding`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 7, padding: "7px 13px" }}>
                    <Plus size={14} /> Add
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No matches.</div>
        )}
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: "var(--ink-3)" }}>
        <Check size={12} /> Demo market list. A personal watchlist with live quotes is coming next.
      </p>
    </div>
  );
}
