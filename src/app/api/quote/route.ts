import { NextResponse, type NextRequest } from "next/server";
import { fetchQuote } from "@/lib/market/quote";
import type { AssetClass } from "@/lib/engine";

export async function GET(req: NextRequest) {
  const cls = (req.nextUrl.searchParams.get("cls") || "crypto") as AssetClass;
  const ticker = req.nextUrl.searchParams.get("ticker") || "";
  const providerId = req.nextUrl.searchParams.get("id") || undefined;
  if (!ticker) return NextResponse.json({ quote: null });
  const quote = await fetchQuote(cls, ticker, providerId);
  return NextResponse.json({ quote });
}
