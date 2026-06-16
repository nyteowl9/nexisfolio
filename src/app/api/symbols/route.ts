import { NextResponse, type NextRequest } from "next/server";
import { searchSymbols } from "@/lib/market/search";
import type { AssetClass } from "@/lib/engine";

export async function GET(req: NextRequest) {
  const cls = (req.nextUrl.searchParams.get("cls") || "crypto") as AssetClass;
  const q = req.nextUrl.searchParams.get("q") || "";
  const results = await searchSymbols(cls, q);
  return NextResponse.json({ results });
}
