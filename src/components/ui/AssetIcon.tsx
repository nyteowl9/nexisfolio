"use client";

import { useState } from "react";
import { CLASSES, type AssetClass } from "@/lib/engine";
import { assetLogo } from "@/lib/assetLogo";

/** Real brand logo (crypto/stock) over a colored monogram fallback. Never breaks. */
export function AssetIcon({
  cls,
  ticker,
  name,
  size = 36,
  radius = 9,
}: {
  cls: AssetClass;
  ticker?: string | null;
  name?: string;
  size?: number;
  radius?: number;
}) {
  const c = CLASSES[cls];
  const txt =
    ticker && ticker !== "—"
      ? ticker.slice(0, 4)
      : (name || "").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  const logo = assetLogo(cls, ticker);
  const [broken, setBroken] = useState(false);
  const showLogo = logo && !broken;
  const fs = size <= 32 ? 9.5 : size <= 40 ? 10.5 : size <= 48 ? 13 : 16;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: showLogo ? "#FFFFFF" : `var(--t-${cls})`,
        color: c.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fs,
        fontWeight: 700,
        position: "relative",
        overflow: "hidden",
        flex: "none",
        border: showLogo ? "var(--hair) solid var(--border)" : "none",
      }}
    >
      {txt}
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={txt}
          onError={() => setBroken(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: Math.round(size * 0.17),
            boxSizing: "border-box",
            background: "#FFFFFF",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
