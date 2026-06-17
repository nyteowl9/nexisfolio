import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getSnapshots } from "@/lib/db/snapshots";
import { reconstructNetWorth } from "@/lib/db/networth-history";
import { getLiabilities, debtTotal } from "@/lib/db/liabilities";
import { totals } from "@/lib/engine";
import { HistoryView, type LedgerTx } from "@/components/app/HistoryView";

export const metadata = { title: "History — NEXIS FOLIO" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const liabilities = await getLiabilities(supabase);
  const net = totals(positions).net - debtTotal(liabilities);
  const [recorded, recon] = await Promise.all([getSnapshots(supabase), reconstructNetWorth(supabase, positions, liabilities)]);
  // prefer the reconstructed historical curve (shows real ups/downs); else recorded snapshots
  const snapshots = recon.length >= 2 ? recon : recorded;
  const { data } = await supabase
    .from("transactions")
    .select("id,tx_date,type,cls,ticker,name,qty,price,amount,account,source,note")
    .order("tx_date", { ascending: false });

  return <HistoryView net={net} snapshots={snapshots} transactions={(data ?? []) as LedgerTx[]} />;
}
