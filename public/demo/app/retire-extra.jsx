/* $ALL — Retirement: FIRE explainer + editable per-class CAGR table */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Plus } = U;
  const e = React.createElement;

  const DEFS = [
    { k:'traditional', name:'Traditional', tag:'retire ~65', text:'Save through a full career and retire around 65, then draw down at a safe withdrawal rate (classically 4% a year).' },
    { k:'coast', name:'Coast FIRE', tag:'stop saving early', text:'Build a big-enough base, then stop adding new money at your “coast age.” Existing investments compound on their own to your number by retirement.' },
    { k:'fire', name:'FIRE', tag:'retire early', text:'Financial Independence, Retire Early. Save aggressively until investments cover your living costs, then retire well before 65 — the stash has to last much longer.' },
  ];

  function Explainer() {
    const [open, setOpen] = React.useState(false);
    return e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 18 } },
      e('button', { onClick: () => setOpen(o => !o), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' } },
        e('span', { style: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' } }, 'What do these methods mean?'),
        e('span', { style: { fontSize: 18, fontWeight: 400, color: 'var(--ink-3)', transform: open?'rotate(45deg)':'none', transition: 'transform .15s' } }, e(Plus, { size: 16 }))),
      open && e('div', { style: { padding: '4px 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } },
        DEFS.map(d => e('div', { key: d.k, style: { padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 9, border: 'var(--hair) solid var(--border)' } },
          e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 } },
            e('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--ink)' } }, d.name),
            e('span', { style: { fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' } }, d.tag)),
          e('div', { style: { fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 } }, d.text))).concat([
            e('div', { key: 'rule', style: { gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, paddingTop: 4 } },
              e('b', { style: { color: 'var(--ink-2)' } }, 'The 4% rule: '), 'a portfolio of about 25× your annual spending can fund retirement indefinitely, withdrawing ~4% a year. That 25× figure is your ', e('b', null, 'FIRE number'), '. Lean FIRE means a smaller number with a frugal budget; Fat FIRE a larger one.')
          ])));
  }

  // ---- editable per-class CAGR ----
  function SectorEditor({ m, overrides, setOverride, resetAll, scenario }) {
    const e2 = React.createElement;
    const td = (right) => ({ padding: '11px 20px', borderTop: 'var(--hair) solid var(--border)', fontSize: 13, color: 'var(--ink)', textAlign: right?'right':'left' });
    return e2('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
      e2('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--hair) solid var(--border)' } },
        e2('div', null,
          e2('span', { style: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' } }, 'Assumed growth by asset class'),
          e2('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 } }, 'Drag any rate — the whole projection recomputes. Crypto especially is a guess, not a forecast.')),
        Object.keys(overrides).length > 0
          ? e2('button', { onClick: resetAll, style: { fontSize: 12, color: 'var(--ink-2)', background: 'var(--bg-sunk)', border: 'none', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600 } }, `Reset to ${scenario}`)
          : e2('span', { style: { fontSize: 11.5, color: 'var(--ink-3)' } }, `${scenario} preset`)),
      e2('table', { className: 'nw-sectbl', style: { width: '100%', borderCollapse: 'collapse' } },
        e2('thead', null, e2('tr', null, ['Asset class','Today','Assumed CAGR','In 10 years','In 20 years'].map((h,i)=>e2('th',{key:i,style:{textAlign:i>0?'right':'left',padding:'10px 20px',fontSize:11,fontWeight:600,color:'var(--ink-3)'}},h)))),
        e2('tbody', null, m.sectors.map(sec => {
          const edited = overrides[sec.key] != null;
          return e2('tr', { key: sec.key },
            e2('td', { style: td() }, e2('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } }, e2('span', { style: { width: 9, height: 9, borderRadius: 3, background: sec.color } }), e2('span', { style: { fontWeight: 550 } }, sec.label))),
            e2('td', { className: 'num', style: td(1) }, A.fmtUSD(sec.value)),
            e2('td', { style: { ...td(1) } },
              e2('div', { style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' } },
                e2('input', { type: 'range', min: 0, max: 30, step: 0.5, value: +(sec.cagr*100).toFixed(1), onChange: ev => setOverride(sec.key, parseFloat(ev.target.value)/100), style: { width: 92, accentColor: 'var(--accent)', cursor: 'pointer', height: 4 } }),
                e2('span', { className: 'num', style: { width: 48, textAlign: 'right', fontWeight: 700, color: edited?'var(--accent)':'var(--ink)' } }, (sec.cagr*100).toFixed(1)+'%'))),
            e2('td', { className: 'num', style: td(1) }, A.fmtUSD(sec.y10)),
            e2('td', { className: 'num', style: { ...td(1), fontWeight: 600 } }, A.fmtUSD(sec.y20)));
        }).concat([
          e2('tr', { key: 'tot', style: { background: 'var(--surface-2)' } },
            e2('td', { style: { ...td(), fontWeight: 700 } }, 'Blended'),
            e2('td', { className: 'num', style: { ...td(1), fontWeight: 700 } }, A.fmtUSD(m.investable)),
            e2('td', { className: 'num', style: { ...td(1), fontWeight: 700, color: 'var(--ink-2)' } }, (m.blended*100).toFixed(1)+'%'),
            e2('td', { className: 'num', style: { ...td(1), fontWeight: 700 } }, A.fmtUSD(m.y10)),
            e2('td', { className: 'num', style: { ...td(1), fontWeight: 700 } }, A.fmtUSD(m.y20)))
        ])))
    );
  }

  window.RetireExtra = { Explainer, SectorEditor, Milestones };

  // ---- milestone timeline (fills space under the chart) ----
  function Milestones({ m }) {
    const e2 = React.createElement;
    const mobile = window.useMobile ? window.useMobile() : false;
    const endBal = m.series[m.series.length-1].bal;
    const nodes = [
      { age: m.currentAge, label: 'Today', value: m.investable, color: 'var(--accent)' },
    ];
    if (m.method === 'coast' && m.coastStop < m.retireAge) nodes.push({ age: m.coastStop, label: 'Stop saving', value: null, color: 'var(--pos)' });
    if (m.fireAge != null && m.fireAge > m.currentAge + 0.05 && m.fireAge <= m.endAge) nodes.push({ age: Math.ceil(m.fireAge), label: 'Goal reached', value: m.target, color: 'var(--c-loans)' });
    nodes.push({ age: m.retireAge, label: 'Retire', value: m.projWithContrib, color: 'var(--ink-2)' });
    nodes.push({ age: m.endAge, label: m.neverDepletes ? 'Plan end' : 'Runs dry', value: m.neverDepletes ? endBal : 0, color: m.neverDepletes ? 'var(--ink-2)' : 'var(--neg)' });
    nodes.sort((a,b)=>a.age-b.age);
    const frac = (age) => (age - m.currentAge) / (m.endAge - m.currentAge) * 100;

    return e2('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '20px 26px 22px' } },
      e2('div', { style: { fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: mobile?14:26 } }, 'Your timeline'),
      mobile && e2('div', { style: { display: 'flex', flexDirection: 'column' } },
        nodes.map((n, i) => e2('div', { key: n.label+n.age, style: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 2px', borderTop: i ? 'var(--hair) solid var(--border)' : 'none' } },
          e2('span', { style: { width: 11, height: 11, borderRadius: 99, background: n.color, flex: 'none' } }),
          e2('div', { style: { flex: 1, minWidth: 0 } }, e2('div', { style: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' } }, n.label), e2('div', { className: 'num', style: { fontSize: 11.5, color: 'var(--ink-3)' } }, `age ${n.age}`)),
          n.value != null && e2('span', { className: 'num', style: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' } }, A.fmtUSD(n.value))))),
      !mobile && e2('div', { style: { position: 'relative', height: 64, margin: '0 6px' } },
        e2('div', { style: { position: 'absolute', left: 0, right: 0, top: 31, height: 3, borderRadius: 99, background: 'var(--bg-sunk)' } }),
        e2('div', { style: { position: 'absolute', left: 0, top: 31, height: 3, borderRadius: 99, background: 'var(--accent)', width: `${frac(Math.min(m.retireAge, m.endAge))}%` } }),
        nodes.map((n, i) => {
          const above = i % 2 === 0;
          return e2('div', { key: n.label+n.age, style: { position: 'absolute', left: `${frac(n.age)}%`, top: 0, height: 64, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
            above && e2('div', { style: { position: 'absolute', bottom: 38, textAlign: 'center', whiteSpace: 'nowrap' } },
              e2('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' } }, n.label),
              n.value != null && e2('div', { className: 'num', style: { fontSize: 11, color: 'var(--ink-3)' } }, A.fmtUSD(n.value))),
            e2('div', { style: { width: 12, height: 12, borderRadius: 99, background: n.color, border: '2.5px solid var(--surface)', boxShadow: '0 0 0 1px var(--border)' } }),
            e2('div', { className: 'num', style: { position: 'absolute', top: above?38:undefined, bottom: above?undefined:38, fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500 } }, `age ${n.age}`),
            !above && e2('div', { style: { position: 'absolute', top: 38, textAlign: 'center', whiteSpace: 'nowrap', paddingTop: 14 } },
              e2('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' } }, n.label),
              n.value != null && e2('div', { className: 'num', style: { fontSize: 11, color: 'var(--ink-3)' } }, A.fmtUSD(n.value))));
        })));
  }
})();
