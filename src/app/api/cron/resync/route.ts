import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWallet, detectChainKey } from "@/lib/db/wallet-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled re-sync of every connected wallet (Vercel Cron). Uses the admin
 * client to sweep all users' wallet connections and refresh their balances.
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: conns } = await admin
    .from("connections")
    .select("id,user_id,external_id")
    .eq("provider", "wallet")
    .not("external_id", "is", null);

  let wallets = 0, holdings = 0;
  for (const c of conns ?? []) {
    const addr = c.external_id as string;
    const chainKey = detectChainKey(addr);
    if (!chainKey) continue;
    try {
      const { added } = await syncWallet(admin, c.user_id as string, chainKey, addr);
      wallets++;
      holdings += added;
    } catch {
      /* skip a failing wallet, continue the sweep */
    }
  }
  return NextResponse.json({ ok: true, wallets, holdings });
}
