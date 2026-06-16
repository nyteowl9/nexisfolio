import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { taxSummary, type AssetClass, type Disposal } from "@/lib/engine";
import { AssetDetail } from "@/components/app/AssetDetail";

export const metadata = { title: "Asset — NEXIS FOLIO" };

interface DisposalRow {
  id: string;
  cls: AssetClass;
  ticker: string | null;
  qty: number;
  proceeds: number;
  sold_date: string;
  lot_snapshot: { lots?: Record<string, number>; acq?: Record<string, string> } | null;
}

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const position = positions.find((p) => p.id === id);
  if (!position) redirect("/dashboard");

  // realized P/L for this asset (FIFO) from disposals
  let realized = 0;
  if (position.ticker && position.ticker !== "—") {
    const { data } = await supabase.from("disposals").select("id,cls,ticker,qty,proceeds,sold_date,lot_snapshot");
    const disposals: Disposal[] = ((data ?? []) as DisposalRow[]).map((d) => ({
      id: d.id,
      cls: d.cls,
      asset: d.ticker ?? "",
      qty: d.qty,
      proceeds: d.proceeds,
      date: d.sold_date,
      lots: d.lot_snapshot?.lots as Disposal["lots"],
      acq: d.lot_snapshot?.acq as Disposal["acq"],
    }));
    realized = taxSummary(disposals, { method: "FIFO" }).rows
      .filter((r) => r.asset === position.ticker)
      .reduce((s, r) => s + r.gain, 0);
  }

  return <AssetDetail position={position} realized={realized} />;
}
