/* $ALL — Trading Cards detail (collectibles-first)
   Summary band (collection value trend + stats + composition) over an itemised
   collection of cards & sealed product. Each line-item opens a drawer with a
   grade ladder (raw / PSA / BGS / CGC) and a Collectr-style recent-sales feed.
   Exports window.CardsKit (CardThumb, GradeLadder, helpers) for the catalog modal. */
(function () {
  const A = window.ALL, U = window.ALLUI, DB = window.CARDS_DB, S = window.PortfolioStore;
  const { Area, Back, ArrowUp, ArrowDown, Plus, Check } = U;
  const e = React.createElement;

  // ---------- seeded helpers ----------
  function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  function history(seed, end, n, vol) {
    const r = rng(seed); const out = []; let v = end * 0.72; vol = vol || 0.03;
    for (let i = 0; i < n; i++) { v = v + (end - v) * 0.05 + (r() - 0.46) * end * vol; out.push(Math.max(end * 0.25, v)); }
    out[n - 1] = end; return out;
  }

  // ---------- grade label / key ----------
  const GRADE_TIERS = [
    { key: 'raw',   label: 'Raw',     sub: 'ungraded' },
    { key: 'psa9',  label: 'PSA 9',   sub: 'PSA' },
    { key: 'bgs95', label: 'BGS 9.5', sub: 'Beckett' },
    { key: 'cgc10', label: 'CGC 10',  sub: 'CGC' },
    { key: 'psa10', label: 'PSA 10',  sub: 'PSA' },
  ];
  function ownedKey(it) {
    if (!it || it.type === 'sealed') return null;
    if (it.type === 'raw') return 'raw';
    return (it.grader === 'PSA' ? 'psa' : it.grader === 'BGS' ? 'bgs' : 'cgc') + String(it.grade).replace('.', '');
  }
  function gradeChipText(it) {
    if (it.type === 'sealed') return 'SEALED';
    if (it.type === 'raw') return 'RAW';
    return `${it.grader} ${it.grade}`;
  }

  // ---------- card thumbnail (real image with graceful slab fallback) ----------
  function CardThumb({ game, name, num, setCode, sealed, badge, w = 96, img }) {
    const g = (DB.GAMES[game]) || { color: '#8A9099', tint: '#ECEEEF', label: '' };
    const h = sealed ? Math.round(w * 1.18) : Math.round(w * 1.4);
    const initials = (name || '').split(/\s|—|·/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
    const [broken, setBroken] = React.useState(false);
    return e('div', { style: { position: 'relative', width: w, height: h, borderRadius: 9, overflow: 'hidden', flex: 'none', border: 'var(--hair) solid var(--border)', boxShadow: 'var(--shadow)', background: 'var(--bg-sunk)' } },
      // --- slab fallback (always rendered as the base layer) ---
      e('div', { style: { position: 'absolute', inset: 0, height: sealed ? '100%' : '66%', background: `linear-gradient(150deg, ${g.color} 0%, color-mix(in oklab, ${g.color} 62%, #000) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        e('span', { style: { fontSize: w * (sealed ? 0.32 : 0.4), fontWeight: 800, color: 'rgba(255,255,255,.92)', letterSpacing: '-.02em', fontFamily: 'var(--font-sans)' } }, initials),
        setCode && e('span', { style: { position: 'absolute', top: 6, left: 7, fontSize: Math.max(8, w * 0.085), fontWeight: 700, color: 'rgba(255,255,255,.92)', letterSpacing: '.04em', background: 'rgba(0,0,0,.22)', padding: '2px 6px', borderRadius: 5 } }, setCode)),
      !sealed && e('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', background: 'var(--surface)', padding: '5px 7px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
        e('div', { style: { fontSize: Math.max(8.5, w * 0.092), fontWeight: 650, color: 'var(--ink)', lineHeight: 1.12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } }, name),
        num && e('div', { className: 'num', style: { fontSize: Math.max(7.5, w * 0.08), color: 'var(--ink-3)', marginTop: 2, fontWeight: 600 } }, num)),
      sealed && e('div', { style: { position: 'absolute', left: 7, right: 7, bottom: 7 } },
        e('div', { style: { fontSize: Math.max(8.5, w * 0.092), fontWeight: 700, color: 'rgba(255,255,255,.96)', lineHeight: 1.12 } }, name)),
      // --- real card image overlay (paints over the slab once loaded; hides on error) ---
      img && !broken && e('img', { src: img, alt: name, onError: () => setBroken(true), style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'var(--bg-sunk)' } }),
      // --- grade badge (PSA-slab style corner) ---
      badge && e('div', { style: { position: 'absolute', top: 6, right: 6, background: 'var(--ink)', color: 'var(--surface)', fontSize: Math.max(8, w * 0.085), fontWeight: 700, padding: '2px 6px', borderRadius: 5, letterSpacing: '.02em', zIndex: 2 } }, badge));
  }

  // ---------- grade ladder (raw vs PSA9 vs BGS9.5 vs CGC10 vs PSA10) ----------
  function GradeLadder({ prices, ownedKey: ok }) {
    if (!prices) return null;
    const max = Math.max(...GRADE_TIERS.map(t => prices[t.key] || 0)) || 1;
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
      GRADE_TIERS.map(t => {
        const v = prices[t.key] || 0, owned = t.key === ok;
        return e('div', { key: t.key, style: { display: 'grid', gridTemplateColumns: '74px 1fr 70px', alignItems: 'center', gap: 12 } },
          e('div', { style: { display: 'flex', flexDirection: 'column' } },
            e('span', { style: { fontSize: 12, fontWeight: owned ? 700 : 600, color: owned ? 'var(--ink)' : 'var(--ink-2)' } }, t.label),
            e('span', { style: { fontSize: 10, color: 'var(--ink-3)' } }, owned ? 'you own this' : t.sub)),
          e('div', { style: { height: 9, borderRadius: 99, background: 'var(--bg-sunk)', overflow: 'hidden' } },
            e('div', { style: { width: `${(v / max) * 100}%`, height: '100%', borderRadius: 99, background: owned ? 'var(--accent)' : 'color-mix(in oklab, var(--c-private) 55%, var(--bg-sunk))' } })),
          e('div', { className: 'num', style: { textAlign: 'right', fontSize: 12.5, fontWeight: owned ? 700 : 600, color: owned ? 'var(--ink)' : 'var(--ink-2)' } }, A.fmtUSD(v, { full: true })));
      }));
  }

  // ---------- recent-sales (comps) feed ----------
  const VENUES = ['eBay', 'TCGplayer', 'PWCC', 'Goldin', 'Heritage'];
  function recentSales(it, unit) {
    const meta = DB.itemMeta(it);
    const r = rng(seedOf(it.catId + (it.grade || 'raw')));
    const gradeTxt = it.type === 'sealed' ? 'Sealed' : it.type === 'raw' ? 'Raw' : `${it.grader} ${it.grade}`;
    const out = []; let d = new Date('2026-06-14');
    for (let i = 0; i < 6; i++) {
      const price = Math.round(unit * (0.9 + r() * 0.2));
      out.push({ date: new Date(d).toISOString().slice(0, 10), price, grade: gradeTxt, venue: VENUES[Math.floor(r() * VENUES.length)] });
      d.setDate(d.getDate() - Math.ceil(1 + r() * 6));
    }
    return out;
  }

  function card() { return { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }; }
  function cardHead(extra) { return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: 'var(--hair) solid var(--border)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', ...extra }; }

  // ---------- item drawer ----------
  function ItemDrawer({ positionId, item, onClose }) {
    if (!item) return null;
    const meta = DB.itemMeta(item);
    const unit = DB.itemUnitValue(item), val = DB.itemValue(item), basis = DB.itemBasis(item);
    const pl = val - basis, plPct = basis ? pl / basis * 100 : 0;
    const daily = DB.itemDaily(item);
    const hist = history(seedOf(item.catId + (item.grade || '')), unit, 60, item.type === 'sealed' ? 0.02 : 0.035);
    const sales = recentSales(item, unit);
    const ok = ownedKey(item);
    return e('div', { style: { position: 'fixed', inset: 0, zIndex: 80 } },
      e('div', { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(10,12,14,.45)' } }),
      e('div', { style: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '100%', background: 'var(--bg)', borderLeft: 'var(--hair) solid var(--border)', boxShadow: '-12px 0 40px rgba(0,0,0,.18)', overflowY: 'auto' } },
        // header
        e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 22px', borderBottom: 'var(--hair) solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 2 } },
          e(CardThumb, { game: meta.game, name: meta.name, num: meta.num, setCode: meta.set && meta.set.code, sealed: meta.sealed, badge: gradeChipText(item), img: meta.img, w: 92 }),
          e('div', { style: { flex: 1, minWidth: 0 } },
            e('div', { style: { fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.15 } }, meta.name),
            e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 } }, meta.set ? `${meta.set.code} · ${meta.set.name}` : '', meta.num ? ` · ${meta.num}` : ''),
            e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 12 } },
              e('span', { className: 'num', style: { fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' } }, A.fmtUSD(unit, { full: true })),
              e('span', { className: 'num', style: { fontSize: 13, fontWeight: 600, color: daily >= 0 ? 'var(--pos)' : 'var(--neg)', display: 'inline-flex', alignItems: 'center', gap: 2 } }, e(daily >= 0 ? ArrowUp : ArrowDown, { size: 12 }), A.fmtPct(Math.abs(daily), false), ' today')),
            item.qty > 1 && e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 } }, `${item.qty} copies · ${A.fmtUSD(val, { full: true })} total`)),
          e('button', { onClick: onClose, style: { background: 'var(--bg-sunk)', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', fontSize: 15, flex: 'none' } }, '✕')),
        e('div', { style: { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 } },
          // price trend
          e('div', null,
            e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 } }, meta.custom ? 'Tracked value' : '90-day price · Collectr index'),
            e(Area, { points: hist, width: 416, height: 92, color: pl >= 0 ? 'var(--pos)' : 'var(--neg)', strokeWidth: 2 })),
          // grade ladder (cards only, when catalog-priced)
          !meta.sealed && meta.prices && e('div', null,
            e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 } }, 'Value by grade'),
            e(GradeLadder, { prices: meta.prices, ownedKey: ok })),
          // position facts
          e('div', { style: { ...card() } },
            e('div', { style: { padding: '4px 0' } }, [
              ['Your basis', A.fmtUSD(basis, { full: true })],
              ['Market value', A.fmtUSD(val, { full: true })],
              ['Unrealized P/L', (pl >= 0 ? '+' : '−') + A.fmtUSD(Math.abs(pl), { full: true }) + ` · ${A.fmtPct(plPct, true)}`, pl >= 0 ? 'var(--pos)' : 'var(--neg)'],
              ['Acquired', A.fmtDate(item.acquired)],
              ['Condition', item.type === 'sealed' ? meta.rarity : item.type === 'raw' ? 'Raw / ungraded' : `${item.grader} ${item.grade}`],
            ].map(([k, v, c], i) => e('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderTop: i ? 'var(--hair) solid var(--border)' : 'none' } },
              e('span', { style: { fontSize: 12.5, color: 'var(--ink-3)' } }, k), e('span', { className: 'num', style: { fontSize: 12.5, fontWeight: 600, color: c || 'var(--ink)' } }, v)))) ),
          // recent sales / comps (catalog items only)
          !meta.custom && e('div', { style: { ...card() } },
            e('div', { style: cardHead() }, 'Recent sales', e('span', { style: { fontSize: 11, color: 'var(--ink-3)', fontWeight: 450 } }, 'live comps')),
            e('div', null, sales.map((s, i) => e('div', { key: i, style: { display: 'grid', gridTemplateColumns: '72px 1fr auto', alignItems: 'center', gap: 10, padding: '9px 18px', borderTop: i ? 'var(--hair) solid var(--border)' : 'none' } },
              e('span', { className: 'num', style: { fontSize: 12, color: 'var(--ink-3)' } }, A.fmtDate(s.date).replace(', 2026', '')),
              e('span', { style: { fontSize: 12, color: 'var(--ink-2)' } }, s.venue, e('span', { style: { color: 'var(--ink-3)', marginLeft: 7 } }, s.grade)),
              e('span', { className: 'num', style: { fontSize: 12.5, fontWeight: 650, textAlign: 'right' } }, A.fmtUSD(s.price, { full: true })))))),
          // remove
          e('button', { onClick: () => { S.removeCardItem(positionId, item.id); onClose(); }, style: { padding: '10px', background: 'var(--bg-sunk)', color: 'var(--neg)', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Remove from collection'))));
  }

  // ---------- collection item (gallery cell) ----------
  function GalleryCell({ positionId, item, onOpen }) {
    const meta = DB.itemMeta(item);
    const unit = DB.itemUnitValue(item), val = DB.itemValue(item), basis = DB.itemBasis(item);
    const pl = val - basis, daily = DB.itemDaily(item);
    const [hov, setHov] = React.useState(false);
    return e('div', { onClick: () => onOpen(item), onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
      style: { cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9, padding: 12, borderRadius: 12, border: 'var(--hair) solid var(--border)', background: hov ? 'var(--surface-2)' : 'var(--surface)', transition: 'background .15s, transform .15s', transform: hov ? 'translateY(-2px)' : 'none', boxShadow: 'var(--shadow)' } },
      e('div', { style: { display: 'flex', justifyContent: 'center', paddingTop: 2 } },
        e(CardThumb, { game: meta.game, name: meta.name, num: meta.num, setCode: meta.set && meta.set.code, sealed: meta.sealed, badge: gradeChipText(item), img: meta.img, w: 104 })),
      e('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 } },
        e('span', { className: 'num', style: { fontSize: 14, fontWeight: 700 } }, A.fmtUSD(unit, { full: true })),
        e('span', { className: 'num', style: { fontSize: 11.5, fontWeight: 600, color: daily >= 0 ? 'var(--pos)' : 'var(--neg)' } }, (daily >= 0 ? '+' : '−') + Math.abs(daily).toFixed(1) + '%')),
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
        e('span', { style: { fontSize: 10.5, fontWeight: 600, color: 'var(--c-private)', background: 'var(--t-private)', padding: '2px 7px', borderRadius: 99 } }, gradeChipText(item)),
        item.qty > 1 && e('span', { className: 'num', style: { fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 } }, '×' + item.qty),
        e('span', { className: 'num', style: { fontSize: 11, fontWeight: 600, color: pl >= 0 ? 'var(--pos)' : 'var(--neg)', marginLeft: 'auto' } }, (pl >= 0 ? '+' : '−') + A.fmtUSD(Math.abs(pl)))));
  }

  // ---------- list row ----------
  function ListRow({ item, onOpen, i }) {
    const meta = DB.itemMeta(item);
    const unit = DB.itemUnitValue(item), val = DB.itemValue(item), basis = DB.itemBasis(item);
    const pl = val - basis, plPct = basis ? pl / basis * 100 : 0, daily = DB.itemDaily(item);
    const [hov, setHov] = React.useState(false);
    return e('div', { onClick: () => onOpen(item), onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
      style: { display: 'grid', gridTemplateColumns: '1.8fr 90px 80px 90px 110px', alignItems: 'center', gap: 12, padding: '11px 20px', borderTop: i ? 'var(--hair) solid var(--border)' : 'none', cursor: 'pointer', background: hov ? 'var(--surface-2)' : 'transparent' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 } },
        e(CardThumb, { game: meta.game, name: meta.name, num: meta.num, setCode: meta.set && meta.set.code, sealed: meta.sealed, badge: gradeChipText(item), img: meta.img, w: 40 }),
        e('div', { style: { minWidth: 0 } },
          e('div', { style: { fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, meta.name, item.qty > 1 && e('span', { className: 'num', style: { color: 'var(--ink-3)', fontWeight: 600, marginLeft: 6 } }, '×' + item.qty)),
          e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 } }, (meta.set ? meta.set.code : ''), meta.num ? ` · ${meta.num}` : '', ' · ', e('span', { style: { color: 'var(--c-private)', fontWeight: 600 } }, gradeChipText(item))))),
      e('span', { className: 'num', style: { textAlign: 'right', fontSize: 13, fontWeight: 650 } }, A.fmtUSD(unit, { full: true })),
      e('span', { className: 'num', style: { textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: daily >= 0 ? 'var(--pos)' : 'var(--neg)' } }, (daily >= 0 ? '+' : '−') + Math.abs(daily).toFixed(1) + '%'),
      e('span', { className: 'num', style: { textAlign: 'right', fontSize: 13, fontWeight: 600 } }, A.fmtUSD(val)),
      e('span', { className: 'num', style: { textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: pl >= 0 ? 'var(--pos)' : 'var(--neg)' } }, (pl >= 0 ? '+' : '−') + A.fmtUSD(Math.abs(pl)) + ' · ' + A.fmtPct(plPct, true)));
  }

  // ---------- composition bar ----------
  function CompBar({ rows }) {
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    return e('div', null,
      e('div', { style: { display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: 'var(--bg-sunk)' } },
        rows.map((r, i) => e('div', { key: i, style: { width: `${r.value / total * 100}%`, background: r.color } }))),
      e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '7px 16px', marginTop: 12 } },
        rows.map((r, i) => e('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 7 } },
          e('span', { style: { width: 8, height: 8, borderRadius: 99, background: r.color } }),
          e('span', { style: { fontSize: 12, color: 'var(--ink-2)' } }, r.label),
          e('span', { className: 'num', style: { fontSize: 12, fontWeight: 650, color: 'var(--ink)' } }, A.fmtUSD(r.value)))) ));
  }

  // ---------- the page ----------
  function CardsDetail({ p, navigate }) {
    const [drawer, setDrawer] = React.useState(null);
    const [view, setView] = React.useState('gallery');
    const [range, setRange] = React.useState('1Y');
    const items = p.items || [];
    const value = items.reduce((s, it) => s + DB.itemValue(it), 0);
    const basis = items.reduce((s, it) => s + DB.itemBasis(it), 0);
    const pl = value - basis, plPct = basis ? pl / basis * 100 : 0;
    const nCards = items.filter(i => i.type !== 'sealed').reduce((s, i) => s + (i.qty || 1), 0);
    const nSealed = items.filter(i => i.type === 'sealed').reduce((s, i) => s + (i.qty || 1), 0);
    // weighted daily move
    const daily = value ? items.reduce((s, it) => s + DB.itemDaily(it) * DB.itemValue(it), 0) / value : 0;
    const N = { '1W': 8, '1M': 22, '1Y': 60, 'ALL': 90 }[range] || 60;
    const hist = history(seedOf('collection' + items.length), value, N, 0.022);

    // composition by type + by game
    const byType = [
      { label: 'Graded', color: 'var(--c-private)', value: items.filter(i => i.type === 'graded').reduce((s, i) => s + DB.itemValue(i), 0) },
      { label: 'Raw', color: 'var(--c-crypto)', value: items.filter(i => i.type === 'raw').reduce((s, i) => s + DB.itemValue(i), 0) },
      { label: 'Sealed', color: 'var(--c-stocks)', value: items.filter(i => i.type === 'sealed').reduce((s, i) => s + DB.itemValue(i), 0) },
    ].filter(r => r.value > 0);

    const openAdd = () => { if (window.__openCardCatalog) window.__openCardCatalog(p.id); };

    return e('div', null,
      // ===== summary band =====
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' } },
        // value trend
        e('div', { style: card() },
          e('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px 4px' } },
            e('div', null,
              e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 } }, 'Collection value'),
              e('div', { className: 'num', style: { fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', marginTop: 3 } }, A.fmtUSD(value, { full: true })),
              e('div', { className: 'num', style: { fontSize: 13, fontWeight: 600, color: daily >= 0 ? 'var(--pos)' : 'var(--neg)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 } }, e(daily >= 0 ? ArrowUp : ArrowDown, { size: 13 }), A.fmtPct(Math.abs(daily), false), ' today')),
            e('div', { style: { display: 'inline-flex', gap: 4, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } },
              ['1W', '1M', '1Y', 'ALL'].map(r => e('button', { key: r, onClick: () => setRange(r), style: { padding: '4px 11px', fontSize: 12, fontWeight: 550, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: range === r ? 'var(--ink)' : 'var(--ink-3)', background: range === r ? 'var(--surface)' : 'transparent', boxShadow: range === r ? 'var(--shadow)' : 'none' } }, r)))),
          e('div', { style: { padding: '8px 14px 16px' } }, e(Area, { points: hist, width: 640, height: 150, color: pl >= 0 ? 'var(--pos)' : 'var(--neg)', strokeWidth: 2 })),
          e('div', { style: { display: 'flex', gap: 18, padding: '0 22px 16px', flexWrap: 'wrap' } },
            e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 5 } }, e('span', { style: { width: 6, height: 6, borderRadius: 99, background: 'var(--pos)' } }), 'Priced daily · Collectr index'),
            e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)' } }, `${nCards} cards · ${nSealed} sealed`))),
        // stats + composition
        e('div', { style: { ...card(), padding: '4px 0' } },
          [
            ['Market value', A.fmtUSD(value, { full: true }), null],
            ['Cost basis', A.fmtUSD(basis, { full: true }), null],
            ['Unrealized P/L', (pl >= 0 ? '+' : '−') + A.fmtUSD(Math.abs(pl), { full: true }), pl >= 0 ? 'var(--pos)' : 'var(--neg)', A.fmtPct(plPct, true)],
          ].map(([k, v, c, sub], i) => e('div', { key: i, style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '13px 22px', borderTop: i ? 'var(--hair) solid var(--border)' : 'none' } },
            e('span', { style: { fontSize: 12.5, color: 'var(--ink-3)' } }, k),
            e('span', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
              e('span', { className: 'num', style: { fontSize: 18, fontWeight: 700, color: c || 'var(--ink)' } }, v),
              sub && e('span', { className: 'num', style: { fontSize: 12.5, fontWeight: 600, color: c } }, sub)))),
          e('div', { style: { padding: '16px 22px 18px', borderTop: 'var(--hair) solid var(--border)' } },
            e('div', { style: { fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 } }, 'Composition'),
            e(CompBar, { rows: byType })))),

      // ===== your collection =====
      e('div', { style: { ...card(), marginTop: 16 } },
        e('div', { style: cardHead({ padding: '14px 20px' }) },
          e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10 } }, 'Your collection', e('span', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 450 } }, `${items.length} line items`)),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } },
              ['gallery', 'list'].map(v => e('button', { key: v, onClick: () => setView(v), style: { padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize', color: view === v ? 'var(--ink)' : 'var(--ink-3)', background: view === v ? 'var(--surface)' : 'transparent', boxShadow: view === v ? 'var(--shadow)' : 'none' } }, v))),
            e('button', { onClick: openAdd, style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, e(Plus, { size: 14 }), 'Add card or sealed'))),
        view === 'gallery'
          ? e('div', { className: 'nw-card-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, padding: 18 } },
              items.map(it => e(GalleryCell, { key: it.id, positionId: p.id, item: it, onOpen: setDrawer })))
          : e('div', null,
              e('div', { style: { display: 'grid', gridTemplateColumns: '1.8fr 90px 80px 90px 110px', gap: 12, padding: '9px 20px', borderBottom: 'var(--hair) solid var(--border)', background: 'var(--surface-2)' } },
                ['Item', 'Unit', '24h', 'Value', 'Total return'].map((h, i) => e('span', { key: i, style: { fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: i ? 'right' : 'left' } }, h))),
              items.map((it, i) => e(ListRow, { key: it.id, item: it, onOpen: setDrawer, i })))),

      drawer && e(ItemDrawer, { positionId: p.id, item: items.find(x => x.id === drawer.id) || drawer, onClose: () => setDrawer(null) }));
  }

  window.CardsKit = { CardThumb, GradeLadder, ownedKey, gradeChipText, history, seedOf, GRADE_TIERS };
  window.CardsDetail = CardsDetail;
})();
