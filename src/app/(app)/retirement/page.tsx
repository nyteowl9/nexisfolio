export const metadata = { title: "Retirement — NEXIS FOLIO" };

export default function RetirementPage() {
  return (
    <div className="nw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 36px 64px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Retirement</h1>
      <div style={{ marginTop: 24, background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        Coast-FIRE planner (two-age hero, projection chart, Monte-Carlo, levers) — building next.
        The engine (retirement / Monte-Carlo) is already ported and ready.
      </div>
    </div>
  );
}
