export const metadata = { title: "Tax — NEXIS FOLIO" };

export default function TaxPage() {
  return (
    <div className="nw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px 64px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Tax Center</h1>
      <div style={{ marginTop: 24, background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        Realized gains, FIFO/LIFO/HIFO selector, disposals table, and exports — building next.
        The lot-matching + taxSummary engine is ported (⚠️ exports stay &ldquo;draft&rdquo; pending CPA validation).
      </div>
    </div>
  );
}
