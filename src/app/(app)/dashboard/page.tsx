import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedSamplePortfolio } from "@/lib/db/seed";
import { getPortfolio } from "@/lib/db/portfolio";
import { ClearPortfolioButton } from "@/components/app/ClearPortfolioButton";
import { recordSnapshot } from "@/lib/db/snapshots";
import { refreshStalePrices } from "@/lib/db/refresh";
import { reconstructNetWorth } from "@/lib/db/networth-history";
import { getLiabilities, debtTotal } from "@/lib/db/liabilities";
import { totals } from "@/lib/engine";
import { Overview } from "@/components/app/Overview";
import { LiabilitiesCard } from "@/components/app/LiabilitiesCard";

export const metadata = { title: "Dashboard — NEXIS FOLIO" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await refreshStalePrices();
  const positions = await getPortfolio(supabase);
  const liabilities = await getLiabilities(supabase);
  const debt = debtTotal(liabilities);
  const hasData = positions.length > 0 || liabilities.length > 0;
  if (positions.length > 0) await recordSnapshot(supabase, user.id, totals(positions), debt);

  if (!hasData) {
    return (
      <div className="nw-page" style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.02em" }}>Welcome to NEXIS FOLIO</h1>
          <p style={{ margin: "8px auto 0", maxWidth: 420, fontSize: 14, color: "var(--ink-2)" }}>
            Your portfolio is empty. Add a few assets to bring your dashboard to life — or load the
            full sample portfolio to explore.
          </p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/onboarding" style={{ background: "var(--accent)", color: "var(--accent-ink)", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600 }}>
              Set up my portfolio
            </Link>
            <form action={seedSamplePortfolio}>
              <button style={{ background: "var(--surface)", color: "var(--ink)", border: "var(--hair) solid var(--border)", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Load sample portfolio
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const history = await reconstructNetWorth(supabase, positions, liabilities);

  return (
    <>
      <Overview positions={positions} history={history} debt={debt} />
      <LiabilitiesCard liabilities={liabilities} positions={positions} />
      <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 36px 56px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Link href="/onboarding" style={{ background: "var(--surface)", color: "var(--ink)", border: "var(--hair) solid var(--border)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
          Add or manage assets
        </Link>
        <ClearPortfolioButton />
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Clearing deletes your holdings so you can build your own — your account stays.</span>
      </div>
    </>
  );
}
