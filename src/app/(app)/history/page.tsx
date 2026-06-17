import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getSnapshots } from "@/lib/db/snapshots";
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
  const net = totals(positions).net;
  const snapshots = await getSnapshots(supabase);
  const { data } = await supabase
    .from("transactions")
    .select("id,tx_date,type,cls,ticker,name,qty,price,amount,account,source,note")
    .order("tx_date", { ascending: false });

  return <HistoryView net={net} snapshots={snapshots} transactions={(data ?? []) as LedgerTx[]} />;
}
