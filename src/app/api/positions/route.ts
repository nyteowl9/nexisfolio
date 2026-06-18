import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/db/portfolio";
import { mv } from "@/lib/engine";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ positions: [] });
  const positions = await getPortfolio(supabase);
  return NextResponse.json({
    positions: positions
      .map((p) => ({ id: p.id, name: p.name, ticker: p.ticker, cls: p.cls, qty: p.qty ?? null, price: p.price ?? null, value: mv(p) }))
      .sort((a, b) => b.value - a.value),
  });
}
