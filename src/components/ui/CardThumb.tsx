"use client";

import { useState } from "react";
import { fmtUSD, GRADE_TIERS, type CardPrices } from "@/lib/engine";

/** Card/sealed thumbnail: a typographic slab fallback with the real image painted over it. Never breaks. */
export function CardThumb({
  gameColor = "#8A9099",
  name,
  num,
  setCode,
  sealed,
  badge,
  img,
  w = 96,
}: {
  gameColor?: string;
  name: string;
  num?: string;
  setCode?: string | null;
  sealed?: boolean;
  badge?: string;
  img?: string | null;
  w?: number;
}) {
  const h = sealed ? Math.round(w * 1.18) : Math.round(w * 1.4);
  const initials = (name || "").split(/\s|—|·/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const [broken, setBroken] = useState(false);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 9, overflow: "hidden", flex: "none", border: "var(--hair) solid var(--border)", boxShadow: "var(--shadow)", background: "var(--bg-sunk)" }}>
      <div style={{ position: "absolute", inset: 0, height: sealed ? "100%" : "66%", background: `linear-gradient(150deg, ${gameColor} 0%, color-mix(in oklab, ${gameColor} 62%, #000) 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: w * (sealed ? 0.32 : 0.4), fontWeight: 800, color: "rgba(255,255,255,.92)", letterSpacing: "-.02em" }}>{initials}</span>
        {setCode && <span style={{ position: "absolute", top: 6, left: 7, fontSize: Math.max(8, w * 0.085), fontWeight: 700, color: "rgba(255,255,255,.92)", letterSpacing: ".04em", background: "rgba(0,0,0,.22)", padding: "2px 6px", borderRadius: 5 }}>{setCode}</span>}
      </div>
      {!sealed && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", background: "var(--surface)", padding: "5px 7px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: Math.max(8.5, w * 0.092), fontWeight: 650, color: "var(--ink)", lineHeight: 1.12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{name}</div>
          {num && <div className="num" style={{ fontSize: Math.max(7.5, w * 0.08), color: "var(--ink-3)", marginTop: 2, fontWeight: 600 }}>{num}</div>}
        </div>
      )}
      {sealed && (
        <div style={{ position: "absolute", left: 7, right: 7, bottom: 7 }}>
          <div style={{ fontSize: Math.max(8.5, w * 0.092), fontWeight: 700, color: "rgba(255,255,255,.96)", lineHeight: 1.12 }}>{name}</div>
        </div>
      )}
      {img && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={name} onError={() => setBroken(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", background: "var(--bg-sunk)" }} />
      )}
      {badge && <div style={{ position: "absolute", top: 6, right: 6, background: "var(--ink)", color: "var(--surface)", fontSize: Math.max(8, w * 0.085), fontWeight: 700, padding: "2px 6px", borderRadius: 5, letterSpacing: ".02em", zIndex: 2 }}>{badge}</div>}
    </div>
  );
}

export function GradeLadder({ prices, ownedKey: ok }: { prices: CardPrices | null | undefined; ownedKey: string | null }) {
  if (!prices) return null;
  const max = Math.max(...GRADE_TIERS.map((t) => prices[t.key] || 0)) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {GRADE_TIERS.map((t) => {
        const v = prices[t.key] || 0;
        const owned = t.key === ok;
        return (
          <div key={t.key} style={{ display: "grid", gridTemplateColumns: "74px 1fr 70px", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12, fontWeight: owned ? 700 : 600, color: owned ? "var(--ink)" : "var(--ink-2)" }}>{t.label}</span>
              <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{owned ? "you own this" : t.sub}</span>
            </div>
            <div style={{ height: 9, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden" }}>
              <div style={{ width: `${(v / max) * 100}%`, height: "100%", borderRadius: 99, background: owned ? "var(--accent)" : "color-mix(in oklab, var(--c-private) 55%, var(--bg-sunk))" }} />
            </div>
            <div className="num" style={{ textAlign: "right", fontSize: 12.5, fontWeight: owned ? 700 : 600, color: owned ? "var(--ink)" : "var(--ink-2)" }}>{fmtUSD(v, { full: true })}</div>
          </div>
        );
      })}
    </div>
  );
}
