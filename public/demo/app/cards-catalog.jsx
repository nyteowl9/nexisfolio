/* $ALL — Collectr-style catalog browser
   Browse every card & sealed product across sets, search/filter, pick one, then
   configure condition (raw / graded → grader + grade) and add it to the
   collection. Mounted once by the shell; opened via window.__openCardCatalog(posId). */
(function () {
  const A = window.ALL, U = window.ALLUI, DB = window.CARDS_DB, S = window.PortfolioStore;
  const { Search, Plus, Check } = U;
  const e = React.createElement;

  const inputStyle = { width: '100%', padding: '9px 11px', border: 'var(--hair) solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', boxSizing: 'border-box' };

  function Seg({ value, options, onChange, cap }) {
    return e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8, flexWrap: 'wrap' } },
      options.map(o => {
        const val = typeof o === 'string' ? o : o.value, label = typeof o === 'string' ? o : o.label;
        return e('button', { key: val, onClick: () => onChange(val), style: { padding: '6px 13px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: cap ? 'capitalize' : 'none', color: value === val ? 'var(--ink)' : 'var(--ink-3)', background: value === val ? 'var(--surface)' : 'transparent', boxShadow: value === val ? 'var(--shadow)' : 'none' } }, label);
      }));
  }

  function Field({ label, children }) {
    return e('label', { style: { display: 'block' } },
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 6 } }, label), children);
  }

  // ---------- result cell ----------
  function ResultCell({ entry, selected, onPick }) {
    const Thumb = window.CardsKit.CardThumb;
    const isCard = entry.kind === 'card';
    const set = DB.SETS[entry.set];
    const ref = isCard ? entry.prices.raw : entry.price;
    const [hov, setHov] = React.useState(false);
    return e('div', { onClick: () => onPick(entry), onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
      style: { cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 10, borderRadius: 11, border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: hov || selected ? 'var(--surface-2)' : 'var(--surface)', transition: 'background .12s' } },
      e(Thumb, { game: entry.game, name: entry.name, num: isCard ? entry.num : '', setCode: set && set.code, sealed: !isCard, img: entry.img, w: 78 }),
      e('div', { style: { textAlign: 'center', minWidth: 0, width: '100%' } },
        e('div', { style: { fontSize: 11.5, fontWeight: 650, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } }, entry.name),
        e('div', { className: 'num', style: { fontSize: 11, color: 'var(--ink-3)', marginTop: 3, fontWeight: 600 } }, isCard ? `from ${A.fmtUSD(ref, { full: true })}` : A.fmtUSD(ref, { full: true }))));
  }

  // ---------- config panel ----------
  function ConfigPanel({ entry, onAdd }) {
    const isCard = entry && entry.kind === 'card';
    const [type, setType] = React.useState('graded');
    const [grader, setGrader] = React.useState('PSA');
    const [grade, setGrade] = React.useState('10');
    const [qty, setQty] = React.useState('1');
    const [basis, setBasis] = React.useState('');
    const [date, setDate] = React.useState('2026-06-15');

    React.useEffect(() => {
      if (!entry) return;
      if (entry.kind === 'sealed') { setType('sealed'); }
      else { setType('graded'); setGrader('PSA'); setGrade('10'); }
      setQty('1'); setBasis('');
    }, [entry && (entry.id)]);

    if (!entry) return e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 30, textAlign: 'center', color: 'var(--ink-3)', gap: 12 } },
      e('div', { style: { width: 56, height: 78, borderRadius: 9, border: '2px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--ink-3)' } }, '＋'),
      e('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' } }, 'Pick a card or box'),
      e('div', { style: { fontSize: 12, lineHeight: 1.5 } }, 'Search the catalog on the left, then set its condition and grade here.'));

    const set = DB.SETS[entry.set];
    const Thumb = window.CardsKit.CardThumb;
    const Ladder = window.CardsKit.GradeLadder;
    const unit = isCard ? (type === 'raw' ? entry.prices.raw : DB.priceForGrade(entry.prices, grader, grade)) : entry.price;
    const q = Math.max(1, parseInt(qty) || 1);
    const ok = isCard ? (type === 'raw' ? 'raw' : (grader === 'PSA' ? 'psa' : grader === 'BGS' ? 'bgs' : 'cgc') + String(grade).replace('.', '')) : null;
    const badge = !isCard ? 'SEALED' : type === 'raw' ? 'RAW' : `${grader} ${grade}`;

    const submit = () => onAdd({
      catId: entry.id, type: isCard ? type : 'sealed',
      grader: isCard && type === 'graded' ? grader : null,
      grade: isCard && type === 'graded' ? grade : null,
      qty: q, basis: parseFloat(basis) || unit, acquired: date,
    });

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      e('div', { style: { display: 'flex', gap: 14 } },
        e(Thumb, { game: entry.game, name: entry.name, num: isCard ? entry.num : '', setCode: set && set.code, sealed: !isCard, badge, img: entry.img, w: 84 }),
        e('div', { style: { flex: 1, minWidth: 0 } },
          e('div', { style: { fontSize: 15, fontWeight: 700, lineHeight: 1.2 } }, entry.name),
          e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 3 } }, set ? `${set.code} · ${set.name}` : '', isCard ? ` · ${entry.num}` : ''),
          e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 } }, DB.GAMES[entry.game] && DB.GAMES[entry.game].label, ' · ', entry.rarity || entry.kind),
          e('div', { style: { marginTop: 10 } },
            e('div', { style: { fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Market value'),
            e('div', { className: 'num', style: { fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', marginTop: 2 } }, A.fmtUSD(unit, { full: true }))))),
      // condition controls (cards only)
      isCard && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e(Field, { label: 'Condition' }, e(Seg, { value: type, options: [{ value: 'graded', label: 'Graded' }, { value: 'raw', label: 'Raw / ungraded' }], onChange: setType })),
        type === 'graded' && e(Field, { label: 'Grader' }, e(Seg, { value: grader, options: ['PSA', 'BGS', 'CGC'], onChange: g => { setGrader(g); setGrade(DB.GRADES[g][0]); } })),
        type === 'graded' && e(Field, { label: 'Grade' }, e(Seg, { value: grade, options: DB.GRADES[grader], onChange: setGrade }))),
      // grade ladder reference
      isCard && e('div', { style: { background: 'var(--surface-2)', border: 'var(--hair) solid var(--border)', borderRadius: 10, padding: '14px 16px' } },
        e('div', { style: { fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 } }, 'Value by grade'),
        e(Ladder, { prices: entry.prices, ownedKey: type === 'raw' ? 'raw' : ok })),
      // acquisition
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        e(Field, { label: 'Quantity' }, e('input', { type: 'number', min: 1, value: qty, onChange: ev => setQty(ev.target.value), style: inputStyle })),
        e(Field, { label: 'Cost basis (each)' }, e('input', { type: 'number', value: basis, onChange: ev => setBasis(ev.target.value), placeholder: String(unit), style: inputStyle }))),
      e(Field, { label: 'Acquired' }, e('input', { type: 'date', value: date, onChange: ev => setDate(ev.target.value), style: inputStyle })),
      e('button', { onClick: submit, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: 'pointer', fontFamily: 'var(--font-sans)' } },
        e(Plus, { size: 15 }), `Add ${q > 1 ? q + ' × ' : ''}to collection · ${A.fmtUSD(unit * q, { full: true })}`));
  }

  // ---------- manual entry (for items not in the catalog) ----------
  function ManualForm({ onAdd, onCancel }) {
    const Thumb = window.CardsKit.CardThumb;
    const [f, setF] = React.useState({ type: 'graded', grader: 'PSA', grade: '10', qty: '1', acquired: '2026-06-15', game: '' });
    const set = (k, v) => setF(s => ({ ...s, [k]: v }));
    const val = parseFloat(f.value) || 0;
    const q = Math.max(1, parseInt(f.qty) || 1);
    const ready = (f.name || '').trim() && val > 0;
    const badge = f.type === 'sealed' ? 'SEALED' : f.type === 'raw' ? 'RAW' : `${f.grader} ${f.grade}`;
    const submit = () => {
      if (!ready) return;
      onAdd({ manual: true, type: f.type, name: f.name.trim(), game: f.game || null, setCode: f.setCode || '', setName: f.setName || '', num: f.num || '', kind: f.type === 'sealed' ? 'Sealed product' : '', grader: f.type === 'graded' ? f.grader : null, grade: f.type === 'graded' ? f.grade : null, value: val, basis: parseFloat(f.basis) || val, qty: q, acquired: f.acquired, img: (f.img || '').trim() || null });
      setF({ type: 'graded', grader: 'PSA', grade: '10', qty: '1', acquired: '2026-06-15', game: '' });
    };
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e('div', { style: { fontSize: 14, fontWeight: 700 } }, 'Add manually'),
        e('button', { onClick: onCancel, style: { fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, '← Back to catalog')),
      e('div', { style: { fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: -4 } }, 'Not in the catalog yet? Enter it by hand. You can paste an image URL to show the card.'),
      e('div', { style: { display: 'flex', gap: 14 } },
        e(Thumb, { game: f.game || null, name: f.name || 'New item', num: f.num, setCode: f.setCode, sealed: f.type === 'sealed', badge, img: (f.img || '').trim() || null, w: 78 }),
        e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 10 } },
          e(Field, { label: 'Name' }, e('input', { value: f.name || '', onChange: ev => set('name', ev.target.value), placeholder: 'e.g. OP13-119 Luffy (Manga)', style: inputStyle })),
          e(Field, { label: 'Game' }, e('select', { value: f.game || '', onChange: ev => set('game', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } },
            e('option', { value: '' }, '— Other / unlisted —'),
            Object.values(DB.GAMES).map(g => e('option', { key: g.key, value: g.key }, g.label)))))),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        e(Field, { label: 'Set / code' }, e('input', { value: f.setCode || '', onChange: ev => set('setCode', ev.target.value), placeholder: 'OP-13', style: inputStyle })),
        e(Field, { label: 'Card # (optional)' }, e('input', { value: f.num || '', onChange: ev => set('num', ev.target.value), placeholder: 'OP13-119', style: inputStyle }))),
      e(Field, { label: 'Condition' }, e(Seg, { value: f.type, options: [{ value: 'graded', label: 'Graded' }, { value: 'raw', label: 'Raw' }, { value: 'sealed', label: 'Sealed' }], onChange: v => set('type', v) })),
      f.type === 'graded' && e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        e(Field, { label: 'Grader' }, e(Seg, { value: f.grader, options: ['PSA', 'BGS', 'CGC'], onChange: g => { set('grader', g); set('grade', DB.GRADES[g][0]); } })),
        e(Field, { label: 'Grade' }, e(Seg, { value: f.grade, options: DB.GRADES[f.grader], onChange: v => set('grade', v) }))),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        e(Field, { label: 'Current value (each)' }, e('input', { type: 'number', value: f.value || '', onChange: ev => set('value', ev.target.value), placeholder: '0', style: inputStyle })),
        e(Field, { label: 'Cost basis (each)' }, e('input', { type: 'number', value: f.basis || '', onChange: ev => set('basis', ev.target.value), placeholder: 'optional', style: inputStyle }))),
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        e(Field, { label: 'Quantity' }, e('input', { type: 'number', min: 1, value: f.qty, onChange: ev => set('qty', ev.target.value), style: inputStyle })),
        e(Field, { label: 'Acquired' }, e('input', { type: 'date', value: f.acquired, onChange: ev => set('acquired', ev.target.value), style: inputStyle }))),
      e(Field, { label: 'Image URL (optional)' }, e('input', { value: f.img || '', onChange: ev => set('img', ev.target.value), placeholder: 'https://…  — shows the actual card', style: inputStyle })),
      e('button', { onClick: submit, disabled: !ready, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: ready ? 'var(--accent)' : 'var(--bg-sunk)', color: ready ? 'var(--accent-ink)' : 'var(--ink-3)', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: ready ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)' } },
        e(Plus, { size: 15 }), ready ? `Add to collection · ${A.fmtUSD(val * q, { full: true })}` : 'Enter a name & value'));
  }

  // ---------- modal ----------
  function CardCatalogModal({ open, positionId, onClose }) {
    const [q, setQ] = React.useState('');
    const [game, setGame] = React.useState('all');
    const [type, setType] = React.useState('all');
    const [sel, setSel] = React.useState(null);
    const [manual, setManual] = React.useState(false);
    const [added, setAdded] = React.useState([]);
    const [flash, setFlash] = React.useState(false);

    React.useEffect(() => { if (open) { setQ(''); setGame('all'); setType('all'); setSel(null); setManual(false); setAdded([]); } }, [open]);
    if (!open) return null;

    const entries = [];
    if (type !== 'sealed') DB.CARDS.forEach(c => entries.push({ ...c, kind: 'card' }));
    if (type !== 'cards') DB.SEALED.forEach(s => entries.push({ ...s, kind: 'sealed' }));
    const query = q.trim().toLowerCase();
    const results = entries.filter(en => {
      if (game !== 'all' && en.game !== game) return false;
      if (!query) return true;
      const set = DB.SETS[en.set];
      const hay = `${en.name} ${en.num || ''} ${set ? set.code + ' ' + set.name : ''} ${en.rarity || ''} ${en.kind}`.toLowerCase();
      return query.split(/\s+/).every(w => hay.includes(w));
    });

    const onAdd = (item) => {
      S.addCardItem(positionId, item);
      const meta = DB.itemMeta(item);
      setAdded(a => [meta.name + (item.type === 'graded' ? ` ${item.grader} ${item.grade}` : ''), ...a].slice(0, 6));
      setFlash(true); setTimeout(() => setFlash(false), 1200);
      setSel(null);
    };

    const gameChips = [{ value: 'all', label: 'All games' }].concat(Object.values(DB.GAMES).map(g => ({ value: g.key, label: g.label })));

    return e('div', { style: { position: 'fixed', inset: 0, zIndex: 75, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      e('div', { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(10,12,14,.5)' } }),
      e('div', { style: { position: 'relative', width: 980, maxWidth: '100%', height: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,.34)', overflow: 'hidden' } },
        // header
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: 'var(--hair) solid var(--border)' } },
          e('div', null,
            e('div', { style: { fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' } }, 'Add to collection'),
            e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 } }, 'Browse every card & sealed product, then set its condition')),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            flash && e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--pos)', fontWeight: 600 } }, e(Check, { size: 14 }), 'Added'),
            added.length > 0 && e('button', { onClick: onClose, style: { padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, `Done · ${added.length} added`),
            e('button', { onClick: onClose, style: { background: 'var(--bg-sunk)', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', fontSize: 16 } }, '✕'))),
        // toolbar
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: 'var(--hair) solid var(--border)', flexWrap: 'wrap' } },
          e('div', { style: { position: 'relative', flex: '1 1 240px', minWidth: 200 } },
            e('input', { value: q, onChange: ev => setQ(ev.target.value), autoFocus: true, placeholder: 'Search e.g. "Luffy OP-13", "Charizard", "booster box"…', style: { ...inputStyle, paddingLeft: 34 } }),
            e('span', { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', display: 'flex' } }, e(Search, { size: 15 }))),
          e(Seg, { value: type, options: [{ value: 'all', label: 'All' }, { value: 'cards', label: 'Cards' }, { value: 'sealed', label: 'Sealed' }], onChange: setType })),
        // game chips
        e('div', { style: { display: 'flex', gap: 8, padding: '0 24px 14px', flexWrap: 'wrap', borderBottom: 'var(--hair) solid var(--border)' } },
          gameChips.map(g => e('button', { key: g.value, onClick: () => setGame(g.value), style: { padding: '6px 13px', fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-sans)', border: `1px solid ${game === g.value ? 'var(--ink)' : 'var(--border)'}`, background: game === g.value ? 'var(--ink)' : 'var(--surface)', color: game === g.value ? 'var(--surface)' : 'var(--ink-2)' } }, g.label))),
        // body: results | config
        e('div', { className: 'nw-cat-body', style: { display: 'grid', gridTemplateColumns: '1.55fr 1fr', flex: 1, minHeight: 0 } },
          e('div', { style: { overflowY: 'auto', padding: 18, borderRight: 'var(--hair) solid var(--border)' } },
            e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
              e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 } }, `${results.length} result${results.length === 1 ? '' : 's'}`),
              e('button', { onClick: () => { setManual(true); setSel(null); }, style: { fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-sunk)', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, "Can't find it? Add manually")),
            results.length === 0
              ? e('div', { style: { padding: '36px 12px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 } },
                  e('div', null, 'No matches for that search.'),
                  e('button', { onClick: () => { setManual(true); setSel(null); }, style: { marginTop: 14, fontSize: 12.5, fontWeight: 650, color: 'var(--accent-ink)', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, '+ Add it manually'))
              : e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 12 } },
                  results.map(en => e(ResultCell, { key: en.kind + en.id, entry: en, selected: sel && sel.id === en.id, onPick: en2 => { setSel(en2); setManual(false); } })))),
          e('div', { style: { overflowY: 'auto', padding: 22, background: 'var(--surface)' } },
            manual ? e(ManualForm, { onAdd, onCancel: () => setManual(false) }) : e(ConfigPanel, { entry: sel, onAdd })))));
  }

  window.CardCatalogModal = CardCatalogModal;
})();
