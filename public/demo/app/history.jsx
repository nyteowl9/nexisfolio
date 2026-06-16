/* $ALL — Net-worth history screen */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { ArrowUp, ArrowDown } = U;
  const e = React.createElement;

  function BigChart({ points, markers, color, range }) {
    const W = 1100, H = 360, padL = 8, padB = 28;
    const [hover, setHover] = React.useState(null);
    const min = Math.min(...points), max = Math.max(...points);
    const pad = (max - min) * 0.15 || 1;
    const lo = min - pad, hi = max + pad;
    const x = (i) => padL + (i / (points.length - 1)) * (W - padL * 2);
    const y = (v) => (H - padB) - ((v - lo) / (hi - lo)) * (H - padB - 12);
    const line = points.map((v, i) => `${i===0?'M':'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(points.length-1)} ${H-padB} L${padL} ${H-padB} Z`;
    const gid = 'bigfill';
    // y gridlines
    const ticks = 4;
    const gl = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * (i / ticks));
    // x labels
    const xlabels = {
      '1D': ['9:30','11','1','3','4:00'], '1W': ['Mon','Tue','Wed','Thu','Fri'],
      '1M': ['Wk 1','Wk 2','Wk 3','Wk 4'], '1Y': ['Jul','Sep','Nov','Jan','Mar','May'],
      'ALL': ['2017','2019','2021','2023','2025','Now'],
    }[range] || [];

    return e('div', { style: { position: 'relative' } },
      e('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' },
        onMouseMove: (ev) => {
          const r = ev.currentTarget.getBoundingClientRect();
          const px = (ev.clientX - r.left) / r.width * W;
          const i = Math.round((px - padL) / (W - padL*2) * (points.length - 1));
          if (i >= 0 && i < points.length) setHover(i);
        }, onMouseLeave: () => setHover(null) },
        e('defs', null, e('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          e('stop', { offset: '0%', stopColor: color, stopOpacity: 0.18 }), e('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }))),
        gl.map((v, i) => e('g', { key: i },
          e('line', { x1: padL, x2: W-padL, y1: y(v), y2: y(v), stroke: 'var(--border)', strokeWidth: 0.5, strokeDasharray: i===0?'none':'3 4' }),
          e('text', { x: W-padL, y: y(v)-5, textAnchor: 'end', fontSize: 11, fill: 'var(--ink-3)', className: 'num' }, A.fmtUSD(v)))),
        xlabels.map((lab, i) => e('text', { key: i, x: padL + (i/(xlabels.length-1))*(W-padL*2), y: H-8, textAnchor: i===0?'start':i===xlabels.length-1?'end':'middle', fontSize: 11, fill: 'var(--ink-3)' }, lab)),
        e('path', { d: area, fill: `url(#${gid})` }),
        e('path', { d: line, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round' }),
        // flow markers
        (markers||[]).map((m, i) => {
          const idx = Math.round(m.t * (points.length - 1));
          return e('g', { key: i },
            e('line', { x1: x(idx), x2: x(idx), y1: y(points[idx]), y2: 20, stroke: m.type==='in'?'var(--pos)':'var(--neg)', strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.5 }),
            e('circle', { cx: x(idx), cy: y(points[idx]), r: 4, fill: m.type==='in'?'var(--pos)':'var(--neg)', stroke: 'var(--surface)', strokeWidth: 2 }),
            e('g', { transform: `translate(${Math.min(Math.max(x(idx),60),W-60)}, 14)` },
              e('rect', { x: -52, y: -11, width: 104, height: 22, rx: 6, fill: 'var(--surface)', stroke: 'var(--border)', strokeWidth: 0.5 }),
              e('text', { x: 0, y: 4, textAnchor: 'middle', fontSize: 10.5, fill: m.type==='in'?'var(--pos)':'var(--neg)', fontWeight: 600, className: 'num' }, `${m.type==='in'?'+':'−'}${A.fmtUSD(Math.abs(m.amt))} ${m.label}`)));
        }),
        hover != null && e('g', null,
          e('line', { x1: x(hover), x2: x(hover), y1: 12, y2: H-padB, stroke: 'var(--ink-3)', strokeWidth: 0.5 }),
          e('circle', { cx: x(hover), cy: y(points[hover]), r: 4.5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }))
      ),
      hover != null && e('div', { style: { position: 'absolute', left: `${x(hover)/W*100}%`, top: -8, transform: 'translate(-50%,-100%)', background: 'var(--ink)', color: 'var(--accent-ink)', padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none' } },
        e('span', { className: 'num' }, A.fmtUSD(points[hover], { full: true })))
    );
  }

  function History({ tweaks }) {
    const [range, setRange] = React.useState('1Y');
    const points = A.history(range);
    const markers = A.FLOW_MARKERS[range] || [];
    const first = points[0], last = points[points.length-1];
    const chg = last - first, chgPct = chg/first*100;
    const ranges = ['1D','1W','1M','1Y','ALL'];

    return e('div', { className: 'nw-page', style: { maxWidth: 1240, margin: '0 auto', padding: '32px 36px 64px' } },
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 } },
        e('div', null,
          e('div', { style: { fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 6 } }, `Net worth · ${({'1D':'today','1W':'past week','1M':'past month','1Y':'past year','ALL':'all time'})[range]}`),
          e('div', { className: 'num', style: { fontSize: 40, fontWeight: 650, letterSpacing: '-.03em', lineHeight: 1 } }, A.fmtUSD(last, { full: true })),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 } },
            e('span', { className: 'num', style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14.5, fontWeight: 600, color: chg>=0?'var(--pos)':'var(--neg)' } }, e(chg>=0?ArrowUp:ArrowDown,{size:14}), A.fmtUSD(Math.abs(chg),{full:true}), ` (${A.fmtPct(chgPct,true)})`),
            e('span', { style: { fontSize: 13, color: 'var(--ink-3)' } }, `over ${({'1D':'1 day','1W':'1 week','1M':'1 month','1Y':'1 year','ALL':'9 years'})[range]}`))
        ),
        e('div', { style: { display: 'inline-flex', gap: 4, background: 'var(--bg-sunk)', padding: 4, borderRadius: 9 } },
          ranges.map(r => e('button', { key: r, onClick: () => setRange(r), style: { padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: range===r?'var(--ink)':'var(--ink-3)', background: range===r?'var(--surface)':'transparent', boxShadow: range===r?'var(--shadow)':'none' } }, r)))
      ),
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '28px 28px 18px' } },
        e(BigChart, { points, markers, color: chg>=0?'var(--pos)':'var(--neg)', range }),
        markers.length > 0 && e('div', { style: { display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: 'var(--hair) solid var(--border)', flexWrap: 'wrap' } },
          e('span', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 } }, 'Flows:'),
          markers.map((m,i) => e('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 } },
            e('span', { style: { width: 7, height: 7, borderRadius: 99, background: m.type==='in'?'var(--pos)':'var(--neg)' } }),
            e('span', { style: { color: 'var(--ink-2)' } }, m.label),
            e('span', { className: 'num', style: { color: m.type==='in'?'var(--pos)':'var(--neg)', fontWeight: 600 } }, `${m.type==='in'?'+':'−'}${A.fmtUSD(Math.abs(m.amt))}`))))
      ),
      // stat strip
      e('div', { style: { display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' } },
        [['Period high', A.fmtUSD(Math.max(...points), {full:true})], ['Period low', A.fmtUSD(Math.min(...points), {full:true})], ['Net change', (chg>=0?'+':'−')+A.fmtUSD(Math.abs(chg),{full:true})], ['Avg daily', A.fmtUSD(chg/points.length, {full:true})]].map(([l,v],i) =>
          e('div', { key: i, style: { flex: 1, background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', padding: '15px 18px', boxShadow: 'var(--shadow)' } },
            e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 7 } }, l),
            e('div', { className: 'num', style: { fontSize: 18, fontWeight: 600, color: i===2?(chg>=0?'var(--pos)':'var(--neg)'):'var(--ink)' } }, v)))),
      // editable transactions ledger
      window.TransactionsPanel ? e(window.TransactionsPanel, null) : null
    );
  }

  window.History = History;
})();
