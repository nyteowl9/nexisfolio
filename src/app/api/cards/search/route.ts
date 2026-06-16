import { NextResponse, type NextRequest } from "next/server";
import { searchProviderCards } from "@/lib/market/cards-provider";

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game") || "pkm";
  const q = req.nextUrl.searchParams.get("q") || "";
  const results = await searchProviderCards(game, q);
  return NextResponse.json({ results });
}
