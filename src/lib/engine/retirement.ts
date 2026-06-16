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
    ...opts,
  };

  const invest = investableByClass(positions, o.includeHome);
  const investable = Object.values(invest).reduce((s, v) => s + (v ?? 0), 0);
  const baseCagr = SCENARIOS[o.scenario] || SCENARIOS.Base;
  const cagr: ClassMap = { ...baseCagr, ...(o.cagrOverride || {}) };
  const blended = blendedCAGR(cagr, invest);
  const fireNumber = o.annualSpend * (100 / o.withdrawalRate);
  const target = o.target != null ? o.target : fireNumber;
  const yrsToRetire = Math.max(0, o.retireAge - o.currentAge);
  const coastStop = o.method === "coast" && o.coastAge != null ? o.coastAge : o.retireAge;

  const coastNumber = target / Math.pow(1 + blended, yrsToRetire);
  const coastAchieved = investable >= coastNumber;

  const rmAcc = Math.pow(1 + blended, 1 / 12) - 1;
  const drawRate = blended * 0.7; // de-risk in retirement
  const rmDraw = Math.pow(1 + drawRate, 1 / 12) - 1;

  function walk(startBal: number, monthlyContrib: number) {
    let bal = startBal;
    let projAtRetire: number | null = null;
    let depletionAge: number | null = null;
    const yearly: RetirementYear[] = [];
    for (let age = o.currentAge; age <= o.endAge; age++) {
      yearly.push({ age, bal: Math.max(0, bal), phase: age < o.retireAge ? "accum" : "draw", coast: null });
      if (age === o.retireAge) projAtRetire = bal;
      for (let m = 0; m < 12; m++) {
        if (age < o.retireAge) {
          bal = bal * (1 + rmAcc);
          if (age < coastStop) bal += monthlyContrib;
        } else {
          bal = bal * (1 + rmDraw);
          let need = o.annualSpend;
          if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
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

  const consBlended = blendedCAGR(SCENARIOS.Conservative, invest);
  const rmC = Math.pow(1 + consBlended, 1 / 12) - 1;
  const rmCdraw = Math.pow(1 + consBlended * 0.7, 1 / 12) - 1;
  const safeWR = Math.min(o.withdrawalRate, 3.5);
  function survivesRetiringAt(R: number): boolean {
    let bal = investable;
    for (let age = o.currentAge; age < R; age++)
      for (let mo = 0; mo < 12; mo++) bal = bal * (1 + rmC) + o.monthly;
    const safeNeed = o.annualSpend;
    for (let age = R; age <= o.endAge; age++) {
      for (let mo = 0; mo < 12; mo++) {
        bal = bal * (1 + rmCdraw);
        let need = safeNeed;
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
  const safeNumber = o.annualSpend * (100 / safeWR);
  const sustainableSpend = projWithContrib * (o.withdrawalRate / 100);

  const sectors: RetirementSector[] = (Object.keys(invest) as AssetClass[])
    .map((k) => ({
      key: k,
      label: CLASSES[k].label,
      color: CLASSES[k].color,
      value: invest[k] ?? 0,
      cagr: cagr[k] ?? 0,
      y10: (invest[k] ?? 0) * Math.pow(1 + (cagr[k] ?? 0), 10),
      y20: (invest[k] ?? 0) * Math.pow(1 + (cagr[k] ?? 0), 20),
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
    projWithContrib,
    projCoast,
    fireAge,
    fireAgeUp,
    safeAge,
    safeNumber,
    consBlended,
    sustainableSpend,
    depletionAge,
    neverDepletes,
    series,
    sectors,
    y10: fv(investable, o.monthly, 10, blended),
    y20: fv(investable, o.monthly, 20, blended),
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
    ...opts,
  };
  const invest = investableByClass(positions, o.includeHome);
  const investable = Object.values(invest).reduce((s, v) => s + (v ?? 0), 0);
  const cagr: ClassMap = { ...(SCENARIOS[o.scenario] || SCENARIOS.Base), ...(o.cagrOverride || {}) };
  const mean = blendedCAGR(cagr, invest);
  const coastStop = o.method === "coast" && o.coastAge != null ? o.coastAge : o.retireAge;
  const years = o.endAge - o.currentAge + 1;
  const cols: number[][] = Array.from({ length: years }, () => []);
  let successes = 0;
  const randn = () => {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  for (let run = 0; run < runs; run++) {
    let bal = investable;
    let survived = true;
    for (let i = 0; i < years; i++) {
      const age = o.currentAge + i;
      const r = mean + o.sd * randn();
      bal = bal * (1 + r);
      if (age < o.retireAge) {
        if (age < coastStop) bal += o.monthly * 12;
      } else {
        let need = o.annualSpend;
        if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
        bal -= need;
      }
      if (bal <= 0) {
        bal = 0;
        survived = false;
      }
      cols[i].push(bal);
    }
    if (survived) successes++;
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
