/* $ALL — Watchlist screen (top-20 crypto + Mag 7) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Area, Bolt, Plus, Search, Check, ArrowUp, ArrowDown } = U;
  const e = React.createElement;

  function Spark({ sym, price, up }) {
    return e(Area, { points: A.spark(sym, price), width: 96, height: 30, color: up ? 'var(--pos)' : 'var(--neg)', fill: false, strokeWidth: 1.4 });
  }

  function Swatch({ cls, sym }) {
    return e(U.AssetIcon, { cls, ticker: sym, name: sym, size: 34, radius: 8 });
  }

  function Row({ w, added, onAdd }) {
    const up = w.chg >= 0;
    const [hov, setHov] = React.useState(false);
    return e('div', { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
      style: { display: 'grid', gridTemplateColumns: '1fr 120px 130px 120px 132px', alignItems: 'center', gap: 14, padding: '13px 24px', borderTop: 'var(--hair) solid var(--border)', background: hov ? 'var(--surface-2)' : 'transparent' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 13 } },
        e(Swatch, { cls: w.cls, sym: w.sym }),
        e('div', null,
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            e('span', { style: { fontSize: 14, fontWeight: 600, color: 'var(--ink)' } }, w.sym),
            e('span', { style: { fontSize: 11.5, fontWeight: 500, color: A.CLASSES[w.cls].color, background: `var(--${A.CLASSES[w.cls].tint})`, padding: '1px 7px', borderRadius: 99 } }, A.CLASSES[w.cls].label.split(' ')[0])),
          e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 } }, w.name))),
      e('div', { style: { display: 'flex', justifyContent: 'center' } }, e(Spark, { sym: w.sym, price: w.price, up })),
      e('div', { className: 'num', style: { textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--ink)' } }, A.fmtUSD(w.price, { full: true, cents: w.price < 1000 })),
      e('div', { className: 'num', style: { textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: up ? 'var(--pos)' : 'var(--neg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 } }, e(up ? ArrowUp : ArrowDown, { size: 13 }), A.fmtPct(Math.abs(w.chg))),
      e('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
        w.held
          ? e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', padding: '6px 12px' } }, e(Check, { size: 13 }), 'In portfolio')
          : added
            ? e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--pos)', padding: '6px 12px' } }, e(Check, { size: 13 }), 'Added')
            : e('button', { onClick: onAdd, style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--bg-sunk)', border: 'var(--hair) solid var(--border)', borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, e(Plus, { size: 14 }), 'Add'))
    );
  }

  function Watchlist() {
    const [filter, setFilter] = React.useState('all');
    const [added, setAdded] = React.useState({});
    const [query, setQuery] = React.useState('');
    let list = A.WATCHLIST;
    if (filter !== 'all') list = list.filter(w => w.cls === filter);
    if (query) list = list.filter(w => (w.sym + ' ' + w.name).toLowerCase().includes(query.toLowerCase()));
    const tabs = [['all','All',A.WATCHLIST.length],['crypto','Crypto',A.WATCHLIST.filter(w=>w.cls==='crypto').length],['stocks','Stocks',A.WATCHLIST.filter(w=>w.cls==='stocks').length]];
    const gainers = A.WATCHLIST.filter(w=>w.chg>0).length;

    return e('div', { className: 'nw-page', style: { maxWidth: 1100, margin: '0 auto', padding: '32px 36px 64px' } },
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 } },
        e('div', null,
          e('h1', { style: { fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: '-.02em' } }, 'Watchlist'),
          e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 8 } }, e(Bolt, { size: 13, color: 'var(--pos)' }), `${A.WATCHLIST.length} tracked · ${gainers} up today · prices live`)),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'var(--hair) solid var(--border)', borderRadius: 9, background: 'var(--surface)', minWidth: 200 } },
          e(Search, { size: 15, color: 'var(--ink-3)' }),
          e('input', { value: query, onChange: ev => setQuery(ev.target.value), placeholder: 'Add or find a ticker…', style: { border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-sans)', width: '100%' } }))),
      e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 9, marginBottom: 16 } },
        tabs.map(([k,l,n]) => e('button', { key: k, onClick: () => setFilter(k), style: { padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: filter===k?'var(--ink)':'var(--ink-3)', background: filter===k?'var(--surface)':'transparent', boxShadow: filter===k?'var(--shadow)':'none' } }, `${l} `, e('span', { style: { color: 'var(--ink-3)', fontWeight: 500 } }, n)))),
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
        e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 120px 130px 120px 132px', gap: 14, padding: '11px 24px', borderBottom: 'var(--hair) solid var(--border)' } },
          ['Asset','7-day','Price','24h',''].map((h,i)=>e('span',{key:i,style:{fontSize:11,fontWeight:600,color:'var(--ink-3)',textAlign:i>0&&i<4?'right':i===1?'center':'left'}},h))),
        list.length ? list.map(w => e(Row, { key: w.sym, w, added: added[w.sym], onAdd: () => { setAdded(s => ({ ...s, [w.sym]: true })); if (window.__openAddPosition) window.__openAddPosition({ cls: w.cls, ticker: w.sym, name: w.name, price: w.price }); } }))
          : e('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 } }, 'No matches.'))
    );
  }

  window.Watchlist = Watchlist;
})();
