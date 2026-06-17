"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mv, fmtUSD, type Position } from "@/lib/engine";
import { addLiability, updateLiability, deleteLiability } from "@/lib/db/liabilities-actions";
import type { Liability } from "@/lib/db/liabilities";

const KINDS: Array<[string, string]> = [
  ["crypto_loan", "Crypto-backed"],
  ["mortgage", "Mortgage"],
  ["margin", "Margin"],
  ["auto", "Auto"],
  ["personal", "Personal"],
  ["credit", "Credit card"],
  ["other", "Other"],
];
const kindLabel = (k: string) => KINDS.find((x) => x[0] === k)?.[1] ?? k;
const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" };
const dInput: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const dLabel: React.CSSProperties = { fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6, display: "block" };

function ltvInfo(l: Liability, positions: Position[]) {
  const pos = l.collateral_position_id ? positions.find((p) => p.id === l.collateral_position_id) : null;
  if (!pos) return null;
  const cv = mv(pos);
  if (cv <= 0) return null;
  const ltv = (l.balance / cv) * 100;
  const liq = l.liq_ltv ?? (l.kind === "crypto_loan" || l.kind === "margin" ? 80 : null);
  const dropTol = liq ? Math.max(0, (1 - ltv / liq) * 100) : null;
  return { pos, cv, ltv, liq, dropTol };
}

function Drawer({ liab, positions, onClose, onSaved }: { liab: Liability | "new"; positions: Position[]; onClose: () => void; onSaved: () => void }) {
  const e = liab === "new" ? null : liab;
  const [kind, setKind] = useState(e?.kind ?? "crypto_loan");
  const showLiq = kind === "crypto_loan" || kind === "margin";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (<label style={{ display: "block" }}><span style={dLabel}>{label}</span>{children}</label>);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{e ? "Edit debt" : "Add debt"}</span>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15 }}>✕</button>
        </div>
        <form action={async (fd) => { if (e) await updateLiability(fd); else await addLiability(fd); onClose(); onSaved(); }} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          {e && <input type="hidden" name="id" value={e.id} />}
          <F label="Name"><input name="name" defaultValue={e?.name ?? ""} placeholder="Morpho BTC loan" style={dInput} /></F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Type"><select name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)} style={{ ...dInput, cursor: "pointer" }}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
            <F label="APR %"><input name="rate" type="number" step="any" defaultValue={e?.rate ?? ""} placeholder="4" style={dInput} /></F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Balance owed"><input name="balance" type="number" step="any" required defaultValue={e?.balance ?? ""} placeholder="100000" style={dInput} /></F>
            <F label="Originated"><input name="originated" type="date" defaultValue={e?.originated ?? ""} style={dInput} /></F>
          </div>
          <F label="Collateral (optional)">
            <select name="collateral_position_id" defaultValue={e?.collateral_position_id ?? ""} style={{ ...dInput, cursor: "pointer" }}>
              <option value="">— none —</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.ticker && p.ticker !== "—" ? `${p.ticker} · ` : ""}{p.name}</option>)}
            </select>
          </F>
          {showLiq && <F label="Liquidation LTV % (optional)"><input name="liq_ltv" type="number" step="any" defaultValue={e?.liq_ltv ?? ""} placeholder="80" style={dInput} /></F>}
          <button style={{ padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{e ? "Save debt" : "Add debt"}</button>
        </form>
        {e && (
          <form action={async (fd) => { await deleteLiability(fd); onClose(); onSaved(); }} style={{ padding: "0 22px 22px" }}>
            <input type="hidden" name="id" value={e.id} />
            <button style={{ width: "100%", padding: 10, background: "var(--bg-sunk)", color: "var(--neg)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Delete debt</button>
          </form>
        )}
      </div>
    </div>
  );
}

export function LiabilitiesCard({ liabilities, positions }: { liabilities: Liability[]; positions: Position[] }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Liability | "new" | null>(null);
  const total = liabilities.reduce((s, l) => s + (l.balance || 0), 0);

  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 36px 24px" }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: liabilities.length ? "var(--hair) solid var(--border)" : "none" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Liabilities <span style={{ color: "var(--ink-3)", fontWeight: 450 }}>· debt you owe</span></span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {total > 0 && <span className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--neg)" }}>−{fmtUSD(total)}</span>}
            <button onClick={() => setDrawer("new")} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add debt</button>
          </div>
        </div>
        {liabilities.length === 0 ? (
          <div style={{ padding: "18px 24px", fontSize: 12.5, color: "var(--ink-3)" }}>
            No debt tracked. Add a crypto-backed loan, mortgage, or margin — it subtracts from your net worth, and crypto loans show LTV + liquidation buffer.
          </div>
        ) : (
          liabilities.map((l, i) => {
            const info = ltvInfo(l, positions);
            return (
              <div key={l.id} onClick={() => setDrawer(l)} className="nw-liab" style={{ display: "grid", gridTemplateColumns: "1fr 200px 130px", alignItems: "center", gap: 16, padding: "14px 24px", borderTop: i ? "var(--hair) solid var(--border)" : "none", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{kindLabel(l.kind)}{l.rate != null ? ` · ${l.rate}% APR` : ""}{info ? ` · secured by ${info.pos.ticker && info.pos.ticker !== "—" ? info.pos.ticker : info.pos.name}` : ""}</div>
                </div>
                <div>
                  {info && info.ltv != null ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>
                        <span>LTV {info.ltv.toFixed(0)}%{info.liq ? ` / ${info.liq}%` : ""}</span>
                        {info.dropTol != null && <span>−{info.dropTol.toFixed(0)}% buffer</span>}
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden", position: "relative" }}>
                        <div style={{ width: `${Math.min(100, info.liq ? (info.ltv / info.liq) * 100 : info.ltv)}%`, height: "100%", borderRadius: 99, background: info.liq && info.ltv / info.liq > 0.8 ? "var(--neg)" : info.liq && info.ltv / info.liq > 0.6 ? "var(--c-crypto)" : "var(--pos)" }} />
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>unsecured</span>
                  )}
                </div>
                <div className="num" style={{ textAlign: "right", fontSize: 15, fontWeight: 600, color: "var(--neg)" }}>−{fmtUSD(l.balance)}</div>
              </div>
            );
          })
        )}
      </div>
      {drawer && <Drawer liab={drawer} positions={positions} onClose={() => setDrawer(null)} onSaved={() => router.refresh()} />}
    </div>
  );
}
