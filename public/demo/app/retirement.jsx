/* $ALL — Retirement (Coast FIRE) screen — methods, headline, uncertainty, editable CAGR */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Check, ArrowUp, Bolt } = U;
  const e = React.createElement;
  const P = window.RetireParts, X = window.RetireExtra;

  const METHODS = [
    { value:'traditional', label:'Traditional', retireAge:65 },
    { value:'coast',       label:'Coast FIRE',  retireAge:65 },
    { value:'fire',        label:'FIRE',        retireAge:50 },
  ];

  function Stat({ label, value, sub, color, accent }) {
    return e('div', { style: { flex: 1, minWidth: 150, background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', padding: '15px 18px', boxShadow: 'var(--shadow)', borderTop: accent?`2px solid ${accent}`:undefined } },
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 9 } }, label),
      e('div', { className: 'num', style: { fontSize: 20, fontWeight: 650, letterSpacing: '-.02em', color: color||'var(--ink)' } }, value),
      sub && e('div', { className: 'num', style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 } }, sub));
  }

  function HeroAge({ tone, label, big, prefix, sub }) {
    return e('div', { style: { padding: '22px 26px' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 } },
        e('span', { style: { width: 8, height: 8, borderRadius: 99, background: tone, flex: 'none' } }),
        e('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-2)' } }, label)),
      e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
        prefix && e('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.12em' } }, prefix),
        e('span', { className: 'num', style: { fontSize: 58, fontWeight: 700, letterSpacing: '-.035em', lineHeight: 0.9, color: tone } }, big)),
      e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 11, lineHeight: 1.5, maxWidth: 360 } }, sub));
  }

  function Retirement({ defaults }) {
    const d = defaults || {};
    const [method, setMethod] = React.useState('coast');
    const [scenario, setScenario] = React.useState('Base');
    const [currentAge, setCurrentAge] = React.useState(d.currentAge || 40);
    const [retireAge, setRetireAge] = React.useState(65);
    const [annualSpend, setSpend] = React.useState(d.annualSpend || 60000);
    const [monthly, setMonthly] = React.useState(1500);
    const [target, setTarget] = React.useState(1500000);
    const [withdrawalRate, setWR] = React.useState(4);
    const [coastAge, setCoastAge] = React.useState(55);
    const [includeHome, setIncludeHome] = React.useState(false);
    const [overrides, setOverrides] = React.useState({});
    const [showMC, setShowMC] = React.useState(true);

    const applyMethod = (mth) => { setMethod(mth); const md = METHODS.find(x=>x.value===mth); if (mth==='fire') setRetireAge(a=>Math.min(a,55)); else setRetireAge(65); };
    const setOverride = (k,v) => setOverrides(s => ({ ...s, [k]: v }));
    const resetAll = () => setOverrides({});

    const opts = { currentAge, retireAge: Math.max(retireAge, currentAge+1), annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, cagrOverride: overrides };
    const m = React.useMemo(() => A.retirement(opts), [currentAge, retireAge, annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, JSON.stringify(overrides)]);
    const mc = React.useMemo(() => showMC ? A.retirementMC(opts, 500) : null, [showMC, currentAge, retireAge, annualSpend, monthly, scenario, target, method, coastAge, withdrawalRate, includeHome, JSON.stringify(overrides)]);

    // headline
    const hitsGoal = m.fireAge != null;
    const already = hitsGoal && m.fireAge <= currentAge + 0.05;
    const hitAge = already ? currentAge : (hitsGoal ? Math.ceil(m.fireAge) : null);
    // two hero metrics
    const estBig = !hitsGoal ? '90+' : (already ? 'Now' : String(hitAge));
    const estPrefix = hitsGoal && !already ? 'AGE' : null;
    const estSub = !hitsGoal ? `On the median plan you don\u2019t reach ${A.fmtUSD(m.target)} before age ${m.endAge}.`
      : (already ? `You\u2019re already past your ${A.fmtUSD(m.target)} number — it\u2019s in the bank today.`
                 : `When the median projection crosses your ${A.fmtUSD(m.target)} retirement number.`);
    const safe = m.safeAge;
    const safeNow = safe != null && safe <= currentAge;
    const safeBig = safe == null ? '—' : (safeNow ? 'Now' : String(safe));
    const safePrefix = safe != null && !safeNow ? 'AGE' : null;
    const safeSub = safe == null ? `Even retiring late, a conservative plan can\u2019t safely cover ${A.fmtUSD(m.annualSpend)}/yr to ${m.endAge}.`
      : (safeNow ? `You could stop working today (age ${currentAge}) and the money lasts to ${m.endAge} on conservative ${(m.consBlended*100).toFixed(1)}% returns.`
                 : `Earliest age you can retire and still have the money last to ${m.endAge} on conservative ${(m.consBlended*100).toFixed(1)}% returns.`);

    return e('div', { className: 'nw-page', style: { maxWidth: 1180, margin: '0 auto', padding: '30px 36px 64px' } },
      // ---- top bar ----
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 } },
        e('div', { style: { fontSize: 11, letterSpacing: '.16em', color: 'var(--ink-3)', textTransform: 'uppercase', fontWeight: 600 } }, 'Retirement planner'),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          e(P.Seg, { value: method, options: METHODS, onChange: applyMethod }),
          e('button', { onClick: () => setShowMC(s=>!s), style: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: showMC?'var(--ink)':'var(--ink-3)', background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 99, padding: '6px 13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } },
            e('span', { style: { width: 9, height: 9, borderRadius: 99, background: showMC?'var(--accent)':'var(--ink-3)' } }), showMC?'Uncertainty band on':'Uncertainty band off'))),

      // ---- two-age hero ----
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 18 } },
        e(HeroAge, { tone: 'var(--accent)', label: 'Estimated age to hit retirement number', big: estBig, prefix: estPrefix, sub: estSub }),
        e('div', { style: { borderLeft: 'var(--hair) solid var(--border)' } }, e(HeroAge, { tone: 'var(--pos)', label: 'Safe age to retire · using your assumptions', big: safeBig, prefix: safePrefix, sub: safeSub }))),

      // ---- explainer ----
      e(X.Explainer, null),

      // ---- stat strip ----
      e('div', { style: { display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' } },
        e(Stat, { label: 'Investable now', value: A.fmtUSD(m.investable), sub: `${m.sectors.length} sectors · ${(m.blended*100).toFixed(1)}% blended` }),
        method==='coast'
          ? e(Stat, { label: 'Coast number', value: A.fmtUSD(m.coastNumber), sub: m.coastAchieved?'reached \u2713':'needed today', color: m.coastAchieved?'var(--pos)':'var(--ink)' })
          : e(Stat, { label: 'FIRE number', value: A.fmtUSD(m.fireNumber), sub: `${(100/withdrawalRate).toFixed(0)}\u00d7 spend @ ${withdrawalRate}%` }),
        e(Stat, { label: `Projected at ${m.retireAge}`, value: A.fmtUSD(m.projWithContrib), sub: `coast: ${A.fmtUSD(m.projCoast)}`, accent: 'var(--accent)' }),
        showMC && mc && e(Stat, { label: 'Success rate', value: mc.successRate+'%', sub: `${mc.runs} market sims`, color: mc.successRate>=85?'var(--pos)':mc.successRate>=65?'var(--c-crypto)':'var(--neg)' }),
        e(Stat, { label: 'Money lasts', value: m.neverDepletes?'Sustains':`age ${m.depletionAge}`, color: m.neverDepletes?'var(--pos)':'var(--neg)', sub: `spend ${A.fmtUSD(m.annualSpend)}/yr` })),

      // ---- chart + controls ----
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start', marginBottom: 18 } },
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
          e('div', { style: card() },
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 0' } },
              e('span', { style: { fontSize: 13.5, fontWeight: 600 } }, 'Wealth projection'),
              e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)' } }, `age ${currentAge} → ${m.endAge} · today's dollars · hover to inspect`)),
            e('div', { style: { padding: '12px 22px 18px' } }, e(P.Projection, { m, mc }))),
          e(X.Milestones, { m })),
        // controls
        e('div', { style: { ...card(), padding: '20px' } },
          e('div', { style: { fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 14 } }, 'The big levers'),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: 17 } },
            e('div', null, e('div', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 8 } }, 'Growth scenario'), e(P.Seg, { value: scenario, options: ['Conservative','Base','Aggressive'], onChange: v => { setScenario(v); setOverrides({}); }, small: true })),
            e(P.Slider, { label: 'Current age', value: currentAge, min: 25, max: 60, step: 1, onChange: setCurrentAge }),
            e(P.Slider, { label: method==='fire'?'Retire age (early)':'Retire age', value: retireAge, min: method==='fire'?40:55, max: method==='fire'?60:72, step: 1, onChange: setRetireAge }),
            method==='coast' && e(P.Slider, { label: 'Stop-saving (coast) age', value: Math.min(coastAge,retireAge), min: currentAge+1, max: retireAge, step: 1, onChange: setCoastAge, hint: 'After this age you add $0 and let it compound.' }),
            e(P.Slider, { label: 'Monthly contribution', value: monthly, min: 0, max: 40000, step: 500, onChange: setMonthly, fmt: v => A.fmtUSD(v, { full: true }) }),
            e(P.Slider, { label: 'Annual spend in retirement', value: annualSpend, min: 60000, max: 400000, step: 10000, onChange: setSpend, fmt: v => A.fmtUSD(v) }),
            e(P.Slider, { label: 'Withdrawal rate', value: withdrawalRate, min: 3, max: 6, step: 0.25, onChange: setWR, fmt: v => v+'%', hint: '4% is the classic safe rate. Lower = safer.' }),
            e(P.Slider, { label: 'Retirement goal', value: target, min: 1000000, max: 20000000, step: 250000, onChange: setTarget, fmt: v => A.fmtUSD(v), hint: `Your 4% FIRE number is ${A.fmtUSD(m.fireNumber)}.` }),
            e('label', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', paddingTop: 2 } },
              e('input', { type: 'checkbox', checked: includeHome, onChange: ev => setIncludeHome(ev.target.checked), style: { marginTop: 2, accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 } }),
              e('span', null,
                e('span', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 } }, 'Include primary residence'),
                e('span', { style: { display: 'block', fontSize: 11, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 } }, includeHome ? 'Counting your $2.15M home as a retirement asset (assumes you’d downsize).' : 'Excluded by default — you live in it. Toggle on if you’d tap the equity.'))))
        )),

      // ---- invest-more + coast explainer ----
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 } },
        e('div', { style: { ...card(), padding: '20px 22px' } },
          e('div', { style: { fontSize: 13.5, fontWeight: 600, marginBottom: 4 } }, 'Invest more, retire sooner'),
          e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 } }, 'How your monthly contribution moves the age you hit your goal.'),
          [0, 4000, 8000, 15000, 25000].map(mo => {
            const r = A.retirement({ ...opts, monthly: mo });
            const age = r.fireAge == null ? null : (r.fireAge <= currentAge+0.05 ? currentAge : Math.ceil(r.fireAge));
            const isCur = mo === monthly;
            return e('div', { key: mo, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '9px 11px', borderRadius: 8, background: isCur?'var(--bg-sunk)':'transparent' } },
              e('span', { className: 'num', style: { width: 92, fontSize: 13, fontWeight: 600, color: 'var(--ink)' } }, mo===0?'No new $':`${A.fmtUSD(mo,{full:true})}/mo`),
              e('div', { style: { flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-sunk)', overflow: 'hidden' } }, e('div', { style: { height: '100%', borderRadius: 99, background: isCur?'var(--accent)':'var(--ink-3)', width: `${age==null?100:Math.min(100,Math.max(6,(1-(age-currentAge)/45)*100))}%` } })),
              e('span', { className: 'num', style: { width: 78, textAlign: 'right', fontSize: 13, fontWeight: 600, color: isCur?'var(--accent)':'var(--ink-2)' } }, age==null?'60+ yrs':age<=currentAge+0.05?'Now':`age ${age}`));
          })),
        e('div', { style: { ...card(), padding: '20px 22px' } },
          e('div', { style: { fontSize: 13.5, fontWeight: 600, marginBottom: 4 } }, method==='coast'?'The Coast FIRE idea':'A good year pulls it in'),
          e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 } }, method==='coast'?'Coast FIRE is the moment your invested assets are large enough to grow into your goal on their own — you can stop contributing and still retire on time.':'Markets move your timeline. Strong years pull your goal date in; weak years push it out — which is exactly what the uncertainty band captures.'),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            kv('Goal at retirement', A.fmtUSD(m.target)),
            kv('Needed invested today', A.fmtUSD(m.coastNumber)),
            kv('You have', A.fmtUSD(m.investable), m.coastAchieved?'var(--pos)':'var(--ink)'),
            kv('Coast surplus', (m.investable-m.coastNumber>=0?'+':'−')+A.fmtUSD(Math.abs(m.investable-m.coastNumber)), m.investable-m.coastNumber>=0?'var(--pos)':'var(--neg)')),
          e('div', { style: { marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--bg-sunk)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, display: 'flex', gap: 9 } },
            e(Bolt, { size: 14, color: 'var(--c-crypto)' }),
            e('span', null, e('b', { style: { color: 'var(--ink)' } }, 'A good year pulls it in. '), m.fireAgeUp != null ? `A +10% portfolio bump moves your goal date to ${m.fireAgeUp<=currentAge+0.05?'now':'age '+Math.ceil(m.fireAgeUp)}.` : 'Even a strong year keeps you on the same long horizon at this goal.'))
        )),

      // ---- editable sector CAGR ----
      e(X.SectorEditor, { m, overrides, setOverride, resetAll, scenario }),
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6, marginTop: 14 } },
        'All figures are in today\u2019s dollars; returns are real (after inflation). The uncertainty band runs ', mc?mc.runs:500, ' simulations with random yearly returns around your blended assumption — that\u2019s what exposes sequence-of-returns risk a single smooth line hides. Illustrative model, not financial advice.')
    );
  }

  function kv(k, v, color) { return e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, e('span', { style: { fontSize: 13, color: 'var(--ink-3)' } }, k), e('span', { className: 'num', style: { fontSize: 14, fontWeight: 600, color: color||'var(--ink)' } }, v)); }
  function card(){ return { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }; }

  window.Retirement = Retirement;
})();
