import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { RetirementPlanner } from "@/components/app/Retirement";

export const metadata = { title: "Retirement — NEXIS FOLIO" };

export default async function RetirementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const positions = await getPortfolio(supabase);
  return <RetirementPlanner positions={positions} />;
}
