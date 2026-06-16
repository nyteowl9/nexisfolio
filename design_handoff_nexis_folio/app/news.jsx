/* $ALL — News feed screen (curated, tied to holdings + watchlist) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Bolt, ArrowUp, ArrowDown, Dot } = U;
  const e = React.createElement;

  const SENT = {
    pos: { color: 'var(--pos)', label: 'Bullish', icon: ArrowUp },
    neg: { color: 'var(--neg)', label: 'Bearish', icon: ArrowDown },
    neutral: { color: 'var(--ink-3)', label: 'Neutral', icon: Dot },
  };

  function Tickers({ cls, tickers }) {
    const c = A.CLASSES[cls];
    return e('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
      e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: c.color, background: `var(--${c.tint})`, padding: '2px 9px', borderRadius: 99 } },
        e('span', { style: { width: 6, height: 6, borderRadius: 99, background: c.color } }), c.label.split(' ')[0]),
      tickers.map(t => e('span', { key: t, className: 'num', style: { fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-sunk)', padding: '2px 8px', borderRadius: 99 } }, t)));
  }

  function TopCard({ n, rank }) {
    const s = SENT[n.sentiment];
    return e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: `2px solid ${A.CLASSES[n.cls].color}` } },
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e('span', { className: 'num', style: { fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' } }, `0${rank}`),
        e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: s.color } }, e(s.icon, { size: 12 }), s.label)),
      e('div', { style: { fontSize: 16.5, fontWeight: 600, lineHeight: 1.32, color: 'var(--ink)', letterSpacing: '-.01em' } }, n.title),
      e('div', { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, flex: 1 } }, n.summary),
      e(Tickers, { cls: n.cls, tickers: n.tickers }),
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-3)', paddingTop: 4, borderTop: 'var(--hair) solid var(--border)' } },
        e('span', { style: { fontWeight: 600, color: 'var(--ink-2)' } }, n.source), e('span', null, '·'), e('span', null, n.time)));
  }

  function ListItem({ n }) {
    const s = SENT[n.sentiment];
    const [hov, setHov] = React.useState(false);
    return e('div', { onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
      style: { display: 'flex', alignItems: 'flex-start', gap: 16, padding: '17px 24px', borderTop: 'var(--hair) solid var(--border)', cursor: 'pointer', background: hov?'var(--surface-2)':'transparent' } },
      e('div', { style: { width: 3, alignSelf: 'stretch', borderRadius: 99, background: A.CLASSES[n.cls].color, flex: 'none' } }),
      e('div', { style: { flex: 1 } },
        e('div', { style: { fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 5 } }, n.title),
        e('div', { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 9 } }, n.summary),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          e(Tickers, { cls: n.cls, tickers: n.tickers }),
          e('span', { style: { fontSize: 12, color: 'var(--ink-3)' } }, e('span', { style: { fontWeight: 600, color: 'var(--ink-2)' } }, n.source), ' · ', n.time))),
      e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: s.color, flex: 'none' } }, e(s.icon, { size: 12 }), s.label));
  }

  function News() {
    const [filter, setFilter] = React.useState('all');
    const top = A.NEWS.filter(n => n.top).slice(0, 3);
    let rest = A.NEWS.filter(n => !n.top);
    const classesIn = [...new Set(A.NEWS.map(n => n.cls))];
    if (filter !== 'all') rest = rest.filter(n => n.cls === filter);

    return e('div', { className: 'nw-page', style: { maxWidth: 1100, margin: '0 auto', padding: '32px 36px 64px' } },
      e('div', { style: { marginBottom: 22 } },
        e('h1', { style: { fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: '-.02em' } }, 'News'),
        e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 5 } }, 'Curated for your holdings & watchlist · ' + A.fmtDate('2026-06-15').replace(', 2026',''))),
      e('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 12 } }, "Today's top 3"),
      e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 } },
        top.map((n,i) => e(TopCard, { key: n.id, n, rank: i+1 }))),
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 } },
        e('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' } }, 'More from your portfolio'),
        e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } },
          [['all','All']].concat(classesIn.map(k=>[k, A.CLASSES[k].label.split(' ')[0]])).map(([k,l]) =>
            e('button', { key: k, onClick: () => setFilter(k), style: { padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: filter===k?'var(--ink)':'var(--ink-3)', background: filter===k?'var(--surface)':'transparent', boxShadow: filter===k?'var(--shadow)':'none' } }, l)))),
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
        rest.length ? rest.map(n => e(ListItem, { key: n.id, n })) : e('div', { style: { padding: '36px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 } }, 'No stories in this class today.'))
    );
  }

  window.News = News;
})();
