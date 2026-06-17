import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getCatalogFor } from "@/lib/db/catalog";
import { getPrefs } from "@/lib/db/prefs";
import { fetchPriceHistory } from "@/lib/market/history";
import { isUnitPriced, taxSummary, type AssetClass, type Catalog, type Disposal } from "@/lib/engine";
import { AssetDetail } from "@/components/app/AssetDetail";

export const metadata = { title: "Asset — NEXIS FOLIO" };

interface DisposalRow {
  id: string;
  cls: AssetClass;
  ticker: string | null;
  qty: number;
  proceeds: number;
  sold_date: string;
  lot_snapshot: unknown;
}

export default async function DetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ addcards?: string }> }) {
  const { id } = await params;
  const { addcards } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const position = positions.find((p) => p.id === id);
  if (!position) redirect("/dashboard");

  // Merged catalog (sample + provider-synced card_catalog) for pricing cards.
  let catalog: Catalog | undefined;
  if (position.items?.length) {
    catalog = await getCatalogFor(supabase, position.items.map((i) => i.catId).filter(Boolean) as string[]);
  }

  // realized P/L for this asset (FIFO) from disposals
  let realized = 0;
  if (position.ticker && position.ticker !== "—") {
    const { data } = await supabase.from("disposals").select("id,cls,ticker,qty,proceeds,sold_date,lot_snapshot");
    const disposals: Disposal[] = ((data ?? []) as DisposalRow[]).map((d) => {
      const snap = d.lot_snapshot;
      const base = { id: d.id, cls: d.cls, asset: d.ticker ?? "", qty: d.qty, proceeds: d.proceeds, date: d.sold_date };
      if (Array.isArray(snap)) {
        // live trade: consumed-lot snapshot → matched per method
        return { ...base, lotsSnapshot: snap as Disposal["lotsSnapshot"] };
      }
      const m = snap as { lots?: Disposal["lots"]; acq?: Disposal["acq"] } | null;
      return { ...base, lots: m?.lots, acq: m?.acq };
    });
    const { costBasis: method } = await getPrefs(supabase);
    realized = taxSummary(disposals, { method }).rows
      .filter((r) => r.asset === position.ticker)
      .reduce((s, r) => s + r.gain, 0);
  }

  // Real historical price line for market holdings.
  let priceHistory: number[] | null = null;
  if (isUnitPriced(position.cls) && position.ticker && position.ticker !== "—") {
    priceHistory = await fetchPriceHistory(position.cls, position.ticker);
  }

  return <AssetDetail position={position} realized={realized} catalog={catalog} autoOpenCatalog={addcards === "1"} priceHistory={priceHistory} />;
}
