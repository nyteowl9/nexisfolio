import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLASSES, fmtUSD, type AssetClass } from "@/lib/engine";
import { WalletConnect } from "@/components/app/WalletConnect";

export const metadata = { title: "Connections — NEXIS FOLIO" };

interface ConnRow {
  id: string;
  provider: string;
  type: string;
  status: string;
  asset_class: AssetClass | null;
  display_name: string | null;
  last_synced: string | null;
  value: number | null;
}

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" };

function AddCard({ title, desc, cta, href, accent, soon }: { title: string; desc: string; cta: string; href: string; accent: string; soon?: boolean }) {
  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: accent }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {soon ? (
        <span style={{ marginTop: "auto", padding: "9px", textAlign: "center", background: "var(--bg-sunk)", color: "var(--ink-3)", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>{cta}</span>
      ) : (
        <Link href={href} style={{ marginTop: "auto", padding: "9px", textAlign: "center", background: "var(--bg-sunk)", color: "var(--ink)", border: "var(--hair) solid var(--border)", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>{cta}</Link>
      )}
    </div>
  );
}

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ added?: string; error?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { added, error } = await searchParams;
  const { data } = await supabase.from("connections").select("*").order("created_at", { ascending: false });
  const conns = (data ?? []) as ConnRow[];

  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 36px 64px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Connections</h1>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 5 }}>{conns.length} linked source{conns.length === 1 ? "" : "s"}</div>
      </div>

      {(added || error) && (
        <div style={{ ...card, padding: "12px 16px", marginBottom: 16, fontSize: 13, fontWeight: 500, color: error ? "var(--neg)" : "var(--pos)", borderLeft: `3px solid ${error ? "var(--neg)" : "var(--pos)"}` }}>
          {error ? error : `Wallet connected — ${added}.`}
        </div>
      )}

      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        <AddCard title="Brokerage & bank" desc="Plaid / SnapTrade — Fidelity, Schwab, Robinhood, IBKR & 12,000+ institutions." cta="Coming soon" href="#" accent="var(--t-stocks)" soon />
        <WalletConnect />
        <AddCard title="Manual asset" desc="Real estate, collectibles, cash, or a loan you made — value it yourself." cta="Add manually" href="/onboarding" accent="var(--t-private)" />
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "15px 22px", borderBottom: "var(--hair) solid var(--border)", fontSize: 14, fontWeight: 600 }}>Linked sources</div>
        {conns.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            No connections yet. Add a wallet or manual assets from setup.
          </div>
        ) : (
          conns.map((c, i) => {
            const cl = c.asset_class ? CLASSES[c.asset_class] : null;
            return (
              <div key={c.id} className="nw-conn" style={{ display: "grid", gridTemplateColumns: "1fr 150px 160px 130px", alignItems: "center", gap: 12, padding: "14px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>{c.display_name || c.provider}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, textTransform: "capitalize" }}>{c.provider} · {c.type}</div>
                </div>
                <div>
                  {cl && (
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: cl.color, background: `var(--t-${c.asset_class})`, padding: "3px 9px", borderRadius: 99 }}>{cl.label.split(" ")[0]}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--pos)", fontWeight: 500 }}>
                  {c.status} {c.last_synced ? `· ${new Date(c.last_synced).toLocaleDateString()}` : ""}
                </div>
                <div className="num" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.value != null ? fmtUSD(c.value) : "—"}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
