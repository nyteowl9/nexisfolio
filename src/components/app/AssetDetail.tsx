"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  mv, costBasis, change24, fmtUSD, fmtPct, fmtQty, fmtDate, holdYears, isUnitPriced, CLASSES,
  type Position, type Catalog, type Lot,
} from "@/lib/engine";
import { Area } from "@/components/ui/charts";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { Back, ArrowUp, ArrowDown, Bolt, Clock } from "@/components/ui/icons";
import { CardsDetail } from "@/components/app/CardsDetail";
import { addLot, updateLot, deleteLot } from "@/lib/db/lots";
import { removePosition, updatePositionValue } from "@/lib/db/positions";

const dInput: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };

function LotDrawer({ positionId, lot, onClose, onSaved }: { positionId: string; lot: Lot | "new"; onClose: () => void; onSaved: () => void }) {
  const e = lot === "new" ? null : lot;
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (<label style={{ display: "block" }}><span style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6, display: "block" }}>{label}</span>{children}</label>);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{e ? "Edit tax lot" : "Add tax lot"}</span>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15 }}>✕</button>
        </div>
        <form action={async (fd) => { if (e) await updateLot(fd); else await addLot(fd); onClose(); onSaved(); }} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          <input type="hidden" name="positionId" value={positionId} />
          {e?.id && <input type="hidden" name="id" value={e.id} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Quantity"><input name="qty" type="number" step="any" required defaultValue={e?.qty ?? ""} style={dInput} /></F>
            <F label="Cost per unit"><input name="price" type="number" step="any" required defaultValue={e?.price ?? ""} style={dInput} /></F>
          </div>
          <F label="Acquired date"><input name="acquired_date" type="date" defaultValue={e?.date ?? new Date().toISOString().slice(0, 10)} style={dInput} /></F>
          <F label="Account (optional)"><input name="account" defaultValue={e?.account ?? ""} style={dInput} /></F>
          <button style={{ padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{e ? "Save lot" : "Add lot"}</button>
        </form>
        {e?.id && (
          <form action={async (fd) => { await deleteLot(fd); onClose(); onSaved(); }} style={{ padding: "0 22px 22px" }}>
            <input type="hidden" name="positionId" value={positionId} />
            <input type="hidden" name="id" value={e.id} />
            <button style={{ width: "100%", padding: 10, background: "var(--bg-sunk)", color: "var(--neg)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Delete lot</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ValueDrawer({ p, onClose, onSaved }: { p: Position; onClose: () => void; onSaved: () => void }) {
  const isCash = p.cls === "cash";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (<label style={{ display: "block" }}><span style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6, display: "block" }}>{label}</span>{children}</label>);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{isCash ? "Edit balance" : "Edit value"}</span>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15 }}>✕</button>
        </div>
        <form action={async (fd) => { await updatePositionValue(fd); onClose(); onSaved(); }} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="from" value={`/detail/${p.id}`} />
          <F label={isCash ? "Current balance" : "Current value"}><input name="value" type="number" step="any" required defaultValue={p.value ?? 0} style={dInput} /></F>
          {!isCash && <F label="Cost basis (optional)"><input name="costBasis" type="number" step="any" defaultValue={p.basis ?? ""} style={dInput} /></F>}
          <button style={{ padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Save</button>
        </form>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" };
const cardHead: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", borderBottom: "var(--hair) solid var(--border)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" };
const td = (right?: boolean): React.CSSProperties => ({ padding: "10px 18px", borderTop: "var(--hair) solid var(--border)", fontSize: 13, color: "var(--ink)", textAlign: right ? "right" : "left" });

function genPriceHistory(price: number, n = 80) {
  let seed = Math.round(price * 7) & 0x7fffffff;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const out: number[] = []; let v = price * 0.7;
  for (let i = 0; i < n; i++) { v = v + (price - v) * 0.04 + (rnd() - 0.48) * price * 0.02; out.push(Math.max(price * 0.4, v)); }
  if (out.length) out[n - 1] = price; return out;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string | null; color?: string }) {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 600, color: color || "var(--ink)", letterSpacing: "-.01em" }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MarketDetail({ p, realized, priceHistory }: { p: Position; realized: number; priceHistory?: number[] | null }) {
  const router = useRouter();
  const [lotDrawer, setLotDrawer] = useState<Lot | "new" | null>(null);
  const [valueOpen, setValueOpen] = useState(false);
  const value = mv(p), basis = costBasis(p), unreal = value - basis, unrealPct = basis ? (unreal / basis) * 100 : 0;
  const chg = change24(p);
  const unit = isUnitPriced(p.cls);
  const hist = priceHistory && priceHistory.length > 2 ? priceHistory : genPriceHistory(unit ? p.price ?? value : value / (p.qty || 1));
  const lots = p.lots ?? [];
  const oldest = lots.length ? lots.reduce((a, b) => (new Date(a.date) < new Date(b.date) ? a : b)) : null;
  const holdY = oldest ? holdYears(oldest.date) : 0;

  return (
    <div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 6px" }}>
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500 }}>{p.live && unit ? "Market price" : "Current value"}</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-.02em", marginTop: 3 }}>{unit ? fmtUSD(p.price ?? 0, { full: true, cents: true }) : fmtUSD(value, { full: true })}</div>
            {chg != null && <div className="num" style={{ fontSize: 13, fontWeight: 600, color: chg >= 0 ? "var(--pos)" : "var(--neg)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>{chg >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{fmtPct(chg, true)} today</div>}
          </div>
          {!unit && (
            <button onClick={() => setValueOpen(true)} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{p.cls === "cash" ? "Edit balance" : "Edit value"}</button>
          )}
        </div>
        <div style={{ padding: "8px 12px 14px" }}><Area points={hist} width={1080} height={150} color={unreal >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth={2} /></div>
      </div>

      <div className="nw-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", ...card, marginTop: 16 }}>
        <Stat label="Market value" value={fmtUSD(value)} sub={p.qty ? `${fmtQty(p.qty)} units` : null} />
        <div style={{ borderLeft: "var(--hair) solid var(--border)" }}><Stat label="Cost basis" value={fmtUSD(basis)} sub={lots.length ? `${lots.length} lot${lots.length > 1 ? "s" : ""}` : null} /></div>
        <div style={{ borderLeft: "var(--hair) solid var(--border)" }}><Stat label="Unrealized P/L" value={(unreal >= 0 ? "+" : "−") + fmtUSD(Math.abs(unreal))} sub={fmtPct(unrealPct, true)} color={unreal >= 0 ? "var(--pos)" : "var(--neg)"} /></div>
        <div style={{ borderLeft: "var(--hair) solid var(--border)" }}><Stat label="Realized P/L (2026)" value={realized ? (realized >= 0 ? "+" : "−") + fmtUSD(Math.abs(realized)) : "$0"} sub={realized ? "from sales" : "no sales"} color={realized > 0 ? "var(--pos)" : realized < 0 ? "var(--neg)" : "var(--ink)"} /></div>
      </div>

      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: p.cls === "cash" ? "1fr" : "1.3fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        {p.cls !== "cash" && (
        <div style={card}>
          <div style={cardHead}>
            <span>Tax lots <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 450 }}>· FIFO basis · click to edit</span></span>
            <button onClick={() => setLotDrawer("new")} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add lot</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Acquired", "Qty", "Price", "Cost basis", "Holding"].map((h, i) => <th key={i} style={{ textAlign: i > 0 ? "right" : "left", padding: "8px 18px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>{h}</th>)}</tr></thead>
            <tbody>
              {lots.map((l, i) => {
                const ly = holdYears(l.date);
                return (
                  <tr key={l.id ?? i} onClick={() => setLotDrawer(l)} style={{ cursor: "pointer" }}>
                    <td style={td()}>{fmtDate(l.date)}</td>
                    <td className="num" style={td(true)}>{fmtQty(l.qty)}</td>
                    <td className="num" style={td(true)}>{fmtUSD(l.price, { full: true, cents: l.price < 1000 })}</td>
                    <td className="num" style={td(true)}>{fmtUSD(l.basis)}</td>
                    <td style={td(true)}><span style={{ fontSize: 11.5, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: ly > 1 ? "var(--t-realest)" : "var(--t-crypto)", color: ly > 1 ? "var(--c-realest)" : "var(--c-crypto)" }}>{ly > 1 ? `LT · ${ly.toFixed(1)}y` : `ST · ${Math.round(ly * 12)}mo`}</span></td>
                  </tr>
                );
              })}
              {lots.length === 0 && <tr><td colSpan={5} style={{ ...td(), textAlign: "center", color: "var(--ink-3)" }}>No lots recorded.</td></tr>}
            </tbody>
          </table>
        </div>
        )}
        <div style={card}>
          <div style={cardHead}>Position facts</div>
          <div style={{ padding: "6px 0" }}>
            {([["Account", p.account ?? "—"], ["First acquired", oldest ? fmtDate(oldest.date) : "—"], ["Holding period", `${holdY.toFixed(1)} years`], ["Tax treatment", holdY > 1 ? "Long-term" : "Short-term"], ["Pricing", p.live ? "Live (API)" : "Manual"], ["Avg cost", p.qty ? fmtUSD(basis / p.qty, { full: true, cents: true }) : "—"]] as Array<[string, string]>).map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{k}</span>
                <span className="num" style={{ fontSize: 13, fontWeight: 550, color: "var(--ink)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {lotDrawer && <LotDrawer positionId={p.id} lot={lotDrawer} onClose={() => setLotDrawer(null)} onSaved={() => router.refresh()} />}
      {valueOpen && <ValueDrawer p={p} onClose={() => setValueOpen(false)} onSaved={() => router.refresh()} />}
    </div>
  );
}

function LoanDetail({ p }: { p: Position }) {
  const L = p.loan!;
  const paid = L.principal - L.balance;
  const pctPaid = L.principal ? (paid / L.principal) * 100 : 0;
  const r = L.rate / 100 / 12;
  const schedule: { n: number; date: string; payment: number; interest: number; principal: number; balance: number }[] = [];
  let bal = L.balance;
  for (let i = 0; i < 6; i++) {
    const interest = bal * r;
    const principal = L.nextAmt - interest;
    bal = Math.max(0, bal - principal);
    const d = new Date(L.nextDue); d.setMonth(d.getMonth() + i);
    schedule.push({ n: L.paymentsMade + i + 1, date: d.toISOString().slice(0, 10), payment: L.nextAmt, interest, principal, balance: bal });
  }
  return (
    <div>
      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ ...card, padding: "22px 24px" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 6 }}>Next payment due</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div className="num" style={{ fontSize: 30, fontWeight: 650, letterSpacing: "-.02em" }}>{fmtUSD(L.nextAmt, { full: true, cents: true })}</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>{fmtDate(L.nextDue)}</div>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}><span>{fmtUSD(paid)} repaid</span><span>{pctPaid.toFixed(0)}% of principal</span></div>
            <div style={{ height: 8, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden" }}><div style={{ width: `${pctPaid}%`, height: "100%", background: "var(--c-loans)", borderRadius: 99 }} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 18, borderTop: "var(--hair) solid var(--border)" }}>
            {([["Original principal", fmtUSD(L.principal)], ["Outstanding balance", fmtUSD(L.balance)], ["Interest rate", `${L.rate}% APR`], ["Term", `${L.termMonths / 12} years`], ["Payments made", `${L.paymentsMade} of ${L.termMonths}`], ["Interest YTD", fmtUSD(L.interestYtd)]] as Array<[string, string]>).map(([k, v], i) => (
              <div key={i} style={{ padding: "12px 0", borderTop: i > 1 ? "var(--hair) solid var(--border)" : "none" }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>{k}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>Loan terms</div>
          <div style={{ padding: "4px 0" }}>
            {([["Borrower", p.name.replace(/.*· /, "")], ["Originated", fmtDate(L.originated)], ["Monthly payment", fmtUSD(L.nextAmt, { full: true, cents: true })], ["Total interest (life)", fmtUSD(L.nextAmt * L.termMonths - L.principal)], ["Status", "Current · on schedule"]] as Array<[string, string]>).map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{k}</span>
                <span className="num" style={{ fontSize: 13, fontWeight: 550, color: i === 4 ? "var(--pos)" : "var(--ink)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <div style={cardHead}>Amortization schedule <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 450 }}>next 6 payments</span></div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["#", "Date", "Payment", "Principal", "Interest", "Balance"].map((h, i) => <th key={i} style={{ textAlign: i > 1 ? "right" : "left", padding: "9px 22px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {schedule.map((s, i) => (
              <tr key={i} style={{ background: i === 0 ? "var(--surface-2)" : "transparent" }}>
                <td className="num" style={td()}>{s.n}</td>
                <td style={td()}>{fmtDate(s.date)}{i === 0 ? "  · next" : ""}</td>
                <td className="num" style={td(true)}>{fmtUSD(s.payment, { full: true, cents: true })}</td>
                <td className="num" style={{ ...td(true), color: "var(--c-loans)", fontWeight: 600 }}>{fmtUSD(s.principal, { full: true, cents: true })}</td>
                <td className="num" style={td(true)}>{fmtUSD(s.interest, { full: true, cents: true })}</td>
                <td className="num" style={{ ...td(true), fontWeight: 600 }}>{fmtUSD(s.balance, { full: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AssetDetail({ position, realized, catalog, autoOpenCatalog, priceHistory }: { position: Position; realized: number; catalog?: Catalog; autoOpenCatalog?: boolean; priceHistory?: number[] | null }) {
  const p = position;
  const value = mv(p);
  // Trading-card collections render the catalog/line-item view; every other
  // collectible (watch, art, …) is a single manual-valued asset. Keyed on
  // subcat only — an empty `items` array must NOT trigger the card view.
  const isCards = p.cls === "private" && p.subcat === "Trading Cards";
  return (
    <div className="nw-page" style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 36px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 13, fontWeight: 500, padding: "4px 0" }}><Back size={16} /> Back to overview</Link>
        <form action={removePosition}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="from" value="/dashboard" />
          <button
            onClick={(e) => { if (!confirm(`Delete ${p.name}? This removes the position and its history.`)) e.preventDefault(); }}
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--neg)", background: "transparent", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Delete position
          </button>
        </form>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AssetIcon cls={p.cls} ticker={p.ticker} name={p.name} size={52} radius={12} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>{p.name}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--ink-2)", background: `var(--t-${p.cls})`, padding: "3px 9px", borderRadius: 99 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: CLASSES[p.cls].color }} />{CLASSES[p.cls].label}
              </span>
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: p.live ? "var(--pos)" : "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {p.live ? <><Bolt size={12} /> live</> : <><Clock size={12} /> {p.valued ? `valued ${fmtDate(p.valued)}` : "manual"}</>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-.02em" }}>{fmtUSD(value, { full: true })}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{p.cls === "loans" ? "outstanding balance" : "current value"}</div>
        </div>
      </div>
      {p.cls === "loans" && p.loan ? <LoanDetail p={p} /> : isCards ? <CardsDetail position={p} catalog={catalog} autoOpenCatalog={autoOpenCatalog} /> : <MarketDetail p={p} realized={realized} priceHistory={priceHistory} />}
    </div>
  );
}
