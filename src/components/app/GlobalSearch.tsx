"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtUSD, type AssetClass } from "@/lib/engine";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { Search } from "@/components/ui/icons";

interface Pos { id: string; name: string; ticker: string | null; cls: AssetClass; value: number }
const PAGES: Array<[string, string]> = [
  ["Overview", "/dashboard"], ["History", "/history"], ["Watchlist", "/watchlist"],
  ["News", "/news"], ["Retirement", "/retirement"], ["Tax Center", "/tax"], ["Connections", "/connections"],
];

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [positions, setPositions] = useState<Pos[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/positions").then((r) => r.json()).then((j) => setPositions((j.positions as Pos[]) ?? []));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const query = q.trim().toLowerCase();
  const posMatches = (query ? positions.filter((p) => `${p.name} ${p.ticker ?? ""}`.toLowerCase().includes(query)) : positions.slice().sort((a, b) => b.value - a.value)).slice(0, 8);
  const pageMatches = PAGES.filter(([label]) => !query || label.toLowerCase().includes(query));
  const go = (href: string) => { router.push(href); onClose(); };
  const first = () => { if (posMatches[0]) go(`/detail/${posMatches[0].id}`); else if (pageMatches[0]) go(pageMatches[0][1]); };

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "var(--font-sans)" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", padding: "12vh 16px 16px" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.5)" }} />
      <div style={{ position: "relative", width: 560, maxWidth: "100%", maxHeight: "72vh", display: "flex", flexDirection: "column", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.34)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "var(--hair) solid var(--border)" }}>
          <Search size={17} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") first(); }} placeholder="Search holdings & pages…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--ink)", fontFamily: "var(--font-sans)" }} />
          <span style={{ fontSize: 11, color: "var(--ink-3)", border: "var(--hair) solid var(--border)", borderRadius: 5, padding: "2px 6px" }}>esc</span>
        </div>
        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {posMatches.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 16px 4px" }}>Holdings</div>
              {posMatches.map((p) => (
                <button key={p.id} onMouseDown={() => go(`/detail/${p.id}`)} style={row}>
                  <AssetIcon cls={p.cls} ticker={p.ticker} name={p.name} size={26} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 550 }}>{p.name}{p.ticker && p.ticker !== "—" ? <span style={{ color: "var(--ink-3)", fontWeight: 450 }}> · {p.ticker}</span> : null}</span>
                  <span className="num" style={{ fontSize: 13, color: "var(--ink-2)" }}>{fmtUSD(p.value)}</span>
                </button>
              ))}
            </>
          )}
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 16px 4px" }}>Pages</div>
          {pageMatches.map(([label, href]) => (
            <button key={href} onMouseDown={() => go(href)} style={row}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-sunk)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", flex: "none" }}><Search size={13} /></span>
              <span style={{ fontSize: 14, fontWeight: 550 }}>{label}</span>
            </button>
          ))}
          {query && posMatches.length === 0 && pageMatches.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No matches for &ldquo;{q}&rdquo;.</div>
          )}
        </div>
      </div>
    </div>
  );
}
