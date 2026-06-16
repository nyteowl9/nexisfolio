import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedSamplePortfolio } from "@/lib/db/seed";
import { linkSampleBrokerage, addWallet } from "@/lib/db/positions";
import { ManualAddForm } from "./ManualAddForm";

export const metadata = { title: "Get started — NEXIS FOLIO" };

const STEPS = [
  { n: 1, label: "Brokerage" },
  { n: 2, label: "Crypto wallet" },
  { n: 3, label: "Add by hand" },
  { n: 4, label: "Finish" },
];

const card = "rounded-[10px] border border-[#E7E8EA] bg-white p-6";
const field = "w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]";
const flabel = "mb-1 block text-xs font-semibold text-[#5C6168]";
const primaryBtn = "rounded-full bg-[#15171A] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90";
const ghostBtn = "rounded-full border border-[#E7E8EA] px-5 py-2.5 text-sm font-medium text-[#15171A] transition hover:bg-[#F5F5F6]";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; added?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const step = Math.min(4, Math.max(1, Number(sp.step) || 1));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase.from("positions").select("id", { count: "exact", head: true });
  const assetCount = count ?? 0;

  return (
    <main className="min-h-screen bg-[#FAFAFB] px-4 py-10 text-[#15171A]">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your portfolio</h1>
          <p className="mt-1 text-sm text-[#5C6168]">
            {assetCount} asset{assetCount === 1 ? "" : "s"} added so far · signed in as {user.email}
          </p>
        </div>

        {/* stepper */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs">
          {STEPS.map((s) => (
            <Link
              key={s.n}
              href={`/onboarding?step=${s.n}`}
              className={`rounded-full px-3 py-1 ${
                s.n === step ? "bg-[#15171A] text-white" : "border border-[#E7E8EA] text-[#5C6168]"
              }`}
            >
              {s.n}. {s.label}
            </Link>
          ))}
        </div>

        {sp.added && (
          <p className="mb-4 rounded-md bg-[#E8F6F0] px-3 py-2 text-center text-sm text-[#0E9D6E]">
            Added {sp.added} ✓
          </p>
        )}
        {sp.error && (
          <p className="mb-4 rounded-md bg-[#FDECEC] px-3 py-2 text-center text-sm text-[#E0443E]">
            {sp.error}
          </p>
        )}

        {step === 1 && (
          <div className={card}>
            <h2 className="text-lg font-semibold">Connect a brokerage</h2>
            <p className="mt-1 text-sm text-[#5C6168]">
              Live Plaid / SnapTrade linking arrives in the next phase. For now, load a set of
              sample brokerage holdings to see how it feels.
            </p>
            <form action={linkSampleBrokerage} className="mt-4">
              <button className={primaryBtn}>Load sample brokerage holdings</button>
            </form>

            <div className="my-5 border-t border-[#E7E8EA]" />
            <p className="text-sm font-medium">Just want to look around?</p>
            <p className="mt-1 text-sm text-[#5C6168]">
              Load the full sample portfolio (all seven asset classes) into your account.
            </p>
            <form action={seedSamplePortfolio} className="mt-3">
              <button className={ghostBtn}>Explore the full sample portfolio</button>
            </form>

            <div className="mt-6 flex justify-end">
              <Link href="/onboarding?step=2" className={ghostBtn}>
                Skip / Continue →
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={card}>
            <h2 className="text-lg font-semibold">Add a crypto wallet</h2>
            <p className="mt-1 text-sm text-[#5C6168]">
              Paste a public address — we auto-detect BTC / ETH / SOL. Automatic on-chain balance
              reading comes in the next phase, so enter your quantity for now.
            </p>
            <form action={addWallet} className="mt-4 space-y-3">
              <label className="block">
                <span className={flabel}>Public address</span>
                <input name="address" required placeholder="0x… / bc1… / Sol address" className={field} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={flabel}>Chain (auto if blank)</span>
                  <select name="chain" className={field} defaultValue="">
                    <option value="">Auto-detect</option>
                    <option value="btc">Bitcoin</option>
                    <option value="eth">Ethereum</option>
                    <option value="sol">Solana</option>
                  </select>
                </label>
                <label className="block">
                  <span className={flabel}>Quantity</span>
                  <input name="qty" type="number" step="any" required className={field} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={flabel}>Current price</span>
                  <input name="currentPrice" type="number" step="any" required className={field} />
                </label>
                <label className="block">
                  <span className={flabel}>Cost / unit (optional)</span>
                  <input name="costPerUnit" type="number" step="any" className={field} />
                </label>
              </div>
              <button className={primaryBtn}>Add wallet holding</button>
            </form>

            <div className="mt-6 flex justify-between">
              <Link href="/onboarding?step=1" className={ghostBtn}>← Back</Link>
              <Link href="/onboarding?step=3" className={ghostBtn}>Skip / Continue →</Link>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={card}>
            <h2 className="text-lg font-semibold">Add an asset by hand</h2>
            <p className="mt-1 text-sm text-[#5C6168]">
              Add anything — crypto, stocks, metals, real estate, collectibles, cash, or loans.
              This writes a real position into your database.
            </p>
            <div className="mt-4">
              <ManualAddForm />
            </div>

            <div className="mt-6 flex justify-between">
              <Link href="/onboarding?step=2" className={ghostBtn}>← Back</Link>
              <Link href="/onboarding?step=4" className={ghostBtn}>Continue →</Link>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={`${card} text-center`}>
            <h2 className="text-lg font-semibold">You&apos;re all set</h2>
            <p className="mt-1 text-sm text-[#5C6168]">
              {assetCount > 0
                ? `Your portfolio has ${assetCount} asset${assetCount === 1 ? "" : "s"}.`
                : "You haven't added anything yet — you can still explore the sample portfolio."}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              <Link href="/dashboard" className={primaryBtn}>
                {assetCount > 0 ? `Enter with my ${assetCount} asset${assetCount === 1 ? "" : "s"}` : "Go to dashboard"}
              </Link>
              {assetCount === 0 && (
                <form action={seedSamplePortfolio}>
                  <button className={ghostBtn}>Explore the sample portfolio instead</button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-xs text-[#8A9099] hover:underline">
            Skip setup — go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
