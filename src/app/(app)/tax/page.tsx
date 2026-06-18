import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getPrefs } from "@/lib/db/prefs";
import { taxSummary, mv, costBasis, isUnitPriced, type AssetClass, type Disposal, type AccountingMethod, type LoanInterest } from "@/lib/engine";
import { TaxCenter, type HarvestRow } from "@/components/app/TaxCenter";

export const metadata = { title: "Tax Center — NEXIS FOLIO" };

interface DisposalRow {
  id: string;
  cls: AssetClass;
  ticker: string | null;
  qty: number;
  proceeds: number;
  sold_date: string;
  lot_snapshot: unknown;
}

const METHODS: AccountingMethod[] = ["FIFO", "LIFO", "HIFO"];

export default async function TaxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const prefs = await getPrefs(supabase);
  const { data: dz } = await supabase.from("disposals").select("id,cls,ticker,qty,proceeds,sold_date,lot_snapshot");

  const year = new Date().getFullYear();
  const disposals: Disposal[] = ((dz ?? []) as DisposalRow[])
    .filter((d) => new Date(d.sold_date).getFullYear() === year)
    .map((d) => {
      const snap = d.lot_snapshot;
      const base = { id: d.id, cls: d.cls, asset: d.ticker ?? "", qty: d.qty, proceeds: d.proceeds, date: d.sold_date };
      if (Array.isArray(snap)) return { ...base, lotsSnapshot: snap as Disposal["lotsSnapshot"] };
      const m = snap as { lots?: Disposal["lots"]; acq?: Disposal["acq"] } | null;
      return { ...base, lots: m?.lots, acq: m?.acq };
    });

  // Interest earned on loans you made (ordinary income).
  const loanInterest: LoanInterest[] = positions
    .filter((p) => p.cls === "loans" && p.loan && (p.loan.interestYtd ?? 0) > 0)
    .map((p) => ({ name: p.name, amt: p.loan!.interestYtd }));

  const summaries = Object.fromEntries(
    METHODS.map((method) => [method, taxSummary(disposals, { method, loanInterest })])
  ) as Record<AccountingMethod, ReturnType<typeof taxSummary>>;

  // Tax-loss harvesting candidates: holdings currently below cost basis.
  const harvest: HarvestRow[] = positions
    .filter((p) => {
      if (p.cls === "loans" || p.cls === "cash") return false;
      const v = mv(p), b = costBasis(p);
      return b > 0 && v < b;
    })
    .map((p) => ({ id: p.id, name: p.name, ticker: p.ticker && p.ticker !== "—" ? p.ticker : null, cls: p.cls, value: mv(p), basis: costBasis(p), loss: mv(p) - costBasis(p), live: isUnitPriced(p.cls) }))
    .sort((a, b) => a.loss - b.loss);

  return <TaxCenter summaries={summaries} method={prefs.costBasis} year={year} harvest={harvest} />;
}
