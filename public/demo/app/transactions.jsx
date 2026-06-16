/* $ALL — editable transactions ledger (used on History screen) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Bolt, Clock, Search, Plus, Check, Chevron, Back } = U;
  const e = React.createElement;

  const TYPE_OPTS = Object.keys(A.TX_TYPES);
  const CLS_OPTS = Object.keys(A.CLASSES);
  const isTrade = (ty) => ty === 'buy' || ty === 'sell';

  function TypeBadge({ type }) {
    const t = A.TX_TYPES[type];
    return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: t.color, background: 'var(--bg-sunk)', padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' } },
      e('span', { style: { width: 6, height: 6, borderRadius: 99, background: t.color } }), t.label);
  }

  function Swatch({ cls, ticker, name }) {
    return e(U.AssetIcon, { cls, ticker, name, size: 32, radius: 8 });
  }

  // ---- edit drawer ----
  function Field({ label, children }) {
    return e('label', { style: { display: 'block', marginBottom: 14 } },
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 6 } }, label),
      children);
  }
  const inputStyle = { width: '100%', padding: '9px 11px', border: 'var(--hair) solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', boxSizing: 'border-box' };

  function Drawer({ draft, setDraft, onSave, onCancel, onDelete, isNew }) {
    const d = draft;
    const set = (k, v) => setDraft(s => ({ ...s, [k]: v }));
    const amount = A.txAmount(d);
    return e('div', { style: { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' } },
      e('div', { onClick: onCancel, style: { position: 'absolute', inset: 0, background: 'rgba(10,12,14,.4)' } }),
      e('div', { style: { position: 'relative', width: 400, maxWidth: '92vw', height: '100%', background: 'var(--surface)', borderLeft: 'var(--hair) solid var(--border)', boxShadow: '-8px 0 30px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column', overflow: 'auto' } },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: 'var(--hair) solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' } },
          e('span', { style: { fontSize: 15, fontWeight: 650 } }, isNew ? 'Add transaction' : 'Edit transaction'),
          e('button', { onClick: onCancel, style: { background: 'var(--bg-sunk)', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', fontSize: 17, lineHeight: 1, fontFamily: 'var(--font-sans)' } }, '✕')),
        e('div', { style: { padding: '18px 22px', flex: 1 } },
          // source note
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: d.source==='live'?'var(--pos)':'var(--ink-3)', background: 'var(--surface-2)', border: 'var(--hair) solid var(--border)', borderRadius: 8, padding: '9px 12px', marginBottom: 18 } },
            d.source==='live' ? e(Bolt, { size: 13 }) : e(Clock, { size: 13 }),
            d.source==='live' ? `Pulled from ${d.account}. Edits override the synced value.` : 'Manually entered — fully editable.'),
          e('div', { style: { display: 'flex', gap: 12 } },
            e('div', { style: { flex: 1 } }, e(Field, { label: 'Type' }, e('select', { value: d.type, onChange: ev => set('type', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } }, TYPE_OPTS.map(t => e('option', { key: t, value: t }, A.TX_TYPES[t].label))))),
            e('div', { style: { flex: 1 } }, e(Field, { label: 'Date' }, e('input', { type: 'date', value: d.date, onChange: ev => set('date', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } })))),
          e('div', { style: { display: 'flex', gap: 12 } },
            e('div', { style: { flex: 2 } }, e(Field, { label: 'Asset' }, e('input', { value: d.name, onChange: ev => set('name', ev.target.value), style: inputStyle }))),
            e('div', { style: { flex: 1 } }, e(Field, { label: 'Ticker' }, e('input', { value: d.ticker || '', onChange: ev => set('ticker', ev.target.value), style: inputStyle })))),
          e(Field, { label: 'Asset class' }, e('select', { value: d.cls, onChange: ev => set('cls', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } }, CLS_OPTS.map(c => e('option', { key: c, value: c }, A.CLASSES[c].label)))),
          isTrade(d.type)
            ? e('div', { style: { display: 'flex', gap: 12 } },
                e('div', { style: { flex: 1 } }, e(Field, { label: 'Quantity' }, e('input', { type: 'number', value: d.qty ?? '', onChange: ev => set('qty', ev.target.value===''?null:parseFloat(ev.target.value)), style: inputStyle }))),
                e('div', { style: { flex: 1 } }, e(Field, { label: 'Price' }, e('input', { type: 'number', value: d.price ?? '', onChange: ev => set('price', ev.target.value===''?null:parseFloat(ev.target.value)), style: inputStyle }))))
            : e(Field, { label: 'Amount' }, e('input', { type: 'number', value: d.amount ?? '', onChange: ev => set('amount', ev.target.value===''?null:parseFloat(ev.target.value)), style: inputStyle })),
          e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', background: 'var(--bg-sunk)', borderRadius: 8, marginBottom: 16 } },
            e('span', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 } }, 'Transaction amount'),
            e('span', { className: 'num', style: { fontSize: 16, fontWeight: 700, color: 'var(--ink)' } }, A.fmtUSD(amount, { full: true, cents: amount<10000 }))),
          e(Field, { label: 'Account / source' }, e('input', { value: d.account, onChange: ev => set('account', ev.target.value), style: inputStyle })),
          e(Field, { label: 'Note' }, e('input', { value: d.note || '', onChange: ev => set('note', ev.target.value), style: inputStyle })),
          e(Field, { label: 'Entry source' }, e('select', { value: d.source, onChange: ev => set('source', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } }, e('option', { value: 'manual' }, 'Manual entry'), e('option', { value: 'live' }, 'Synced (live)')))),
        e('div', { style: { display: 'flex', gap: 10, padding: '16px 22px', borderTop: 'var(--hair) solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--surface)' } },
          !isNew && e('button', { onClick: onDelete, style: { padding: '10px 14px', background: 'transparent', color: 'var(--neg)', border: 'var(--hair) solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Delete'),
          e('div', { style: { flex: 1 } }),
          e('button', { onClick: onCancel, style: { padding: '10px 16px', background: 'var(--bg-sunk)', color: 'var(--ink-2)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Cancel'),
          e('button', { onClick: onSave, style: { padding: '10px 18px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, isNew ? 'Add' : 'Save changes')))
    );
  }

  function TransactionsPanel() {
    const St = window.PortfolioStore;
    St.useStore();                         // re-render on any store change
    const list = St.transactions;
    const resetSample = () => St.reset();
    const [filter, setFilter] = React.useState('all');
    const [query, setQuery] = React.useState('');
    const [editId, setEditId] = React.useState(null);   // tx id, or 'new', or null
    const [draft, setDraft] = React.useState(null);

    const open = (t) => { setDraft({ ...t }); setEditId(t.id); };
    const openNew = () => { setDraft({ id: 'new', date: '2026-06-15', type: 'buy', cls: 'stocks', ticker: '', name: '', qty: null, price: null, amount: null, account: '', source: 'manual', note: '' }); setEditId('new'); };
    const close = () => { setEditId(null); setDraft(null); };
    const save = () => {
      if (editId === 'new') { St.addTransaction({ ...draft }); }
      else { St.updateTransaction(editId, { ...draft }); }
      close();
    };
    const del = () => { St.removeTransaction(editId); close(); };

    const filters = [['all','All'],['buy','Buys'],['sell','Sells'],['deposit','Cash'],['valuation','Valuations'],['loan_payment','Loans']];
    let rows = list.slice().sort((a,b)=> b.date.localeCompare(a.date));
    if (filter !== 'all') rows = rows.filter(t => filter==='deposit' ? (t.type==='deposit'||t.type==='withdrawal') : t.type===filter);
    if (query) rows = rows.filter(t => (t.name+' '+(t.ticker||'')+' '+(t.note||'')).toLowerCase().includes(query.toLowerCase()));

    return e('div', { style: { marginTop: 22 } },
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 } },
        e('div', null,
          e('div', { style: { fontSize: 16, fontWeight: 650, color: 'var(--ink)' } }, 'Transactions'),
          e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 } },
            `${list.length} entries · click any row to edit · saved locally`,
            e('button', { onClick: resetSample, style: { fontSize: 11.5, color: 'var(--ink-2)', background: 'none', border: 'none', borderBottom: 'var(--hair) solid var(--border-strong)', padding: '0 0 1px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Reset to sample'))),
        e('button', { onClick: openNew, style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, e(Plus, { size: 15 }), 'Add transaction')),
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 } },
        e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 9 } },
          filters.map(([k,l]) => e('button', { key: k, onClick: () => setFilter(k), style: { padding: '6px 13px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: filter===k?'var(--ink)':'var(--ink-3)', background: filter===k?'var(--surface)':'transparent', boxShadow: filter===k?'var(--shadow)':'none' } }, l))),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'var(--hair) solid var(--border)', borderRadius: 9, background: 'var(--surface)', minWidth: 200 } },
          e(Search, { size: 15, color: 'var(--ink-3)' }),
          e('input', { value: query, onChange: ev => setQuery(ev.target.value), placeholder: 'Search transactions…', style: { border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-sans)', width: '100%' } }))),
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
        e('div', { className: 'nw-tx', style: { display: 'grid', gridTemplateColumns: '94px 110px 1fr 150px 130px 96px 32px', gap: 12, padding: '11px 22px', borderBottom: 'var(--hair) solid var(--border)' } },
          ['Date','Type','Asset','Details','Amount','Source',''].map((h,i)=>e('span',{key:i,style:{fontSize:11,fontWeight:600,color:'var(--ink-3)',textAlign:i===4?'right':'left'}},h))),
        rows.length ? rows.map(t => e(Row, { key: t.id, t, onEdit: () => open(t) }))
          : e('div', { style: { padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 } }, 'No transactions match.')),
      editId && e(Drawer, { draft, setDraft, onSave: save, onCancel: close, onDelete: del, isNew: editId==='new' })
    );
  }

  function Row({ t, onEdit }) {
    const [hov, setHov] = React.useState(false);
    const amt = A.txAmount(t);
    const signed = t.type==='sell'||t.type==='withdrawal' ? -amt : (t.type==='buy'||t.type==='deposit' ? amt : amt);
    const isOut = t.type==='sell'||t.type==='withdrawal';
    return e('div', { className: 'nw-tx', onClick: onEdit, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
      style: { display: 'grid', gridTemplateColumns: '94px 110px 1fr 150px 130px 96px 32px', gap: 12, alignItems: 'center', padding: '12px 22px', borderTop: 'var(--hair) solid var(--border)', cursor: 'pointer', background: hov?'var(--surface-2)':'transparent' } },
      e('span', { className: 'num', style: { fontSize: 12.5, color: 'var(--ink-2)' } }, A.fmtDate(t.date).replace(/, 20/, " '").replace("'26","'26")),
      e('div', null, e(TypeBadge, { type: t.type })),
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 } },
        e(Swatch, { cls: t.cls, ticker: t.ticker, name: t.name }),
        e('div', { style: { minWidth: 0 } },
          e('div', { style: { fontSize: 13.5, fontWeight: 550, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.name),
          t.note && e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 } }, t.note))),
      e('div', { className: t.qty!=null?'num':'', style: { fontSize: 12.5, color: 'var(--ink-3)' } }, t.qty!=null ? `${A.fmtQty(t.qty)} @ ${A.fmtUSD(t.price,{full:true,cents:t.price<1000})}` : t.account),
      e('span', { className: 'num', style: { fontSize: 14, fontWeight: 600, textAlign: 'right', color: isOut?'var(--neg)':'var(--ink)' } }, (isOut?'−':'')+A.fmtUSD(amt)),
      e('span', { style: { fontSize: 11.5, fontWeight: 500, color: t.source==='live'?'var(--pos)':'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 5 } }, t.source==='live'?[e(U.Bolt,{key:'b',size:11}),'live']:[e(U.Clock,{key:'c',size:11}),'manual']),
      e('span', { style: { display: 'flex', justifyContent: 'flex-end', color: hov?'var(--ink-2)':'var(--ink-3)' } }, e(U.Chevron, { size: 15 })));
  }

  window.TransactionsPanel = TransactionsPanel;
})();
