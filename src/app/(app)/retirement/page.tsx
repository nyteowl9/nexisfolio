import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { getLiabilities } from "@/lib/db/liabilities";
import { RetirementPlanner } from "@/components/app/Retirement";

export const metadata = { title: "Retirement — NEXIS FOLIO" };

export default async function RetirementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  const liabilities = await getLiabilities(supabase);

  // Debt that reduces investable wealth: everything except a mortgage on real
  // estate (the home is excluded from the investable base by default anyway).
  const investableDebt = liabilities.reduce((s, l) => {
    const coll = l.collateral_position_id ? positions.find((p) => p.id === l.collateral_position_id) : null;
    const securedByRealEstate = coll?.cls === "realest";
    return s + (securedByRealEstate ? 0 : l.balance || 0);
  }, 0);

  return <RetirementPlanner positions={positions} debt={investableDebt} />;
}
