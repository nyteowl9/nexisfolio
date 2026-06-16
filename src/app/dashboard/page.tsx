import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { totals, recompute, fmtUSD, fmtPct, type Position } from "@/lib/engine";
import { POSITIONS, CATALOG, CARD_ITEMS } from "@/lib/sample/sample-data";

export const metadata = { title: "Dashboard — NEXIS FOLIO" };

// Build the sample portfolio (cards aggregate derived from line-items).
function samplePortfolio(): Position[] {
  const positions = POSITIONS.map((p) => ({ ...p }));
  const cards = positions.find((p) => p.id === "cards");
  if (cards) {
    cards.items = CARD_ITEMS;
    const agg = recompute(CARD_ITEMS, CATALOG);
    cards.value = agg.value;
    cards.basis = agg.basis;
    cards.qty = agg.qty;
  }
  return positions;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // TODO Phase 2: load the user's real positions from Postgres.
  // For now we render the engine over the sample portfolio to prove the
  // typed engine drives real React rendering end-to-end.
  const t = totals(samplePortfolio());

  const metrics = [
    { label: "Liquid", value: t.liquid },
    { label: "Illiquid", value: t.illiquid },
    { label: "Loans out", value: t.loansOut },
    { label: "Cost basis", value: t.basis },
    { label: "Total P/L", value: t.pl },
  ];

  return (
    <main className="min-h-screen bg-[#FAFAFB] text-[#15171A]">
      <header className="flex items-center justify-between border-b border-[#E7E8EA] bg-white px-6 py-4">
        <span className="font-semibold tracking-tight">NEXIS FOLIO</span>
        <div className="flex items-center gap-3 text-sm text-[#5C6168]">
          <span>{user.email}</span>
          <form action={signOut}>
            <button className="rounded-full border border-[#E7E8EA] px-3 py-1.5 hover:bg-[#F5F5F6]">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <p className="text-sm text-[#8A9099]">Total net worth</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-5xl font-semibold tabular-nums tracking-tight">
            {fmtUSD(t.net, { full: true })}
          </h1>
          <span className={t.change24 >= 0 ? "text-[#0E9D6E]" : "text-[#E0443E]"}>
            {fmtUSD(t.change24, { full: true })} ({fmtPct(t.changePct, true)})
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[10px] border border-[#E7E8EA] bg-white p-4">
              <p className="text-xs text-[#8A9099]">{m.label}</p>
              <p className="mt-1 text-lg font-medium tabular-nums">
                {fmtUSD(m.value, { full: true })}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded-[10px] border border-dashed border-[#E7E8EA] bg-white p-4 text-sm text-[#8A9099]">
          Showing the <strong>sample portfolio</strong> via the live TypeScript engine. Next
          milestone: load your real holdings from Postgres and rebuild the full Overview, Detail,
          and History views.
        </p>
      </div>
    </main>
  );
}
