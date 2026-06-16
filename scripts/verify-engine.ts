/**
 * Engine parity check: runs the ported TS engine over the sample portfolio and
 * prints the figures, so we can confirm they match the prototype dashboard
 * (which showed Total net worth $811,977).
 *
 * Run: npx tsx scripts/verify-engine.ts
 */
import { totals, taxSummary, retirement, recompute, fmtUSD } from "@/lib/engine";
import {
  POSITIONS,
  DISPOSALS,
  LOAN_INTEREST,
  CATALOG,
  CARD_ITEMS,
} from "@/lib/sample/sample-data";

// Attach card line-items to the Trading Cards position and derive its aggregate.
const positions = POSITIONS.map((p) => ({ ...p }));
const cardsPos = positions.find((p) => p.id === "cards")!;
cardsPos.items = CARD_ITEMS;
const agg = recompute(CARD_ITEMS, CATALOG);
cardsPos.value = agg.value;
cardsPos.basis = agg.basis;
cardsPos.qty = agg.qty;

const t = totals(positions);
console.log("=== PORTFOLIO TOTALS ===");
console.log("Net worth   :", fmtUSD(t.net, { full: true }), `(raw ${t.net})`);
console.log("24h change  :", fmtUSD(t.change24, { full: true }), `${t.changePct.toFixed(2)}%`);
console.log("Liquid      :", fmtUSD(t.liquid, { full: true }));
console.log("Illiquid    :", fmtUSD(t.illiquid, { full: true }));
console.log("Loans out   :", fmtUSD(t.loansOut, { full: true }));
console.log("Cost basis  :", fmtUSD(t.basis, { full: true }));
console.log("Total P/L   :", fmtUSD(t.pl, { full: true }), `${t.plPct.toFixed(2)}%`);
console.log("Cards agg   :", agg);

console.log("\n=== TAX (per method) ===");
for (const method of ["FIFO", "LIFO", "HIFO"] as const) {
  const tx = taxSummary(DISPOSALS, { method, loanInterest: LOAN_INTEREST });
  console.log(
    `${method}: realizedGains=${fmtUSD(tx.realizedGains, { full: true })} netCapGain=${fmtUSD(tx.netCapGain, { full: true })} estTax=${fmtUSD(tx.estTax, { full: true })}`
  );
}

console.log("\n=== RETIREMENT (Base, age 40→65) ===");
const r = retirement(positions, { currentAge: 40, retireAge: 65 });
console.log("Investable  :", fmtUSD(r.investable, { full: true }));
console.log("Blended CAGR:", (r.blended * 100).toFixed(2) + "%");
console.log("FIRE number :", fmtUSD(r.fireNumber, { full: true }));
console.log("Coast number:", fmtUSD(r.coastNumber, { full: true }), "achieved:", r.coastAchieved);
console.log("Proj @ retire:", fmtUSD(r.projWithContrib, { full: true }));
console.log("Safe age    :", r.safeAge);
