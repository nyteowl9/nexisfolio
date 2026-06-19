"use client";

import { useFormStatus } from "react-dom";
import { addWallet } from "@/lib/db/positions";

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" };
const input: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };

function SyncButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} style={{ width: "100%", padding: "9px", textAlign: "center", background: pending ? "var(--bg-sunk)" : "var(--accent)", color: pending ? "var(--ink-3)" : "var(--accent-ink)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 650, cursor: pending ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
      {pending ? "Reading the chain…" : "Connect & sync"}
    </button>
  );
}

export function WalletConnect() {
  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--t-crypto)" }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Crypto wallet</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>
          Paste a public BTC / ETH / SOL address — we read your live balances on-chain (read-only, no keys).
        </div>
      </div>
      <form action={addWallet} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <input type="hidden" name="from" value="/connections" />
        <input name="address" required placeholder="0x… / bc1… / Solana address" style={input} />
        <SyncButton />
      </form>
    </div>
  );
}
