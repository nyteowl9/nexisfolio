"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtUSD, fmtDate, CLASSES, type AccountingMethod, type AssetClass, type TaxSummary } from "@/lib/engine";
import { updatePrefs } from "@/lib/db/prefs-actions";

export interface HarvestRow {
  id: string;
  name: string;
  ticker: string | null;
  cls: AssetClass;
  value: number;
  basis: number;
  loss: number;
  live: boolean;
}

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" };
const td = (right?: boolean): React.CSSProperties => ({ padding: "11px 18px", borderTop: "var(--hair) solid var(--border)", fontSize: 13, color: "var(--ink)", textAlign: right ? "right" : "left", whiteSpace: "nowrap" });

const METHODS: AccountingMethod[] = ["FIFO", "LIFO", "HIFO"];
const METHOD_NOTE: Record<AccountingMethod, string> = {
  FIFO: "First in, first out — sells your oldest lots first. The IRS default.",
  LIFO: "Last in, first out — sells your newest lots first.",
  HIFO: "Highest in, first out — sells your most expensive lots first, often minimizing gains.",
};

function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 150, padding: "16px 19px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, color: color || "var(--ink)" }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function signed(n: number) {
  return (n >= 0 ? "+" : "−") + fmtUSD(Math.abs(n));
}

const cardHead: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 22px", borderBottom: "var(--hair) solid var(--border)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" };

function GainLossBar({ label, gain, loss, max }: { label: string; gain: number; loss: number; max: number }) {
  const bar = (v: number, color: string, sign: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 14, background: "var(--bg-sunk)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${max ? (v / max) * 100 : 0}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span className="num" style={{ width: 84, textAlign: "right", fontSize: 12, color, fontWeight: 600 }}>{sign}{fmtUSD(v)}</span>
    </div>
  );
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ color: "var(--ink-3)" }}>net {signed(gain - loss)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {bar(gain, "var(--pos)", "+")}
        {bar(loss, "var(--neg)", "−")}
      </div>
    </div>
  );
}

function ByClassBars({ byClass }: { byClass: Partial<Record<AssetClass, number>> }) {
  const entries = (Object.entries(byClass) as Array<[AssetClass, number]>).filter(([, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const max = Math.max(1, ...entries.map(([, v]) => Math.abs(v)));
  if (!entries.length) return <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: "8px 0" }}>No realized gains by class yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 92, fontSize: 12.5, color: "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSES[k].color }} />{CLASSES[k].label.split(" ")[0]}</span>
          <div style={{ flex: 1, height: 12, background: "var(--bg-sunk)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(Math.abs(v) / max) * 100}%`, height: "100%", background: v >= 0 ? "var(--pos)" : "var(--neg)", borderRadius: 4 }} />
          </div>
          <span className="num" style={{ width: 84, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: v >= 0 ? "var(--pos)" : "var(--neg)" }}>{signed(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function TaxCenter({ summaries, method: initial, year, harvest }: { summaries: Record<AccountingMethod, TaxSummary>; method: AccountingMethod; year: number; harvest: HarvestRow[] }) {
  const [method, setMethod] = useState<AccountingMethod>(initial);
  const s = summaries[method];

  const pick = (mth: AccountingMethod) => { setMethod(mth); void updatePrefs({ costBasis: mth }); };

  const download = (name: string, rows: (string | number)[][]) => {
    const csv = [[`DRAFT — Tax Year ${year} — ${method} basis — review with your CPA before filing`], ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const m2 = (n: number) => n.toFixed(2);
  const sumBy = (term: "short" | "long", key: "proceeds" | "basis") => s.rows.filter((r) => r.term === term).reduce((a, r) => a + r[key], 0);

  const EXPORTS: Array<{ key: string; name: string; desc: string; build: () => void }> = [
    {
      key: "8949", name: "IRS Form 8949", desc: "Sales & dispositions of capital assets",
      build: () => download(`Form_8949_${year}_${method}_draft.csv`, [["(a) Description", "(b) Date acquired", "(c) Date sold", "(d) Proceeds", "(e) Cost basis", "(h) Gain/(loss)", "Term"], ...s.rows.map((r) => [`${r.qty} ${r.asset}`, r.acq, r.date, m2(r.proceeds), m2(r.basis), m2(r.gain), r.term === "long" ? "Long-term" : "Short-term"])]),
    },
    {
      key: "schd", name: "Schedule D", desc: "Capital gains & losses summary",
      build: () => download(`Schedule_D_${year}_${method}_draft.csv`, [["", "Proceeds", "Cost basis", "Net gain/(loss)"], ["Short-term", m2(sumBy("short", "proceeds")), m2(sumBy("short", "basis")), m2(s.netST)], ["Long-term", m2(sumBy("long", "proceeds")), m2(sumBy("long", "basis")), m2(s.netLT)], ["Net capital gain/(loss)", "", "", m2(s.netCapGain)]]),
    },
    {
      key: "schb", name: "Schedule B", desc: "Interest income (loan notes)",
      build: () => download(`Schedule_B_${year}_draft.csv`, [["Payer", "Amount"], ...s.loanInterest.map((l) => [l.name, m2(l.amt)]), ["Total", m2(s.interestIncome)]]),
    },
    {
      key: "pkg", name: "CPA package", desc: "Everything above + a summary, one file",
      build: () => download(`CPA_package_${year}_${method}_draft.csv`, [
        ["NEXIS FOLIO — CPA PACKAGE"], ["Realized gains", m2(s.realizedGains)], ["Realized losses", m2(s.realizedLosses)], ["Net capital gain", m2(s.netCapGain)], ["Interest income", m2(s.interestIncome)], ["Est. tax", m2(s.estTax)], [""],
        ["FORM 8949"], ["Description", "Acquired", "Sold", "Proceeds", "Cost basis", "Gain/(loss)", "Term"], ...s.rows.map((r) => [`${r.qty} ${r.asset}`, r.acq, r.date, m2(r.proceeds), m2(r.basis), m2(r.gain), r.term]), [""],
        ["NOTE", "Wash-sale and crypto per-wallet basis rules require professional review before filing."],
      ]),
    },
  ];

  const harvestable = harvest.reduce((sum, h) => sum + h.loss, 0);
  const stltMax = Math.max(1, s.stGain, s.stLoss, s.ltGain, s.ltLoss);

  return (
    <div className="nw-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 36px 64px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Tax Center</h1>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 5 }}>Realized gains &amp; losses · tax year {year}</div>
        </div>
        <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
          {METHODS.map((mth) => (
            <button key={mth} onClick={() => pick(mth)} style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: method === mth ? "var(--ink)" : "var(--ink-3)", background: method === mth ? "var(--surface)" : "transparent", boxShadow: method === mth ? "var(--shadow)" : "none" }}>{mth}</button>
          ))}
        </div>
      </div>

      {/* draft disclaimer */}
      <div style={{ ...card, marginTop: 16, padding: "12px 18px", display: "flex", gap: 11, alignItems: "flex-start", borderLeft: "3px solid var(--c-loans)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--c-loans)", background: "var(--t-loans)", padding: "4px 9px", borderRadius: 99, flex: "none" }}>Draft</span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          Estimates for planning only — <b>not tax advice</b>. Wash sales and the 2025 crypto per-wallet cost-basis rule aren&rsquo;t applied. Review with a CPA before filing; exports are labeled draft.
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12, marginBottom: 14 }}>{METHOD_NOTE[method]}</div>

      {/* summary */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Realized gains" value={fmtUSD(s.realizedGains)} color="var(--pos)" />
        <Stat label="Realized losses" value={fmtUSD(s.realizedLosses)} color="var(--neg)" />
        <Stat label="Net capital gain" value={signed(s.netCapGain)} color={s.netCapGain >= 0 ? "var(--pos)" : "var(--neg)"} sub={`ST ${signed(s.netST)} · LT ${signed(s.netLT)}`} />
        {s.interestIncome > 0 && <Stat label="Interest income" value={fmtUSD(s.interestIncome)} sub={`${s.loanInterest.length} note${s.loanInterest.length === 1 ? "" : "s"} · Sch. B`} />}
        <Stat label="Est. tax" value={fmtUSD(s.estTax)} sub="35% ST · 20% LT" />
      </div>

      {/* charts */}
      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={cardHead}>Short-term vs long-term</div>
          <div style={{ padding: "20px 24px" }}>
            <GainLossBar label="Short-term (≤1yr)" gain={s.stGain} loss={s.stLoss} max={stltMax} />
            <GainLossBar label="Long-term (>1yr)" gain={s.ltGain} loss={s.ltLoss} max={stltMax} />
          </div>
        </div>
        <div style={card}>
          <div style={cardHead}>Net gain by asset class</div>
          <div style={{ padding: "20px 24px" }}><ByClassBars byClass={s.byClassGain} /></div>
        </div>
      </div>

      {/* realized-gains table */}
      <div style={{ ...card, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", borderBottom: s.rows.length ? "var(--hair) solid var(--border)" : "none" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Disposals <span style={{ color: "var(--ink-3)", fontWeight: 450 }}>· {s.rows.length} · recomputed on method change</span></span>
        </div>
        {s.rows.length === 0 ? (
          <div style={{ padding: "30px 22px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            No sales recorded in {year}. When you sell a holding (Log trade → Sell), the realized gain or loss shows here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="nw-sectbl" style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead><tr>{["Asset", "Acquired", "Sold", "Qty", "Proceeds", "Cost basis", "Gain / loss", "Term"].map((h, i) => <th key={i} style={{ textAlign: i >= 3 ? "right" : "left", padding: "9px 18px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td()}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSES[r.cls].color }} />{r.asset}</span></td>
                    <td style={td()}>{fmtDate(r.acq)}</td>
                    <td style={td()}>{fmtDate(r.date)}</td>
                    <td className="num" style={td(true)}>{r.qty}</td>
                    <td className="num" style={td(true)}>{fmtUSD(r.proceeds)}</td>
                    <td className="num" style={td(true)}>{fmtUSD(r.basis)}</td>
                    <td className="num" style={{ ...td(true), color: r.gain >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600 }}>{signed(r.gain)}</td>
                    <td style={td(true)}><span style={{ fontSize: 11.5, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: r.term === "long" ? "var(--t-realest)" : "var(--t-crypto)", color: r.term === "long" ? "var(--c-realest)" : "var(--c-crypto)" }}>{r.term === "long" ? "Long" : "Short"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* tax-loss harvesting */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "15px 22px", borderBottom: harvest.length ? "var(--hair) solid var(--border)" : "none" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Tax-loss harvesting <span style={{ color: "var(--ink-3)", fontWeight: 450 }}>· holdings below cost</span></span>
          {harvest.length > 0 && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Selling these would realize up to <span className="num" style={{ color: "var(--neg)", fontWeight: 600 }}>{fmtUSD(Math.abs(harvestable))}</span> in losses to offset gains. {""}Mind the 30-day wash-sale rule on securities.</div>}
        </div>
        {harvest.length === 0 ? (
          <div style={{ padding: "24px 22px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No holdings are currently below their cost basis — nothing to harvest.</div>
        ) : (
          harvest.map((h, i) => (
            <Link key={h.id} href={`/detail/${h.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", padding: "13px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none", color: "var(--ink)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 550 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSES[h.cls].color }} />{h.ticker ? `${h.ticker} · ` : ""}{h.name}</span>
              <span className="num" style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "right" }}>{fmtUSD(h.value)} / {fmtUSD(h.basis)}</span>
              <span className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--neg)", textAlign: "right", minWidth: 90 }}>{signed(h.loss)}</span>
            </Link>
          ))
        )}
      </div>

      {/* exports */}
      <div style={{ ...card, overflow: "hidden", marginTop: 16 }}>
        <div style={cardHead}>Export <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 450 }}>· drafts for your CPA</span></div>
        {EXPORTS.map((x, i) => (
          <div key={x.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "13px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{x.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{x.desc}</div>
            </div>
            <button onClick={x.build} disabled={s.rows.length === 0 && x.key !== "schb"} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "var(--font-sans)", opacity: s.rows.length === 0 && x.key !== "schb" ? 0.5 : 1, whiteSpace: "nowrap" }}>Download CSV</button>
          </div>
        ))}
      </div>
    </div>
  );
}
