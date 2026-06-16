import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { totals, fmtUSD, fmtPct } from "@/lib/engine";
import { getPortfolio } from "@/lib/db/portfolio";
import { seedSamplePortfolio } from "@/lib/db/seed";

export const metadata = { title: "Dashboard — NEXIS FOLIO" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const hasData = positions.length > 0;
  const t = totals(positions);

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
        {!hasData ? (
          <div className="rounded-[10px] border border-dashed border-[#E7E8EA] bg-white p-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to NEXIS FOLIO</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5C6168]">
              Your portfolio is empty. Run setup to connect a brokerage, add a wallet, or add assets
              by hand — or load the full sample portfolio to explore.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/onboarding"
                className="rounded-full bg-[#15171A] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Set up my portfolio
              </Link>
              <form action={seedSamplePortfolio}>
                <button className="rounded-full border border-[#E7E8EA] px-5 py-2.5 text-sm font-medium text-[#15171A] transition hover:bg-[#F5F5F6]">
                  Load sample portfolio
                </button>
              </form>
            </div>
            <p className="mt-4 text-xs text-[#8A9099]">
              Signed in as {user.email} · live Postgres + Row-Level Security active.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}
