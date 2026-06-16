"use client";

import { useState } from "react";
import { NEWS, type NewsItem } from "@/lib/sample/market";
import { CLASSES, type AssetClass } from "@/lib/engine";
import { ArrowUp, ArrowDown, Dot } from "@/components/ui/icons";

const SENT = {
  pos: { color: "var(--pos)", label: "Bullish", Icon: ArrowUp },
  neg: { color: "var(--neg)", label: "Bearish", Icon: ArrowDown },
  neutral: { color: "var(--ink-3)", label: "Neutral", Icon: Dot },
} as const;

function Tickers({ cls, tickers }: { cls: AssetClass; tickers: string[] }) {
  const c = CLASSES[cls];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: c.color, background: `var(--t-${cls})`, padding: "2px 9px", borderRadius: 99 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: c.color }} />
        {c.label.split(" ")[0]}
      </span>
      {tickers.map((t) => (
        <span key={t} className="num" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg-sunk)", padding: "2px 8px", borderRadius: 99 }}>{t}</span>
      ))}
    </div>
  );
}

export function NewsFeed() {
  const [filter, setFilter] = useState<string>("all");
  const top = NEWS.filter((n) => n.top).slice(0, 3);
  let rest = NEWS.filter((n) => !n.top);
  const classesIn = [...new Set(NEWS.map((n) => n.cls))];
  if (filter !== "all") rest = rest.filter((n) => n.cls === filter);

  return (
    <div className="nw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px 64px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>News</h1>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 5 }}>Curated for your holdings & watchlist · demo feed</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 12 }}>Today&apos;s top 3</div>
      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {top.map((n, i) => {
          const s = SENT[n.sentiment];
          return (
            <div key={n.id} style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 20, display: "flex", flexDirection: "column", gap: 12, borderTop: `2px solid ${CLASSES[n.cls].color}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="num" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)" }}>0{i + 1}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: s.color }}><s.Icon size={12} /> {s.label}</span>
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.32, color: "var(--ink)", letterSpacing: "-.01em" }}>{n.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, flex: 1 }}>{n.summary}</div>
              <Tickers cls={n.cls} tickers={n.tickers} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-3)", paddingTop: 4, borderTop: "var(--hair) solid var(--border)" }}>
                <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{n.source}</span> <span>·</span> <span>{n.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase" }}>More from your portfolio</div>
        <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
          {([["all", "All"]] as Array<[string, string]>).concat(classesIn.map((k) => [k, CLASSES[k].label.split(" ")[0]])).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: filter === k ? "var(--ink)" : "var(--ink-3)", background: filter === k ? "var(--surface)" : "transparent", boxShadow: filter === k ? "var(--shadow)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        {rest.length ? (
          rest.map((n: NewsItem) => {
            const s = SENT[n.sentiment];
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "17px 24px", borderTop: "var(--hair) solid var(--border)" }}>
                <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: CLASSES[n.cls].color, flex: "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35, marginBottom: 5 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 9 }}>{n.summary}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Tickers cls={n.cls} tickers={n.tickers} />
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}><span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{n.source}</span> · {n.time}</span>
                  </div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: s.color, flex: "none" }}><s.Icon size={12} /> {s.label}</span>
              </div>
            );
          })
        ) : (
          <div style={{ padding: 36, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No stories in this class today.</div>
        )}
      </div>
    </div>
  );
}
