"use client";

import { useMemo, useState } from "react";
import {
  retirement,
  retirementMC,
  fmtUSD,
  type Position,
  type RetirementOpts,
} from "@/lib/engine";
import { Bolt, Plus } from "@/components/ui/icons";

type M = ReturnType<typeof retirement>;
type MC = ReturnType<typeof retirementMC>;

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" };

const METHODS = [
  { value: "traditional", label: "Traditional" },
  { value: "coast", label: "Coast FIRE" },
  { value: "fire", label: "FIRE" },
] as const;

function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: readonly ({ value: T; label: string } | T)[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
      {options.map((o) => {
        const v = (typeof o === "string" ? o : o.value) as T;
        const label = typeof o === "string" ? o : o.label;
        const active = value === v;
        return (
          <button key={v} onClick={() => onChange(v)} style={{ padding: small ? "5px 11px" : "6px 13px", fontSize: small ? 12 : 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: active ? "var(--ink)" : "var(--ink-3)", background: active ? "var(--surface)" : "transparent", boxShadow: active ? "var(--shadow)" : "none" }}>{label}</button>
        );
      })}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string; hint?: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", height: 4 }} />
      {hint && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 5, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function Stat({ label, value, sub, color, accent }: { label: string; value: string; sub?: string; color?: string; accent?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150, ...card, padding: "15px 18px", borderTop: accent ? `2px solid ${accent}` : undefined }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 9 }}>{label}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 650, letterSpacing: "-.02em", color: color || "var(--ink)" }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function HeroAge({ tone, label, big, prefix, sub }: { tone: string; label: string; big: string; prefix?: string | null; sub: string }) {
  return (
    <div style={{ padding: "22px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: tone, flex: "none" }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-2)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        {prefix && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-3)", letterSpacing: ".12em" }}>{prefix}</span>}
        <span className="num" style={{ fontSize: 58, fontWeight: 700, letterSpacing: "-.035em", lineHeight: 0.9, color: tone }}>{big}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 11, lineHeight: 1.5, maxWidth: 360 }}>{sub}</div>
    </div>
  );
}

function Projection({ m, mc }: { m: M; mc: MC | null }) {
  const W = 1060, H = 384, padL = 8, padB = 28, padT = 26;
  const s = m.series;
  const [hi, setHi] = useState<number | null>(null);
  const tops = s.map((p) => p.bal).concat(mc ? mc.bands.map((b) => b.p90) : []).concat([m.target]);
  const hiV = Math.max(...tops) * 1.1;
  const loV = Math.max(1e5, m.investable * 0.45);
  const x = (age: number) => padL + ((age - m.currentAge) / (m.endAge - m.currentAge)) * (W - padL * 2);
  const lnLo = Math.log(loV), lnHi = Math.log(hiV);
  const y = (v: number) => H - padB - ((Math.log(Math.min(hiV, Math.max(loV, v))) - lnLo) / (lnHi - lnLo)) * (H - padB - padT);
  const gl: number[] = [];
  for (let k = Math.floor(Math.log10(loV)); k <= Math.ceil(Math.log10(hiV)); k++) {
    for (const mlt of [1, 2, 5]) { const v = mlt * Math.pow(10, k); if (v >= loV && v <= hiV) gl.push(v); }
  }
  const sm = (pts: typeof s, key: "bal" | "coast") => {
    const ps = pts.filter((p) => p[key] != null).map((p) => [x(p.age), y(p[key] as number)] as [number, number]);
    if (ps.length < 2) return "";
    let d = `M${ps[0][0].toFixed(1)} ${ps[0][1].toFixed(1)}`;
    for (let i = 0; i < ps.length - 1; i++) {
      const [x0, y0] = ps[Math.max(0, i - 1)], [x1, y1] = ps[i], [x2, y2] = ps[i + 1], [x3, y3] = ps[Math.min(ps.length - 1, i + 2)];
      const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6, c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    return d;
  };
  const balLine = sm(s, "bal");
  const balArea = `${balLine} L${x(m.endAge)} ${H - padB} L${x(m.currentAge)} ${H - padB} Z`;
  const coastLine = sm(s, "coast");
  const retX = x(m.retireAge);
  let bandPath: string | null = null;
  if (mc) {
    const up = mc.bands.map((b) => `${x(b.age).toFixed(1)} ${y(b.p90).toFixed(1)}`);
    const lo = mc.bands.slice().reverse().map((b) => `${x(b.age).toFixed(1)} ${y(b.p10).toFixed(1)}`);
    bandPath = "M" + up.join(" L") + " L" + lo.join(" L") + " Z";
  }
  const crossAge = m.fireAge != null && m.fireAge <= m.endAge ? m.fireAge : null;
  const crossX = crossAge != null ? x(crossAge) : null;
  const hov = hi != null ? s[hi] : null;
  const hb = hi != null && mc ? mc.bands[hi] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}
        onMouseMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          const px = ((ev.clientX - r.left) / r.width) * W;
          const age = Math.round(m.currentAge + ((px - padL) / (W - padL * 2)) * (m.endAge - m.currentAge));
          setHi(Math.min(s.length - 1, Math.max(0, age - m.currentAge)));
        }}
        onMouseLeave={() => setHi(null)}
      >
        <defs>
          <linearGradient id="rfill" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
            <stop offset="62%" stopColor="var(--accent)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="rband" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05} />
          </linearGradient>
          <clipPath id="rclip"><rect x={0} y={padT - 4} width={W} height={H - padB - padT + 4} /></clipPath>
        </defs>
        {gl.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padL} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 5" />
            <text x={padL + 2} y={y(v) - 5} fontSize={10.5} fill="var(--ink-3)" className="num">{fmtUSD(v)}</text>
          </g>
        ))}
        <text x={W - padL - 2} y={padT - 13} textAnchor="end" fontSize={9.5} fill="var(--ink-3)" letterSpacing=".04em">log scale</text>
        <rect x={retX} y={padT} width={W - padL - retX} height={H - padB - padT} fill="var(--bg-sunk)" opacity={0.5} />
        <text x={(padL + retX) / 2} y={padT - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink-3)" letterSpacing=".1em">ACCUMULATION</text>
        <text x={(retX + W - padL) / 2} y={padT - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink-3)" letterSpacing=".1em">RETIREMENT</text>
        {bandPath && <path d={bandPath} fill="url(#rband)" stroke="none" clipPath="url(#rclip)" />}
        <line x1={padL} x2={W - padL} y1={y(m.target)} y2={y(m.target)} stroke="var(--c-loans)" strokeWidth={1.2} strokeDasharray="5 4" />
        <text x={W - padL - 2} y={y(m.target) - 7} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--c-loans)" className="num">{`Goal ${fmtUSD(m.target)}`}</text>
        <line x1={retX} x2={retX} y1={padT} y2={H - padB} stroke="var(--ink-3)" strokeWidth={1} />
        <text x={retX} y={padT - 1} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--ink-2)">{`Retire · ${m.retireAge}`}</text>
        {m.method === "coast" && m.coastStop < m.retireAge && (
          <g>
            <line x1={x(m.coastStop)} x2={x(m.coastStop)} y1={padT} y2={H - padB} stroke="var(--pos)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={x(m.coastStop)} y={padT - 1} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--pos)">stop saving</text>
          </g>
        )}
        <path d={balArea} fill="url(#rfill)" clipPath="url(#rclip)" />
        <path d={balLine} fill="none" stroke="var(--accent)" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#rclip)" />
        {coastLine && <path d={coastLine} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="4 4" />}
        <circle cx={x(m.currentAge)} cy={y(m.investable)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        {crossX != null && crossAge != null && (
          <g>
            <circle cx={crossX} cy={y(m.target)} r={5.5} fill="var(--c-loans)" stroke="var(--surface)" strokeWidth={2.5} />
            <g transform={`translate(${Math.min(Math.max(crossX, 72), W - 72)}, ${y(m.target) - 16})`}>
              <rect x={-66} y={-17} width={132} height={21} rx={10} fill="var(--c-loans)" />
              <text x={0} y={-2.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#fff">{crossAge <= m.currentAge + 0.05 ? "Goal reached today" : `Goal reached · age ${Math.ceil(crossAge)}`}</text>
            </g>
          </g>
        )}
        {hov && (
          <g>
            <line x1={x(hov.age)} x2={x(hov.age)} y1={padT - 4} y2={H - padB} stroke="var(--ink-3)" strokeWidth={0.8} />
            {hb && <circle cx={x(hov.age)} cy={y(hb.p90)} r={3} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.6} />}
            {hb && <circle cx={x(hov.age)} cy={y(hb.p10)} r={3} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.6} />}
            <circle cx={x(hov.age)} cy={y(hov.bal)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        {[m.currentAge, m.retireAge, m.endAge].map((age, i) => (
          <text key={i} x={x(age)} y={H - 7} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize={11} fill="var(--ink-3)" className="num">{`age ${age}`}</text>
        ))}
      </svg>
      {hov && (
        <div style={{ position: "absolute", left: `${(x(hov.age) / W) * 100}%`, top: 2, transform: `translateX(${x(hov.age) > W * 0.7 ? "-105%" : "8px"})`, background: "var(--surface)", border: "var(--hair) solid var(--border-strong)", borderRadius: 9, boxShadow: "var(--shadow)", padding: "9px 12px", pointerEvents: "none", minWidth: 132 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>{`Age ${hov.age}${hov.age < m.retireAge ? "" : " · retired"}`}</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.01em" }}>{fmtUSD(hov.bal)}</div>
          {hb && <div className="num" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{`range ${fmtUSD(hb.p10)} – ${fmtUSD(hb.p90)}`}</div>}
        </div>
      )}
    </div>
  );
}

function Milestones({ m }: { m: M }) {
  const endBal = m.series[m.series.length - 1].bal;
  const nodes: { age: number; label: string; value: number | null; color: string }[] = [
    { age: m.currentAge, label: "Today", value: m.investable, color: "var(--accent)" },
  ];
  if (m.method === "coast" && m.coastStop < m.retireAge) nodes.push({ age: m.coastStop, label: "Stop saving", value: null, color: "var(--pos)" });
  if (m.fireAge != null && m.fireAge > m.currentAge + 0.05 && m.fireAge <= m.endAge) nodes.push({ age: Math.ceil(m.fireAge), label: "Goal reached", value: m.target, color: "var(--c-loans)" });
  nodes.push({ age: m.retireAge, label: "Retire", value: m.projWithContrib, color: "var(--ink-2)" });
  nodes.push({ age: m.endAge, label: m.neverDepletes ? "Plan end" : "Runs dry", value: m.neverDepletes ? endBal : 0, color: m.neverDepletes ? "var(--ink-2)" : "var(--neg)" });
  nodes.sort((a, b) => a.age - b.age);
  const frac = (age: number) => ((age - m.currentAge) / (m.endAge - m.currentAge)) * 100;

  return (
    <div style={{ ...card, padding: "20px 26px 22px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 26 }}>Your timeline</div>
      <div style={{ position: "relative", height: 64, margin: "0 6px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 31, height: 3, borderRadius: 99, background: "var(--bg-sunk)" }} />
        <div style={{ position: "absolute", left: 0, top: 31, height: 3, borderRadius: 99, background: "var(--accent)", width: `${frac(Math.min(m.retireAge, m.endAge))}%` }} />
        {nodes.map((n, i) => {
          const above = i % 2 === 0;
          return (
            <div key={n.label + n.age} style={{ position: "absolute", left: `${frac(n.age)}%`, top: 0, height: 64, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {above && (
                <div style={{ position: "absolute", bottom: 38, textAlign: "center", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{n.label}</div>
                  {n.value != null && <div className="num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtUSD(n.value)}</div>}
                </div>
              )}
              <div style={{ width: 12, height: 12, borderRadius: 99, background: n.color, border: "2.5px solid var(--surface)", boxShadow: "0 0 0 1px var(--border)" }} />
              <div className="num" style={{ position: "absolute", top: above ? 38 : undefined, bottom: above ? undefined : 38, fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500 }}>{`age ${n.age}`}</div>
              {!above && (
                <div style={{ position: "absolute", top: 38, textAlign: "center", whiteSpace: "nowrap", paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>{n.label}</div>
                  {n.value != null && <div className="num" style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtUSD(n.value)}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RetirementPlanner({ positions }: { positions: Position[] }) {
  const [method, setMethod] = useState<"traditional" | "coast" | "fire">("coast");
  const [scenario, setScenario] = useState("Base");
  const [currentAge, setCurrentAge] = useState(40);
  const [retireAge, setRetireAge] = useState(65);
  const [annualSpend, setSpend] = useState(120000);
  const [monthly, setMonthly] = useState(8000);
  const [target, setTarget] = useState(3000000);
  const [withdrawalRate, setWR] = useState(4);
  const [coastAge, setCoastAge] = useState(55);
  const [includeHome, setIncludeHome] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [showMC, setShowMC] = useState(true);

  const applyMethod = (mth: "traditional" | "coast" | "fire") => { setMethod(mth); setRetireAge(mth === "fire" ? 50 : 65); };

  const opts: RetirementOpts = { currentAge, retireAge: Math.max(retireAge, currentAge + 1), annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, cagrOverride: overrides };
  const ovKey = JSON.stringify(overrides);
  const m = useMemo(() => retirement(positions, opts), [positions, currentAge, retireAge, annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, ovKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const mc = useMemo(() => (showMC ? retirementMC(positions, { ...opts, sd: 0.13 }, 500) : null), [positions, showMC, currentAge, retireAge, annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, ovKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hitsGoal = m.fireAge != null;
  const already = hitsGoal && (m.fireAge as number) <= currentAge + 0.05;
  const hitAge = already ? currentAge : hitsGoal ? Math.ceil(m.fireAge as number) : null;
  const estBig = !hitsGoal ? "90+" : already ? "Now" : String(hitAge);
  const estPrefix = hitsGoal && !already ? "AGE" : null;
  const estSub = !hitsGoal ? `On the median plan you don’t reach ${fmtUSD(m.target)} before age ${m.endAge}.` : already ? `You’re already past your ${fmtUSD(m.target)} number — it’s in the bank today.` : `When the median projection crosses your ${fmtUSD(m.target)} retirement number.`;
  const safe = m.safeAge;
  const safeNow = safe != null && safe <= currentAge;
  const safeBig = safe == null ? "—" : safeNow ? "Now" : String(safe);
  const safePrefix = safe != null && !safeNow ? "AGE" : null;
  const safeSub = safe == null ? `Even retiring late, a conservative plan can’t safely cover ${fmtUSD(m.annualSpend)}/yr to ${m.endAge}.` : safeNow ? `You could stop working today (age ${currentAge}) and the money lasts to ${m.endAge} on conservative ${(m.consBlended * 100).toFixed(1)}% returns.` : `Earliest age you can retire and still have the money last to ${m.endAge} on conservative ${(m.consBlended * 100).toFixed(1)}% returns.`;

  const kv = (k: string, v: string, color?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{k}</span>
      <span className="num" style={{ fontSize: 14, fontWeight: 600, color: color || "var(--ink)" }}>{v}</span>
    </div>
  );

  if (m.investable <= 0) {
    return (
      <div className="nw-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 36px 64px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: "-.02em" }}>Retirement</h1>
        <div style={{ ...card, marginTop: 24, padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
          Add some investable assets (crypto, stocks, metals, cash, collectibles) to project your
          retirement. Load the sample portfolio to see it in action.
        </div>
      </div>
    );
  }

  return (
    <div className="nw-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 36px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: ".16em", color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 600 }}>Retirement planner</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Seg value={method} options={METHODS} onChange={applyMethod} />
          <button onClick={() => setShowMC((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: showMC ? "var(--ink)" : "var(--ink-3)", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 99, padding: "6px 13px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: showMC ? "var(--accent)" : "var(--ink-3)" }} />
            {showMC ? "Uncertainty band on" : "Uncertainty band off"}
          </button>
        </div>
      </div>

      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", ...card, marginBottom: 18 }}>
        <HeroAge tone="var(--accent)" label="Estimated age to hit retirement number" big={estBig} prefix={estPrefix} sub={estSub} />
        <div style={{ borderLeft: "var(--hair) solid var(--border)" }}>
          <HeroAge tone="var(--pos)" label="Safe age to retire · using your assumptions" big={safeBig} prefix={safePrefix} sub={safeSub} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <Stat label="Investable now" value={fmtUSD(m.investable)} sub={`${m.sectors.length} sectors · ${(m.blended * 100).toFixed(1)}% blended`} />
        {method === "coast" ? (
          <Stat label="Coast number" value={fmtUSD(m.coastNumber)} sub={m.coastAchieved ? "reached ✓" : "needed today"} color={m.coastAchieved ? "var(--pos)" : "var(--ink)"} />
        ) : (
          <Stat label="FIRE number" value={fmtUSD(m.fireNumber)} sub={`${(100 / withdrawalRate).toFixed(0)}× spend @ ${withdrawalRate}%`} />
        )}
        <Stat label={`Projected at ${m.retireAge}`} value={fmtUSD(m.projWithContrib)} sub={`coast: ${fmtUSD(m.projCoast)}`} accent="var(--accent)" />
        {showMC && mc && <Stat label="Success rate" value={mc.successRate + "%"} sub={`${mc.runs} market sims`} color={mc.successRate >= 85 ? "var(--pos)" : mc.successRate >= 65 ? "var(--c-crypto)" : "var(--neg)"} />}
        <Stat label="Money lasts" value={m.neverDepletes ? "Sustains" : `age ${m.depletionAge}`} color={m.neverDepletes ? "var(--pos)" : "var(--neg)"} sub={`spend ${fmtUSD(m.annualSpend)}/yr`} />
      </div>

      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start", marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px 0" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Wealth projection</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{`age ${currentAge} → ${m.endAge} · today's dollars · hover to inspect`}</span>
            </div>
            <div style={{ padding: "12px 22px 18px" }}><Projection m={m} mc={mc} /></div>
          </div>
          <Milestones m={m} />
        </div>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 14 }}>The big levers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500, marginBottom: 8 }}>Growth scenario</div>
              <Seg value={scenario} options={["Conservative", "Base", "Aggressive"]} onChange={(v) => { setScenario(v); setOverrides({}); }} small />
            </div>
            <Slider label="Current age" value={currentAge} min={25} max={60} step={1} onChange={setCurrentAge} />
            <Slider label={method === "fire" ? "Retire age (early)" : "Retire age"} value={retireAge} min={method === "fire" ? 40 : 55} max={method === "fire" ? 60 : 72} step={1} onChange={setRetireAge} />
            {method === "coast" && <Slider label="Stop-saving (coast) age" value={Math.min(coastAge, retireAge)} min={currentAge + 1} max={retireAge} step={1} onChange={setCoastAge} hint="After this age you add $0 and let it compound." />}
            <Slider label="Monthly contribution" value={monthly} min={0} max={40000} step={500} onChange={setMonthly} fmt={(v) => fmtUSD(v, { full: true })} />
            <Slider label="Annual spend in retirement" value={annualSpend} min={40000} max={400000} step={10000} onChange={setSpend} fmt={(v) => fmtUSD(v)} />
            <Slider label="Withdrawal rate" value={withdrawalRate} min={3} max={6} step={0.25} onChange={setWR} fmt={(v) => v + "%"} hint="4% is the classic safe rate. Lower = safer." />
            <Slider label="Retirement goal" value={target} min={1000000} max={20000000} step={250000} onChange={setTarget} fmt={(v) => fmtUSD(v)} hint={`Your 4% FIRE number is ${fmtUSD(m.fireNumber)}.`} />
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", paddingTop: 2 }}>
              <input type="checkbox" checked={includeHome} onChange={(e) => setIncludeHome(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--accent)", cursor: "pointer", width: 15, height: 15 }} />
              <span>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>Include primary residence</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.45 }}>{includeHome ? "Counting your home as a retirement asset (assumes you’d downsize)." : "Excluded by default — you live in it. Toggle on if you’d tap the equity."}</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <div style={{ ...card, padding: "20px 22px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Invest more, retire sooner</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>How your monthly contribution moves the age you hit your goal.</div>
          {[0, 4000, 8000, 15000, 25000].map((mo) => {
            const r = retirement(positions, { ...opts, monthly: mo });
            const age = r.fireAge == null ? null : r.fireAge <= currentAge + 0.05 ? currentAge : Math.ceil(r.fireAge);
            const isCur = mo === monthly;
            return (
              <div key={mo} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 11px", borderRadius: 8, background: isCur ? "var(--bg-sunk)" : "transparent" }}>
                <span className="num" style={{ width: 92, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{mo === 0 ? "No new $" : `${fmtUSD(mo, { full: true })}/mo`}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--bg-sunk)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: isCur ? "var(--accent)" : "var(--ink-3)", width: `${age == null ? 100 : Math.min(100, Math.max(6, (1 - (age - currentAge) / 45) * 100))}%` }} />
                </div>
                <span className="num" style={{ width: 78, textAlign: "right", fontSize: 13, fontWeight: 600, color: isCur ? "var(--accent)" : "var(--ink-2)" }}>{age == null ? "60+ yrs" : age <= currentAge + 0.05 ? "Now" : `age ${age}`}</span>
              </div>
            );
          })}
        </div>
        <div style={{ ...card, padding: "20px 22px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{method === "coast" ? "The Coast FIRE idea" : "A good year pulls it in"}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>{method === "coast" ? "Coast FIRE is the moment your invested assets are large enough to grow into your goal on their own — you can stop contributing and still retire on time." : "Markets move your timeline. Strong years pull your goal date in; weak years push it out — which is exactly what the uncertainty band captures."}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kv("Goal at retirement", fmtUSD(m.target))}
            {kv("Needed invested today", fmtUSD(m.coastNumber))}
            {kv("You have", fmtUSD(m.investable), m.coastAchieved ? "var(--pos)" : "var(--ink)")}
            {kv("Coast surplus", (m.investable - m.coastNumber >= 0 ? "+" : "−") + fmtUSD(Math.abs(m.investable - m.coastNumber)), m.investable - m.coastNumber >= 0 ? "var(--pos)" : "var(--neg)")}
          </div>
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: "var(--bg-sunk)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, display: "flex", gap: 9 }}>
            <Bolt size={14} color="var(--c-crypto)" />
            <span><b style={{ color: "var(--ink)" }}>A good year pulls it in. </b>{m.fireAgeUp != null ? `A +10% portfolio bump moves your goal date to ${m.fireAgeUp <= currentAge + 0.05 ? "now" : "age " + Math.ceil(m.fireAgeUp)}.` : "Even a strong year keeps you on the same long horizon at this goal."}</span>
          </div>
        </div>
      </div>

      {/* editable sector CAGR */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "var(--hair) solid var(--border)" }}>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Assumed growth by asset class</span>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>Drag any rate — the whole projection recomputes. Crypto especially is a guess, not a forecast.</div>
          </div>
          {Object.keys(overrides).length > 0 ? (
            <button onClick={() => setOverrides({})} style={{ fontSize: 12, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "none", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}>{`Reset to ${scenario}`}</button>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{`${scenario} preset`}</span>
          )}
        </div>
        <table className="nw-sectbl" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Asset class", "Today", "Assumed CAGR", "In 10 years", "In 20 years"].map((h, i) => (
              <th key={i} style={{ textAlign: i > 0 ? "right" : "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {m.sectors.map((sec) => {
              const edited = overrides[sec.key] != null;
              const td = (right?: boolean): React.CSSProperties => ({ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", fontSize: 13, color: "var(--ink)", textAlign: right ? "right" : "left" });
              return (
                <tr key={sec.key}>
                  <td style={td()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: sec.color }} />
                      <span style={{ fontWeight: 550 }}>{sec.label}</span>
                    </div>
                  </td>
                  <td className="num" style={td(true)}>{fmtUSD(sec.value)}</td>
                  <td style={td(true)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                      <input type="range" min={0} max={30} step={0.5} value={+(sec.cagr * 100).toFixed(1)} onChange={(e) => setOverrides((s) => ({ ...s, [sec.key]: parseFloat(e.target.value) / 100 }))} style={{ width: 92, accentColor: "var(--accent)", cursor: "pointer", height: 4 }} />
                      <span className="num" style={{ width: 48, textAlign: "right", fontWeight: 700, color: edited ? "var(--accent)" : "var(--ink)" }}>{(sec.cagr * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="num" style={td(true)}>{fmtUSD(sec.y10)}</td>
                  <td className="num" style={{ ...td(true), fontWeight: 600 }}>{fmtUSD(sec.y20)}</td>
                </tr>
              );
            })}
            <tr style={{ background: "var(--surface-2)" }}>
              <td style={{ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", fontWeight: 700 }}>Blended</td>
              <td className="num" style={{ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", textAlign: "right", fontWeight: 700 }}>{fmtUSD(m.investable)}</td>
              <td className="num" style={{ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", textAlign: "right", fontWeight: 700, color: "var(--ink-2)" }}>{(m.blended * 100).toFixed(1)}%</td>
              <td className="num" style={{ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", textAlign: "right", fontWeight: 700 }}>{fmtUSD(m.y10)}</td>
              <td className="num" style={{ padding: "11px 20px", borderTop: "var(--hair) solid var(--border)", textAlign: "right", fontWeight: 700 }}>{fmtUSD(m.y20)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.6, marginTop: 14 }}>
        All figures are in today’s dollars; returns are real (after inflation). The uncertainty band runs {mc ? mc.runs : 500} simulations with random yearly returns around your blended assumption — exposing sequence-of-returns risk a single smooth line hides. Illustrative model, not financial advice.
      </div>
    </div>
  );
}
