import type { AssetClass, Position } from "./types";
import { CLASSES, SCENARIOS } from "./classes";
import { byClass, mv } from "./portfolio";

type ClassMap = Partial<Record<AssetClass, number>>;

/**
 * Which classes compound toward retirement, and how much of each counts.
 * Primary residence and loans receivable are excluded by default.
 */
export function investableByClass(
  positions: Position[],
  includeHome = false,
  isPrimaryResidence: (p: Position) => boolean = (p) => p.id === "home"
): ClassMap {
  const c = byClass(positions);
  return {
    crypto: c.crypto.value,
    stocks: c.stocks.value,
    cash: c.cash.value,
    metals: c.metals.value,
    private: c.private.value,
    realest: c.realest.positions
      .filter((p) => includeHome || !isPrimaryResidence(p))
      .reduce((s, p) => s + mv(p), 0),
  };
}

function blendedCAGR(cagr: ClassMap, invest: ClassMap): number {
  let tot = 0;
  let w = 0;
  for (const k of Object.keys(invest) as AssetClass[]) {
    tot += (invest[k] ?? 0) * (cagr[k] ?? 0);
    w += invest[k] ?? 0;
  }
  return w ? tot / w : 0;
}

/** Project a balance forward `years` with monthly contributions at annual `rate`. */
export function fv(balance: number, monthlyContrib: number, years: number, rate: number): number {
  const rm = Math.pow(1 + rate, 1 / 12) - 1;
  let b = balance;
  for (let m = 0; m < Math.round(years * 12); m++) b = b * (1 + rm) + monthlyContrib;
  return b;
}

/** Years until balance (with contributions) first reaches target; null if >60y. */
export function yearsToTarget(
  balance: number,
  monthlyContrib: number,
  target: number,
  rate: number
): number | null {
  if (balance >= target) return 0;
  const rm = Math.pow(1 + rate, 1 / 12) - 1;
  let b = balance;
  for (let m = 1; m <= 60 * 12; m++) {
    b = b * (1 + rm) + monthlyContrib;
    if (b >= target) return m / 12;
  }
  return null;
}

export type WithdrawalStrategy = "constant" | "guardrails" | "percent";

export interface RetirementOpts {
  currentAge?: number;
  retireAge?: number;
  annualSpend?: number;
  monthly?: number;
  scenario?: string;
  cagrOverride?: ClassMap | null;
  target?: number | null;
  endAge?: number;
  method?: "traditional" | "coast" | "fire";
  coastAge?: number | null;
  withdrawalRate?: number;
  otherIncome?: number;
  otherIncomeAge?: number;
  includeHome?: boolean;
  /** annual inflation % — returns are converted to real (today's-dollar) terms */
  inflation?: number;
  /** how retirement spending flexes with the portfolio */
  withdrawalStrategy?: WithdrawalStrategy;
  /** debt secured by investable assets (e.g. crypto loan, margin) + unsecured —
   *  netted from the starting balance. Mortgage on an excluded home is omitted. */
  debt?: number;
}

/**
 * Gross (pre-other-income) spend for a retirement year, by strategy.
 * - constant: the classic 4%-rule fixed real spend.
 * - percent: spend a fixed % of the *current* balance (never depletes; income flexes).
 * - guardrails: Guyton-Klinger — trim 10% if the withdrawal rate drifts 20% above
 *   the initial rate, raise 10% if it drifts 20% below. `cur` carries year to year.
 */
function spendForYear(
  strat: WithdrawalStrategy,
  bal: number,
  cur: number,
  initWR: number,
  baseSpend: number
): { spend: number; cur: number } {
  if (strat === "percent") return { spend: Math.max(0, bal) * initWR, cur };
  if (strat === "guardrails") {
    const wr = bal > 0 ? cur / bal : Infinity;
    let c = cur;
    if (wr > initWR * 1.2) c = cur * 0.9;
    else if (wr < initWR * 0.8) c = cur * 1.1;
    return { spend: c, cur: c };
  }
  return { spend: baseSpend, cur };
}

export interface RetirementYear {
  age: number;
  bal: number;
  phase: "accum" | "draw";
  coast: number | null;
}

export interface RetirementSector {
  key: AssetClass;
  label: string;
  color: string;
  value: number;
  cagr: number;
  y10: number;
  y20: number;
}

/** Full retirement model (Coast FIRE). */
export function retirement(positions: Position[], opts: RetirementOpts = {}) {
  const o = {
    currentAge: 40,
    retireAge: 65,
    annualSpend: 120000,
    monthly: 8000,
    scenario: "Base",
    cagrOverride: null as ClassMap | null,
    target: null as number | null,
    endAge: 95,
    method: "coast" as const,
    coastAge: null as number | null,
    withdrawalRate: 4,
    otherIncome: 0,
    otherIncomeAge: 67,
    includeHome: false,
    inflation: 3,
    withdrawalStrategy: "constant" as WithdrawalStrategy,
    ...opts,
  };
  const initWR = o.withdrawalRate / 100;

  const invest = investableByClass(positions, o.includeHome);
  const grossInvestable = Object.values(invest).reduce((s, v) => s + (v ?? 0), 0);
  // Net debt secured by investable assets from the starting balance, scaled
  // proportionally across classes so the asset mix (and blended return) is
  // unchanged — you simply have less net wealth compounding.
  const debt = Math.max(0, o.debt ?? 0);
  const scale = grossInvestable > 0 ? Math.max(0, grossInvestable - debt) / grossInvestable : 0;
  for (const k of Object.keys(invest) as AssetClass[]) invest[k] = (invest[k] ?? 0) * scale;
  const investable = Object.values(invest).reduce((s, v) => s + (v ?? 0), 0);
  const baseCagr = SCENARIOS[o.scenario] || SCENARIOS.Base;
  const cagr: ClassMap = { ...baseCagr, ...(o.cagrOverride || {}) };
  const blended = blendedCAGR(cagr, invest);
  // convert nominal assumptions to real (today's-dollar) terms
  const infl = (o.inflation ?? 3) / 100;
  const real = (n: number) => (1 + n) / (1 + infl) - 1;
  const realBlended = real(blended);
  const fireNumber = o.annualSpend * (100 / o.withdrawalRate);
  const target = o.target != null ? o.target : fireNumber;
  const yrsToRetire = Math.max(0, o.retireAge - o.currentAge);
  const coastStop = o.method === "coast" && o.coastAge != null ? o.coastAge : o.retireAge;

  const coastNumber = target / Math.pow(1 + realBlended, yrsToRetire);
  const coastAchieved = investable >= coastNumber;

  const rmAcc = Math.pow(1 + realBlended, 1 / 12) - 1;
  const drawRate = realBlended * 0.7; // de-risk in retirement
  const rmDraw = Math.pow(1 + drawRate, 1 / 12) - 1;

  function walk(startBal: number, monthlyContrib: number) {
    let bal = startBal;
    let projAtRetire: number | null = null;
    let depletionAge: number | null = null;
    let curSpend = o.annualSpend; // running spend for adaptive strategies
    const yearly: RetirementYear[] = [];
    for (let age = o.currentAge; age <= o.endAge; age++) {
      yearly.push({ age, bal: Math.max(0, bal), phase: age < o.retireAge ? "accum" : "draw", coast: null });
      if (age === o.retireAge) projAtRetire = bal;
      if (age < o.retireAge) {
        for (let m = 0; m < 12; m++) {
          bal = bal * (1 + rmAcc);
          if (age < coastStop) bal += monthlyContrib;
        }
      } else {
        const g = spendForYear(o.withdrawalStrategy, bal, curSpend, initWR, o.annualSpend);
        curSpend = g.cur;
        let need = g.spend;
        if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
        for (let m = 0; m < 12; m++) {
          bal = bal * (1 + rmDraw);
          bal -= need / 12;
        }
      }
      if (bal <= 0 && depletionAge == null && age >= o.retireAge) depletionAge = age + 1;
    }
    if (projAtRetire == null) projAtRetire = bal;
    return { yearly, projAtRetire, depletionAge, endBal: bal };
  }

  const main = walk(investable, o.monthly);
  const coastWalk = walk(investable, 0);
  const series: RetirementYear[] = main.yearly.map((d, i) => ({
    age: d.age,
    bal: d.bal,
    phase: d.phase,
    coast: d.age <= o.retireAge ? coastWalk.yearly[i].bal : null,
  }));

  const projWithContrib = main.projAtRetire;
  const projCoast = coastWalk.projAtRetire;
  const depletionAge = main.depletionAge;
  const neverDepletes = depletionAge == null;

  function ageHitting(startBal: number, monthlyContrib: number): number | null {
    if (startBal >= target) return o.currentAge;
    let bal = startBal;
    for (let m = 1; m <= (o.endAge - o.currentAge) * 12; m++) {
      const age = o.currentAge + Math.floor((m - 1) / 12);
      bal = bal * (1 + rmAcc);
      if (age < o.retireAge && age < coastStop) bal += monthlyContrib;
      if (bal >= target) return o.currentAge + m / 12;
    }
    return null;
  }
  const fireAge = ageHitting(investable, o.monthly);
  const fireAgeUp = ageHitting(investable * 1.1, o.monthly);

  // True Coast-FIRE age: the earliest age you can STOP saving and still have
  // the balance compound to `target` by retirement (no more contributions).
  // This is the number Coast FIRE is really about — the slider is a what-if.
  function balAtRetireStoppingAt(stopAge: number): number {
    let bal = investable;
    for (let age = o.currentAge; age < o.retireAge; age++)
      for (let mo = 0; mo < 12; mo++) {
        bal = bal * (1 + rmAcc);
        if (age < stopAge) bal += o.monthly;
      }
    return bal;
  }
  let earliestCoastAge: number | null = null;
  for (let A = o.currentAge; A <= o.retireAge; A++) {
    if (balAtRetireStoppingAt(A) >= target) { earliestCoastAge = A; break; }
  }

  // "Safe age" stress test — uses YOUR scenario (in real, after-inflation
  // terms) so it's consistent with the rest of the plan, with a modest
  // de-risk in retirement (you shift toward bonds/cash as you draw down).
  // All figures are real, and retirement spend is constant real dollars.
  const consBlended = blendedCAGR(SCENARIOS.Conservative, invest); // kept for reference
  const safeAccReal = realBlended;
  const safeDrawReal = realBlended * 0.85;
  const rmSafeAcc = Math.pow(1 + safeAccReal, 1 / 12) - 1;
  const rmSafeDraw = Math.pow(1 + safeDrawReal, 1 / 12) - 1;
  function survivesRetiringAt(R: number): boolean {
    let bal = investable;
    for (let age = o.currentAge; age < R; age++)
      for (let mo = 0; mo < 12; mo++) {
        bal = bal * (1 + rmSafeAcc);
        if (age < coastStop) bal += o.monthly;
      }
    for (let age = R; age <= o.endAge; age++) {
      for (let mo = 0; mo < 12; mo++) {
        bal = bal * (1 + rmSafeDraw);
        let need = o.annualSpend;
        if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
        bal -= need / 12;
      }
      if (bal <= 0) return false;
    }
    return bal > 0;
  }
  let safeAge: number | null = null;
  for (let R = o.currentAge; R <= Math.min(85, o.endAge); R++) {
    if (survivesRetiringAt(R)) {
      safeAge = R;
      break;
    }
  }
  const safeNumber = o.annualSpend * (100 / Math.min(o.withdrawalRate, 3.5));
  const sustainableSpend = projWithContrib * (o.withdrawalRate / 100);

  const sectors: RetirementSector[] = (Object.keys(invest) as AssetClass[])
    .map((k) => ({
      key: k,
      label: CLASSES[k].label,
      color: CLASSES[k].color,
      value: invest[k] ?? 0,
      cagr: cagr[k] ?? 0,
      y10: (invest[k] ?? 0) * Math.pow(1 + real(cagr[k] ?? 0), 10),
      y20: (invest[k] ?? 0) * Math.pow(1 + real(cagr[k] ?? 0), 20),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    ...o,
    invest,
    investable,
    cagr,
    baseCagr,
    blended,
    fireNumber,
    target,
    yrsToRetire,
    coastStop,
    coastNumber,
    coastAchieved,
    earliestCoastAge,
    projWithContrib,
    projCoast,
    fireAge,
    fireAgeUp,
    safeAge,
    safeNumber,
    consBlended,
    realBlended,
    safeAccReal,
    safeDrawReal,
    sustainableSpend,
    depletionAge,
    neverDepletes,
    series,
    sectors,
    y10: fv(investable, o.monthly, 10, realBlended),
    y20: fv(investable, o.monthly, 20, realBlended),
  };
}

export interface MonteCarloBand {
  age: number;
  p10: number;
  p50: number;
  p90: number;
}

/** Monte Carlo: random annual returns ~ Normal(blended, sd). */
export function retirementMC(
  positions: Position[],
  opts: RetirementOpts & { sd?: number } = {},
  runs = 500
): { bands: MonteCarloBand[]; successRate: number; runs: number } {
  const o = {
    currentAge: 40,
    retireAge: 65,
    annualSpend: 120000,
    monthly: 8000,
    scenario: "Base",
    cagrOverride: null as ClassMap | null,
    endAge: 95,
    method: "coast" as const,
    coastAge: null as number | null,
    sd: 0.13,
    otherIncome: 0,
    otherIncomeAge: 67,
    includeHome: false,
    inflation: 3,
    withdrawalRate: 4,
    withdrawalStrategy: "constant" as WithdrawalStrategy,
    ...opts,
  };
  const initWR = o.withdrawalRate / 100;
  const invest = investableByClass(positions, o.includeHome);
  const grossInvestable = Object.values(invest).reduce((s, v) => s + (v ?? 0), 0);
  const investable = Math.max(0, grossInvestable - Math.max(0, o.debt ?? 0));
  const cagr: ClassMap = { ...(SCENARIOS[o.scenario] || SCENARIOS.Base), ...(o.cagrOverride || {}) };
  const nominalMean = blendedCAGR(cagr, invest);
  const mean = (1 + nominalMean) / (1 + (o.inflation ?? 3) / 100) - 1; // real return
  const coastStop = o.method === "coast" && o.coastAge != null ? o.coastAge : o.retireAge;
  const years = o.endAge - o.currentAge + 1;
  const cols: number[][] = Array.from({ length: years }, () => []);
  let successes = 0;
  // Seeded PRNG so the simulation is deterministic — identical on server and
  // client (no hydration mismatch) and stable across re-renders.
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const randn = () => {
    let u = 0,
      v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  for (let run = 0; run < runs; run++) {
    let bal = investable;
    let survived = true;
    let curSpend = o.annualSpend;
    let incomeFloorBreached = false;
    for (let i = 0; i < years; i++) {
      const age = o.currentAge + i;
      const r = mean + o.sd * randn();
      bal = bal * (1 + r);
      if (age < o.retireAge) {
        if (age < coastStop) bal += o.monthly * 12;
      } else {
        const g = spendForYear(o.withdrawalStrategy, bal, curSpend, initWR, o.annualSpend);
        curSpend = g.cur;
        if (g.spend < o.annualSpend * 0.5) incomeFloorBreached = true; // income collapsed
        let need = g.spend;
        if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
        bal -= need;
      }
      if (bal <= 0) {
        bal = 0;
        survived = false;
      }
      cols[i].push(bal);
    }
    // success = money never ran out; for the flexible % strategy, also require
    // income never collapsed below half the target.
    if (survived && !(o.withdrawalStrategy === "percent" && incomeFloorBreached)) successes++;
  }
  const pct = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor((p / 100) * (s.length - 1))];
  };
  const bands = cols.map((vals, i) => ({
    age: o.currentAge + i,
    p10: pct(vals, 10),
    p50: pct(vals, 50),
    p90: pct(vals, 90),
  }));
  return { bands, successRate: Math.round((successes / runs) * 100), runs };
}
