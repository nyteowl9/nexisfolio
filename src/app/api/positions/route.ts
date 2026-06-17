import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ positions: [] });
  const { data } = await supabase.from("positions").select("id,name,ticker,cls,qty").order("name");
  return NextResponse.json({ positions: data ?? [] });
}
