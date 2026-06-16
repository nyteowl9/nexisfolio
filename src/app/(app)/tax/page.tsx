export const metadata = { title: "Tax Center — NEXIS FOLIO" };

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" };

/** Decorative blurred backdrop hinting at the real Tax Center, behind a glass overlay. */
export default function TaxPage() {
  const bars = [
    { label: "Short-term", v: 64, c: "var(--c-crypto)" },
    { label: "Long-term", v: 88, c: "var(--c-realest)" },
    { label: "Crypto", v: 52, c: "var(--c-crypto)" },
    { label: "Stocks", v: 71, c: "var(--c-stocks)" },
    { label: "Metals", v: 28, c: "var(--c-metals)" },
  ];
  return (
    <div className="nw-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 36px 64px", position: "relative" }}>
      <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Tax Center</h1>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 5 }}>Realized gains, cost-basis methods & filing exports</div>

      <div style={{ position: "relative", marginTop: 22 }}>
        {/* blurred faux content */}
        <div style={{ filter: "blur(7px)", opacity: 0.55, pointerEvents: "none", userSelect: "none" }} aria-hidden>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            {[["Realized gains", "$24,180"], ["Realized losses", "$3,920"], ["Net capital gain", "$20,260"], ["Loan interest", "$1,120"], ["Est. tax", "$5,410"]].map(([l, v], i) => (
              <div key={i} style={{ ...card, flex: 1, minWidth: 150, padding: "17px 19px" }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 11 }}>{l}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: "22px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 18, alignItems: "flex-end", height: 140 }}>
              {bars.map((b) => (
                <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", height: `${b.v}%`, background: b.c, borderRadius: 8, opacity: 0.85 }} />
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card, overflow: "hidden" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, padding: "13px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <div key={j} style={{ height: 12, borderRadius: 4, background: "var(--bg-sunk)" }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* glass overlay */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...card, padding: "32px 40px", textAlign: "center", maxWidth: 440, backdropFilter: "blur(2px)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c-loans)", background: "var(--t-loans)", padding: "5px 12px", borderRadius: 99 }}>
              Coming soon
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 650, margin: "16px 0 8px", letterSpacing: "-.01em" }}>Tax Center is on the way</h2>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
              FIFO / LIFO / HIFO cost-basis, a realized-gains disposals table, and Form 8949 /
              Schedule D / TurboTax exports. The lot-matching engine is already built — exports will
              ship <strong>only after CPA validation</strong>, labeled &ldquo;draft&rdquo; until then.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
