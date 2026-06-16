/* $ALL — Retirement screen building blocks (controls, chart, explainer, sector editor) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Bolt } = U;
  const e = React.createElement;

  function Seg({ value, options, onChange, small }) {
    return e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } },
      options.map(o => e('button', { key: o.value||o, onClick: () => onChange(o.value||o), style: { padding: small?'5px 11px':'6px 13px', fontSize: small?12:12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: value===(o.value||o)?'var(--ink)':'var(--ink-3)', background: value===(o.value||o)?'var(--surface)':'transparent', boxShadow: value===(o.value||o)?'var(--shadow)':'none' } }, o.label||o)));
  }

  function Slider({ label, value, min, max, step, onChange, fmt, hint }) {
    return e('div', null,
      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 } },
        e('span', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 } }, label),
        e('span', { className: 'num', style: { fontSize: 14, fontWeight: 700, color: 'var(--ink)' } }, fmt ? fmt(value) : value)),
      e('input', { type: 'range', min, max, step, value, onChange: ev => onChange(parseFloat(ev.target.value)), style: { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 4 } }),
      hint && e('div', { style: { fontSize: 11, color: 'var(--ink-3)', marginTop: 5, lineHeight: 1.4 } }, hint));
  }

  // ---- projection chart with optional Monte Carlo band + hover readout ----
  function Projection({ m, mc, height }) {
    const W = 1060, H = height || 384, padL = 8, padB = 28, padT = 26;
    const s = m.series;
    const [hi, setHi] = React.useState(null);
    const tops = s.map(p => p.bal).concat(mc ? mc.bands.map(b=>b.p90) : []).concat([m.target]);
    const hiV = Math.max(...tops) * 1.10;
    const loV = Math.max(1e5, m.investable * 0.45);
    const x = (age) => padL + (age - m.currentAge) / (m.endAge - m.currentAge) * (W - padL * 2);
    const lnLo = Math.log(loV), lnHi = Math.log(hiV);
    const y = (v) => (H - padB) - (Math.log(Math.min(hiV, Math.max(loV, v))) - lnLo) / (lnHi - lnLo) * (H - padB - padT);
    // "nice" log gridlines: 1,2,5 × 10^k within [loV,hiV]
    const gl = [];
    for (let k = Math.floor(Math.log10(loV)); k <= Math.ceil(Math.log10(hiV)); k++) {
      for (const mlt of [1,2,5]) { const v = mlt * Math.pow(10,k); if (v >= loV && v <= hiV) gl.push(v); }
    }
    const sm = (pts, key) => { // smooth path (catmull-rom-ish)
      const ps = pts.filter(p => p[key] != null).map(p => [x(p.age), y(p[key])]);
      if (ps.length < 2) return '';
      let d = `M${ps[0][0].toFixed(1)} ${ps[0][1].toFixed(1)}`;
      for (let i = 0; i < ps.length - 1; i++) {
        const [x0,y0]=ps[Math.max(0,i-1)],[x1,y1]=ps[i],[x2,y2]=ps[i+1],[x3,y3]=ps[Math.min(ps.length-1,i+2)];
        const c1x=x1+(x2-x0)/6, c1y=y1+(y2-y0)/6, c2x=x2-(x3-x1)/6, c2y=y2-(y3-y1)/6;
        d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }
      return d;
    };
    const balLine = sm(s, 'bal');
    const balArea = `${balLine} L${x(m.endAge)} ${H-padB} L${x(m.currentAge)} ${H-padB} Z`;
    const coastLine = sm(s, 'coast');
    const retX = x(m.retireAge);
    let bandPath = null;
    if (mc) {
      const up = mc.bands.map(b => `${x(b.age).toFixed(1)} ${y(b.p90).toFixed(1)}`);
      const lo = mc.bands.slice().reverse().map(b => `${x(b.age).toFixed(1)} ${y(b.p10).toFixed(1)}`);
      bandPath = 'M' + up.join(' L') + ' L' + lo.join(' L') + ' Z';
    }
    const crossAge = m.fireAge != null && m.fireAge <= m.endAge ? m.fireAge : null;
    const crossX = crossAge != null ? x(crossAge) : null;
    const hov = hi != null ? s[hi] : null;
    const hb = (hi != null && mc) ? mc.bands[hi] : null;

    const onMove = (ev) => {
      const r = ev.currentTarget.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * W;
      const age = Math.round(m.currentAge + (px - padL) / (W - padL*2) * (m.endAge - m.currentAge));
      const idx = Math.min(s.length-1, Math.max(0, age - m.currentAge));
      setHi(idx);
    };

    return e('div', { style: { position: 'relative' } },
      e('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' }, onMouseMove: onMove, onMouseLeave: () => setHi(null) },
        e('defs', null,
          e('linearGradient', { id: 'rfill', x1:0,y1:0,x2:0,y2:1 }, e('stop',{offset:'0%',stopColor:'var(--accent)',stopOpacity:0.22}), e('stop',{offset:'62%',stopColor:'var(--accent)',stopOpacity:0.05}), e('stop',{offset:'100%',stopColor:'var(--accent)',stopOpacity:0})),
          e('linearGradient', { id: 'rband', x1:0,y1:0,x2:0,y2:1 }, e('stop',{offset:'0%',stopColor:'var(--accent)',stopOpacity:0.20}), e('stop',{offset:'100%',stopColor:'var(--accent)',stopOpacity:0.05})),
          e('clipPath', { id: 'rclip' }, e('rect', { x: 0, y: padT-4, width: W, height: H-padB-padT+4 }))),
        // gridlines + right-aligned y labels
        gl.map((v,i) => e('g',{key:i},
          e('line',{x1:padL,x2:W-padL,y1:y(v),y2:y(v),stroke:'var(--border)',strokeWidth:0.5,strokeDasharray:'2 5'}),
          e('text',{x:padL+2,y:y(v)-5,fontSize:10.5,fill:'var(--ink-3)',className:'num'},A.fmtUSD(v)))),
        e('text',{x:W-padL-2,y:padT-13,textAnchor:'end',fontSize:9.5,fill:'var(--ink-3)',letterSpacing:'.04em'},'log scale'),
        // retired-phase shade
        e('rect',{x:retX,y:padT,width:W-padL-retX,height:H-padB-padT,fill:'var(--bg-sunk)',opacity:0.5}),
        // phase labels
        e('text',{x:(padL+retX)/2,y:padT-10,textAnchor:'middle',fontSize:10,fontWeight:600,fill:'var(--ink-3)',letterSpacing:'.1em'},'ACCUMULATION'),
        e('text',{x:(retX+W-padL)/2,y:padT-10,textAnchor:'middle',fontSize:10,fontWeight:600,fill:'var(--ink-3)',letterSpacing:'.1em'},'RETIREMENT'),
        bandPath && e('path',{d:bandPath,fill:'url(#rband)',stroke:'none',clipPath:'url(#rclip)'}),
        // goal line
        e('line',{x1:padL,x2:W-padL,y1:y(m.target),y2:y(m.target),stroke:'var(--c-loans)',strokeWidth:1.2,strokeDasharray:'5 4'}),
        e('text',{x:W-padL-2,y:y(m.target)-7,textAnchor:'end',fontSize:11,fontWeight:600,fill:'var(--c-loans)',className:'num'},`Goal ${A.fmtUSD(m.target)}`),
        // retire marker
        e('line',{x1:retX,x2:retX,y1:padT,y2:H-padB,stroke:'var(--ink-3)',strokeWidth:1}),
        e('text',{x:retX,y:padT-26<0?padT+12:padT-1,textAnchor:'middle',fontSize:10.5,fontWeight:600,fill:'var(--ink-2)'},`Retire · ${m.retireAge}`),
        // coast stop marker
        m.method==='coast' && m.coastStop < m.retireAge && e('g',null,
          e('line',{x1:x(m.coastStop),x2:x(m.coastStop),y1:padT,y2:H-padB,stroke:'var(--pos)',strokeWidth:1,strokeDasharray:'3 3'}),
          e('text',{x:x(m.coastStop),y:padT-1,textAnchor:'middle',fontSize:10,fontWeight:600,fill:'var(--pos)'},'stop saving')),
        // area + lines
        e('path',{d:balArea,fill:'url(#rfill)',clipPath:'url(#rclip)'}),
        e('path',{d:balLine,fill:'none',stroke:'var(--accent)',strokeWidth:2.6,strokeLinejoin:'round',strokeLinecap:'round',clipPath:'url(#rclip)'}),
        coastLine && e('path',{d:coastLine,fill:'none',stroke:'var(--ink-3)',strokeWidth:1.5,strokeDasharray:'4 4'}),
        // today dot
        e('circle',{cx:x(m.currentAge),cy:y(m.investable),r:4,fill:'var(--accent)',stroke:'var(--surface)',strokeWidth:2}),
        // goal-reached marker + pill
        crossX != null && e('g',null,
          e('circle',{cx:crossX,cy:y(m.target),r:5.5,fill:'var(--c-loans)',stroke:'var(--surface)',strokeWidth:2.5}),
          e('g',{transform:`translate(${Math.min(Math.max(crossX,72),W-72)}, ${y(m.target)-16})`},
            e('rect',{x:-66,y:-17,width:132,height:21,rx:10,fill:'var(--c-loans)'}),
            e('text',{x:0,y:-2.5,textAnchor:'middle',fontSize:10.5,fontWeight:700,fill:'#fff'}, crossAge<=m.currentAge+0.05?'Goal reached today':`Goal reached · age ${Math.ceil(crossAge)}`))),
        // hover guide
        hov && e('g',null,
          e('line',{x1:x(hov.age),x2:x(hov.age),y1:padT-4,y2:H-padB,stroke:'var(--ink-3)',strokeWidth:0.8}),
          hb && e('circle',{cx:x(hov.age),cy:y(hb.p90),r:3,fill:'none',stroke:'var(--accent)',strokeWidth:1.5,opacity:0.6}),
          hb && e('circle',{cx:x(hov.age),cy:y(hb.p10),r:3,fill:'none',stroke:'var(--accent)',strokeWidth:1.5,opacity:0.6}),
          e('circle',{cx:x(hov.age),cy:y(hov.bal),r:5,fill:'var(--accent)',stroke:'var(--surface)',strokeWidth:2})),
        // x labels
        [m.currentAge, m.retireAge, m.endAge].map((age,i)=>e('text',{key:i,x:x(age),y:H-7,textAnchor:i===0?'start':i===2?'end':'middle',fontSize:11,fill:'var(--ink-3)',className:'num'},`age ${age}`))
      ),
      // hover tooltip (HTML)
      hov && e('div', { style: { position: 'absolute', left: `${x(hov.age)/W*100}%`, top: 2, transform: `translateX(${x(hov.age) > W*0.7 ? '-105%' : '8px'})`, background: 'var(--surface)', border: 'var(--hair) solid var(--border-strong)', borderRadius: 9, boxShadow: 'var(--shadow)', padding: '9px 12px', pointerEvents: 'none', minWidth: 132 } },
        e('div', { style: { fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4 } }, `Age ${hov.age}${hov.age<m.retireAge?'':' · retired'}`),
        e('div', { className: 'num', style: { fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' } }, A.fmtUSD(hov.bal)),
        hb && e('div', { className: 'num', style: { fontSize: 11, color: 'var(--ink-3)', marginTop: 3 } }, `range ${A.fmtUSD(hb.p10)} – ${A.fmtUSD(hb.p90)}`)),
      e('div', { style: { display: 'flex', gap: 18, marginTop: 12, fontSize: 12, flexWrap: 'wrap' } },
        leg('var(--accent)', `Projected · $${(m.monthly/1000).toFixed(0)}K/mo`),
        leg('var(--ink-3)', 'Coast — no new $', true),
        mc && leg('var(--accent)', '10th–90th percentile', false, true),
        leg('var(--c-loans)', 'Goal', false, true)));
  }
  function leg(color, label, dashed, square) {
    return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--ink-2)' } },
      e('span', { style: { width: 16, height: square?9:0, borderRadius: 2, background: square?color:'transparent', opacity: square&&!dashed?(label.includes('percentile')?0.25:1):1, borderTop: square?'none':`2px ${dashed?'dashed':'solid'} ${color}` } }), label);
  }

  window.RetireParts = { Seg, Slider, Projection };
})();
