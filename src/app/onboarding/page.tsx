import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedSamplePortfolio } from "@/lib/db/seed";
import { addWallet, linkSampleBrokerage, removePosition } from "@/lib/db/positions";
import { CLASSES, type AssetClass } from "@/lib/engine";
import { AddAssetForm } from "./AddAssetForm";

export const metadata = { title: "Get started — NEXIS FOLIO" };

const card = "rounded-[12px] border border-[#E7E8EA] bg-white p-6";
const ghostBtn =
  "rounded-full border border-[#E7E8EA] px-4 py-2 text-sm font-medium text-[#15171A] transition hover:bg-[#F5F5F6]";
const field = "w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]";
const flabel = "mb-1 block text-xs font-semibold text-[#5C6168]";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; error?: string; cleared?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: positions } = await supabase
    .from("positions")
    .select("id,name,cls,ticker")
    .order("created_at", { ascending: false });
  const list = (positions ?? []) as { id: string; name: string; cls: AssetClass; ticker: string | null }[];
  const n = list.length;

  return (
    <main className="min-h-screen bg-[#FAFAFB] text-[#15171A]">
      <header className="flex items-center justify-between border-b border-[#E7E8EA] bg-white px-6 py-4">
        <span className="font-semibold tracking-tight">NEXIS FOLIO</span>
        <Link href="/dashboard" className="text-sm font-medium text-[#5C6168] hover:text-[#15171A]">
          Skip to dashboard →
        </Link>
      </header>

      <div className="mx-auto max-w-[980px] px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Add your first few assets</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[#5C6168]">
          Everything here is optional. Add a few things to bring your dashboard to life — you can
          always add more, connect brokerages, and link wallets later from your dashboard. No rush
          to enter everything now.
        </p>

        {sp.added && (
          <p className="mt-4 rounded-md bg-[#E8F6F0] px-3 py-2 text-sm text-[#0E9D6E]">Added {sp.added} ✓</p>
        )}
        {sp.cleared && (
          <p className="mt-4 rounded-md bg-[#EEF1F4] px-3 py-2 text-sm text-[#5C6168]">
            Portfolio cleared — you&apos;re starting fresh.
          </p>
        )}
        {sp.error && (
          <p className="mt-4 rounded-md bg-[#FDECEC] px-3 py-2 text-sm text-[#E0443E]">{sp.error}</p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* main: add asset */}
          <div className={card}>
            <h2 className="text-lg font-semibold">Add an asset</h2>
            <p className="mt-1 mb-4 text-sm text-[#5C6168]">
              Pick a coin, stock, or metal and the live price fills in automatically — or add real
              estate, collectibles, cash, or loans by value.
            </p>
            <AddAssetForm />
          </div>

          {/* aside */}
          <div className="space-y-6">
            {/* added so far */}
            <div className={card}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Added so far</h3>
                <span className="text-sm font-semibold tabular-nums text-[#5C6168]">{n}</span>
              </div>
              {n === 0 ? (
                <p className="mt-3 text-sm text-[#8A9099]">Nothing yet — add your first asset.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 flex-none rounded-full"
                          style={{ background: CLASSES[p.cls]?.color ?? "#999" }}
                        />
                        <span className="truncate text-sm">
                          {p.ticker && p.ticker !== "—" ? `${p.ticker} · ` : ""}
                          {p.name}
                        </span>
                      </span>
                      <form action={removePosition}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="from" value="/onboarding" />
                        <button className="flex-none text-xs text-[#8A9099] hover:text-[#E0443E]">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/dashboard"
                className="mt-4 block rounded-full bg-[#15171A] py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                {n > 0 ? `Enter with my ${n} asset${n === 1 ? "" : "s"}` : "Go to dashboard"}
              </Link>
            </div>

            {/* quick wallet add */}
            <div className={card}>
              <h3 className="text-sm font-semibold">Add a crypto wallet</h3>
              <p className="mt-1 mb-3 text-xs text-[#8A9099]">
                Auto-detects BTC/ETH/SOL. Live balance reading comes later — enter quantity for now.
              </p>
              <form action={addWallet} className="space-y-2">
                <input name="address" required placeholder="0x… / bc1… / Sol address" className={field} />
                <div className="grid grid-cols-2 gap-2">
                  <input name="qty" type="number" step="any" required placeholder="Quantity" className={field} />
                  <input name="costPerUnit" type="number" step="any" placeholder="Cost/unit" className={field} />
                </div>
                <button className={`${ghostBtn} w-full`}>Add wallet</button>
              </form>
            </div>

            {/* secondary options */}
            <div className={card}>
              <h3 className="text-sm font-semibold">Other ways to start</h3>
              <p className="mt-1 mb-3 text-xs text-[#8A9099]">
                Live brokerage linking (Plaid/SnapTrade) arrives soon — you&apos;ll connect it from
                your dashboard.
              </p>
              <div className="space-y-2">
                <form action={linkSampleBrokerage}>
                  <button className={`${ghostBtn} w-full`}>Load sample brokerage holdings</button>
                </form>
                <form action={seedSamplePortfolio}>
                  <button className={`${ghostBtn} w-full`}>Explore the full sample portfolio</button>
                </form>
              </div>
              <p className="mt-3 text-[11px] text-[#8A9099]">
                Loaded the sample and want your own? You can wipe it anytime from the dashboard
                (&ldquo;Start over&rdquo;).
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
