/* $ALL — Overview screen (evolved from Direction B) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Donut, Area, LiveChip, Bolt, ArrowUp, ArrowDown } = U;
  const e = React.createElement;

  function MetricCard({ label, value, sub, subColor }) {
    return e('div', { style: { flex: 1, background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', padding: '17px 19px', boxShadow: 'var(--shadow)' } },
      e('div', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 11 } }, label),
      e('div', { className: 'num', style: { fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--ink)' } }, value),
      sub && e('div', { className: 'num', style: { fontSize: 12.5, color: subColor || 'var(--ink-2)', marginTop: 6, fontWeight: 500 } }, sub)
    );
  }

  function Swatch({ p, size = 36 }) {
    return e(U.AssetIcon, { cls: p.cls, ticker: p.ticker, name: p.name, size, radius: 9 });
  }

  const COLS = '1fr 64px 64px 116px 118px 132px 16px';
  function HoldingRow({ p, navigate }) {
    const value = A.mv(p), basis = A.costBasis(p), pl = value - basis, plPct = basis ? pl/basis*100 : 0;
    const c24 = A.change24(p), c7 = A.change7d(p);
    const [hov, setHov] = React.useState(false);
    const sub = A.unitPriced(p) ? `${A.fmtQty(p.qty)} ${p.ticker}` :
      p.cls==='cash' ? (p.apy!=null ? `${p.account} · ${p.apy}% APY` : p.account) :
      p.cls==='loans' ? `${p.loan.rate}% APR · ${p.loan.paymentsMade} pmts` :
      p.grade ? `${p.grade} · valued ${A.fmtDate(p.valued).replace(', 2026','').replace(', 2025'," '25")}` :
      `valued ${A.fmtDate(p.valued).replace(', 2026','').replace(', 2025'," '25")}`;
    const pctCell = (v) => e('div', { className:'num', style: { textAlign:'right', fontSize:13, fontWeight:500, color: v!=null?(v>=0?'var(--pos)':'var(--neg)'):'var(--ink-3)' } }, v!=null?A.fmtPct(v,true):'—');
    return e('div', { className: 'nw-holding', onClick: () => navigate('detail', p.id), onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
      style: { display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: 12, padding: '12px 22px 12px 24px', borderTop: 'var(--hair) solid var(--border)', cursor: 'pointer', background: hov ? 'var(--surface-2)' : 'transparent' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 13 } },
        e(Swatch, { p }),
        e('div', null,
          e('div', { style: { fontSize: 14, fontWeight: 550, color: 'var(--ink)' } }, p.name),
          e('div', { className: A.unitPriced(p)?'num':'', style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 } }, sub))),
      pctCell(c24),
      pctCell(c7),
      e('div', { className:'num', style: { textAlign:'right', fontSize:13, color:'var(--ink-3)' } }, A.fmtUSD(basis)),
      e('div', { className:'num', style: { textAlign:'right', fontSize:15, fontWeight:600, color:'var(--ink)' } }, A.fmtUSD(value)),
      e('div', { style: { textAlign:'right' } },
        e('div', { className:'num', style: { fontSize:13.5, fontWeight:600, color: pl>=0?'var(--pos)':'var(--neg)' } }, (pl>=0?'+':'−')+A.fmtUSD(Math.abs(pl))),
        e('div', { className:'num', style: { fontSize:11.5, fontWeight:500, color:'var(--ink-3)', marginTop:1 } }, A.fmtPct(plPct,true))),
      e('div', { style: { color: hov ? 'var(--ink-3)' : 'transparent', display: 'flex', justifyContent: 'flex-end' } }, e(U.Chevron, { size: 15 }))
    );
  }

  function AllocBars({ data, total, active, setActive }) {
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%' } },
      data.map(d => {
        const pct = d.value/total*100;
        return e('div', { key: d.key, className: 'nw-alloc-row', onMouseEnter: ()=>setActive(d.key), onMouseLeave: ()=>setActive(null), onClick: ()=>setActive(active===d.key?null:d.key),
          style: { display: 'grid', gridTemplateColumns: '168px 1fr 110px 54px', alignItems: 'center', gap: 16, padding: '10px 10px', borderRadius: 8, cursor: 'pointer', background: active===d.key?'var(--bg-sunk)':'transparent', opacity: active && active!==d.key ? 0.4 : 1, transition: 'opacity .15s' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
            e('span', { style: { width: 9, height: 9, borderRadius: 3, background: d.color, flex: 'none' } }),
            e('span', { style: { fontSize: 13.5, fontWeight: active===d.key?600:500, color: 'var(--ink)' } }, d.label)),
          e('div', { style: { height: 7, borderRadius: 99, background: 'var(--bg-sunk)', overflow: 'hidden' } },
            e('div', { style: { width: `${pct}%`, height: '100%', background: d.color, borderRadius: 99 } })),
          e('span', { className: 'num', style: { fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'right' } }, A.fmtUSD(d.value)),
          e('span', { className: 'num', style: { fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'right' } }, `${pct.toFixed(1)}%`)
        );
      })
    );
  }

  function Overview({ navigate, tweaks }) {
    const [active, setActive] = React.useState(null);
    const [updating, setUpdating] = React.useState(false);
    const [updatedMsg, setUpdatedMsg] = React.useState('');
    const updatePrices = () => { setUpdating(true); setUpdatedMsg(''); setTimeout(() => { setUpdating(false); setUpdatedMsg('Updated just now'); }, 750); };
    const t = A.totals(), cls = t.classes;
    const donutData = Object.values(cls).filter(c => c.value > 0).map(c => ({ key: c.key, label: c.label, color: c.color, value: c.value }));
    const spark = A.history('1W');
    const useBars = tweaks && tweaks.allocChart === 'bars';
    const groups = donutData.map(d => ({ ...d, positions: cls[d.key].positions.slice().sort((a,b)=>A.mv(b)-A.mv(a)) })).filter(g => !active || g.key === active);

    return e('div', { className: 'nw-page', style: { maxWidth: 1240, margin: '0 auto', padding: '32px 36px 64px' } },
      // hero
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 20 } },
        e('div', null,
          e('div', { style: { fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 } }, 'Total net worth'),
          e('div', { className: 'num', style: { fontSize: 52, fontWeight: 650, letterSpacing: '-.035em', lineHeight: 1 } }, A.fmtUSD(t.net, { full: true })),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
            e('span', { className: 'num', style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 600, color: t.change24>=0?'var(--pos)':'var(--neg)' } }, e(t.change24>=0?ArrowUp:ArrowDown,{size:15}), A.fmtUSD(Math.abs(t.change24),{full:true}), ` (${A.fmtPct(t.changePct,true)})`),
            e('span', { style: { fontSize: 13, color: 'var(--ink-3)' } }, 'today'),
            e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 6, fontSize: 12.5, color: 'var(--pos)', fontWeight: 500 } }, e(Bolt,{size:13}), 'markets live · 14s ago')
          )
        ),
        e('div', { style: { textAlign: 'right', cursor: 'pointer' }, onClick: () => navigate('history') },
          e('div', { style: { marginBottom: 8 } }, e(Area, { points: spark, width: 320, height: 70, color: t.change24>=0?'var(--pos)':'var(--neg)' })),
          e('div', { style: { display: 'inline-flex', gap: 4, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } },
            ['1D','1W','1M','1Y','ALL'].map((r,i) => e('span', { key: r, style: { padding: '4px 12px', fontSize: 12, fontWeight: 550, borderRadius: 6, color: i===1?'var(--ink)':'var(--ink-3)', background: i===1?'var(--surface)':'transparent', boxShadow: i===1?'var(--shadow)':'none' } }, r))
          )
        )
      ),
      // metric band
      e('div', { style: { display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' } },
        e(MetricCard, { label: 'Liquid', value: A.fmtUSD(t.liquid), sub: `${(t.liquid/t.net*100).toFixed(0)}% of net worth` }),
        e(MetricCard, { label: 'Illiquid', value: A.fmtUSD(t.illiquid), sub: `${(t.illiquid/t.net*100).toFixed(0)}% of net worth` }),
        e(MetricCard, { label: 'Loans out', value: A.fmtUSD(t.loansOut), sub: `${cls.loans.count} active note${cls.loans.count===1?'':'s'}` }),
        e(MetricCard, { label: 'Cost basis', value: A.fmtUSD(t.basis), sub: 'total invested' }),
        e(MetricCard, { label: 'Total P / L', value: (t.pl>=0?'+':'−')+A.fmtUSD(Math.abs(t.pl)).replace('−',''), sub: A.fmtPct(t.plPct,true), subColor: t.pl>=0?'var(--pos)':'var(--neg)' })
      ),
      // allocation
      e('div', { className: 'nw-stack-2', style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '24px 28px', marginBottom: 18, display: 'grid', gridTemplateColumns: useBars ? '1fr' : '220px 1fr', gap: 40, alignItems: 'center' } },
        !useBars && e('div', { style: { display: 'flex', justifyContent: 'center' } },
          e(Donut, { data: donutData, size: 200, thickness: 30, activeKey: active, onSlice: setActive,
            centerTop: 'Allocation', centerMain: active ? `${(cls[active].value/t.net*100).toFixed(0)}%` : `${donutData.length}`, centerSub: active ? A.CLASSES[active].label : 'classes' })),
        e(AllocBars, { data: donutData, total: t.net, active, setActive })
      ),
      // holdings grouped
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: 'var(--hair) solid var(--border)' } },
          e('span', { style: { fontSize: 14, fontWeight: 600 } }, 'Holdings', active && e('span', { style: { color: 'var(--ink-3)', fontWeight: 450 } }, ` · ${A.CLASSES[active].label}`)),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            updatedMsg && !updating && e('span', { style: { fontSize: 11.5, color: 'var(--pos)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 } }, e(Bolt, { size: 12 }), updatedMsg),
            active && e('button', { onClick: ()=>setActive(null), style: ghostBtn() }, 'Clear filter'),
            e('button', { onClick: updatePrices, disabled: updating, style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: updating?'default':'pointer', fontFamily: 'var(--font-sans)', opacity: updating?0.6:1 } },
              e('span', { style: { display: 'inline-flex', animation: updating?'allspin 0.7s linear infinite':'none' } }, e(U.Refresh, { size: 13 })), updating?'Updating…':'Update prices'))
        ),
        // column headers
        e('div', { className: 'nw-holding', style: { display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '9px 22px 9px 24px', borderBottom: 'var(--hair) solid var(--border)', background: 'var(--surface-2)' } },
          ['Asset','24h','7d','Cost basis','Value','Total return',''].map((h,i)=>e('span',{key:i,style:{fontSize:10.5,fontWeight:600,color:'var(--ink-3)',letterSpacing:'.04em',textTransform:'uppercase',textAlign:i===0?'left':'right'}},h))),
        groups.map(g =>
          e('div', { key: g.key },
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 24px', background: 'var(--surface-2)', borderTop: 'var(--hair) solid var(--border)' } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                e('span', { style: { width: 9, height: 9, borderRadius: 3, background: g.color } }),
                e('span', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' } }, g.label),
                e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)' } }, `${g.positions.length}`),
                e('span', { style: { fontSize: 11, fontWeight: 500, color: cls[g.key].live?'var(--pos)':'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 } }, cls[g.key].live ? [e(Bolt,{key:'b',size:11}),'live'] : 'manual')),
              e('span', { className: 'num', style: { fontSize: 13.5, fontWeight: 600 } }, A.fmtUSD(g.value))
            ),
            g.key === 'private'
              ? subGroups(g.positions).map(sg =>
                  e('div', { key: sg.name },
                    e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 24px 7px 30px', borderTop: 'var(--hair) solid var(--border)' } },
                      e('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' } }, `${sg.name} · ${sg.positions.length}`),
                      e('span', { className: 'num', style: { fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' } }, A.fmtUSD(sg.value))),
                    sg.positions.map(p => e(HoldingRow, { key: p.id, p, navigate }))
                  )
                )
              : g.positions.map(p => e(HoldingRow, { key: p.id, p, navigate }))
          )
        )
      )
    );
  }

  function subGroups(positions) {
    const order = ['Art','Watches','Trading Cards','Jewelry','Other'];
    const map = {};
    for (const p of positions) { const k = p.subcat || 'Other'; (map[k] = map[k] || []).push(p); }
    return Object.keys(map).sort((a,b)=> (order.indexOf(a)+99*(order.indexOf(a)<0)) - (order.indexOf(b)+99*(order.indexOf(b)<0)))
      .map(name => ({ name, positions: map[name].sort((a,b)=>A.mv(b)-A.mv(a)), value: map[name].reduce((s,p)=>s+A.mv(p),0) }));
  }

  function ghostBtn() { return { fontSize: 12, color: 'var(--ink-2)', background: 'var(--bg-sunk)', border: 'none', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-sans)' }; }

  window.Overview = Overview;
})();
