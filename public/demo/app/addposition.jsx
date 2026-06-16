/* $ALL — Add position / Log trade modal */
(function () {
  const A = window.ALL, U = window.ALLUI, S = window.PortfolioStore;
  const { Plus, Bolt, Clock, Check } = U;
  const e = React.createElement;
  const TODAY = '2026-06-15';
  const UNIT = { crypto:1, stocks:1, metals:1 };
  const SUBCATS = ['Art','Watches','Trading Cards','Jewelry','Other'];

  const inputStyle = { width: '100%', padding: '9px 11px', border: 'var(--hair) solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', boxSizing: 'border-box' };
  function Field({ label, children, hint }) {
    return e('label', { style: { display: 'block' } },
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 6 } }, label),
      children,
      hint && e('div', { style: { fontSize: 11, color: 'var(--ink-3)', marginTop: 5 } }, hint));
  }
  const Inp = (props) => e('input', Object.assign({ style: inputStyle }, props));
  const Row2 = (a, b) => e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } }, a, b);

  function marketPrice(ticker) {
    if (!ticker) return null;
    const held = A.POSITIONS.find(p => p.ticker === ticker && p.price); if (held) return held.price;
    const w = (A.WATCHLIST || []).find(x => x.sym === ticker); if (w) return w.price;
    return null;
  }
  function amortPayment(principal, ratePct, months) {
    const r = ratePct / 100 / 12; if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  // ---- symbol directory + fuzzy lookup (so "bitcoinnns" still finds BTC) ----
  function buildDirectory() {
    const seen = {}, out = [];
    const add = (cls, ticker, name, price) => { if (!ticker || ticker === '—') return; const k = cls + ticker; if (seen[k]) return; seen[k] = 1; out.push({ cls, ticker, name, price }); };
    (A.WATCHLIST || []).forEach(w => add(w.cls, w.sym, w.name, w.price));
    A.POSITIONS.forEach(p => { if (A.unitPriced(p)) add(p.cls, p.ticker, p.name, p.price); });
    return out;
  }
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function searchSymbols(q, dir) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    const scored = dir.map(d => {
      const t = d.ticker.toLowerCase(), n = d.name.toLowerCase();
      let s = 99;
      if (t === q || n === q) s = 0;
      else if (t.startsWith(q) || n.startsWith(q)) s = 1;
      else if (t.includes(q) || n.includes(q)) s = 2;
      else s = 3 + Math.min(lev(q, t), lev(q, n)) * 0.5;   // typo tolerance
      return { d, s };
    }).filter(x => x.s < 7).sort((a, b) => a.s - b.s);
    return scored.slice(0, 6).map(x => x.d);
  }

  function SearchAsset({ onPick }) {
    const dir = React.useMemo(buildDirectory, []);
    const [q, setQ] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const results = searchSymbols(q, dir);
    return e('div', { style: { position: 'relative' } },
      e(Field, { label: 'Find asset', hint: 'Search by ticker or name — typos are OK.' },
        e('div', { style: { position: 'relative' } },
          e('input', { value: q, onChange: ev => { setQ(ev.target.value); setOpen(true); }, onFocus: () => setOpen(true), onBlur: () => setTimeout(() => setOpen(false), 150), placeholder: 'e.g. bitcoin, NVDA, gold…', style: { ...inputStyle, paddingLeft: 32 } }),
          e('span', { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', display: 'flex' } }, e(U.Search, { size: 15 })))),
      open && results.length > 0 && e('div', { style: { position: 'absolute', top: 64, left: 0, right: 0, zIndex: 5, background: 'var(--surface)', border: 'var(--hair) solid var(--border-strong)', borderRadius: 10, boxShadow: 'var(--shadow)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto' } },
        results.map(r => {
          const c = A.CLASSES[r.cls];
          return e('button', { key: r.cls + r.ticker, onMouseDown: () => { onPick(r); setQ(''); setOpen(false); },
            style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' },
            onMouseEnter: ev => ev.currentTarget.style.background = 'var(--surface-2)', onMouseLeave: ev => ev.currentTarget.style.background = 'transparent' },
            e('span', { style: { width: 30, height: 30, borderRadius: 7, background: `var(--${c.tint})`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, flex: 'none' } }, r.ticker.slice(0, 4)),
            e('div', { style: { flex: 1, minWidth: 0 } },
              e('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--ink)' } }, r.ticker, e('span', { style: { color: 'var(--ink-3)', fontWeight: 500, marginLeft: 8 } }, r.name)),
              e('div', { style: { fontSize: 11, color: 'var(--ink-3)' } }, c.label)),
            e('span', { className: 'num', style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 } }, A.fmtUSD(r.price, { full: true, cents: r.price < 1000 })));
        })));
  }

  function ClassPicker({ value, onChange }) {
    return e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
      Object.values(A.CLASSES).map(c => e('button', { key: c.key, onClick: () => onChange(c.key),
        style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
          border: `1px solid ${value===c.key?c.color:'var(--border)'}`, background: value===c.key?`var(--${c.tint})`:'var(--surface)', color: value===c.key?c.color:'var(--ink-2)' } },
        e('span', { style: { width: 8, height: 8, borderRadius: 99, background: c.color } }), c.label)));
  }

  function PreviewCard({ rows, footLabel, footValue, footColor }) {
    return e('div', { style: { background: 'var(--surface-2)', border: 'var(--hair) solid var(--border)', borderRadius: 10, padding: '14px 16px' } },
      e('div', { style: { fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 11 } }, 'Live preview'),
      rows.map(([k, v, c], i) => e('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } },
        e('span', { style: { fontSize: 12.5, color: 'var(--ink-3)' } }, k),
        e('span', { className: 'num', style: { fontSize: 13.5, fontWeight: 600, color: c || 'var(--ink)' } }, v))),
      footLabel && e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, paddingTop: 11, borderTop: 'var(--hair) solid var(--border)' } },
        e('span', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 } }, footLabel),
        e('span', { className: 'num', style: { fontSize: 17, fontWeight: 700, color: footColor || 'var(--ink)' } }, footValue)));
  }

  // ---------- ADD form ----------
  function AddForm({ f, set }) {
    const cls = f.cls;
    const num = (v) => parseFloat(v) || 0;
    let fields, preview;
    if (UNIT[cls]) {
      const qty = num(f.qty), cost = num(f.cost), mkt = marketPrice(f.ticker) || cost;
      const basis = qty * cost, val = qty * mkt, pl = val - basis;
      fields = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        e(SearchAsset, { onPick: (r) => { set('cls', r.cls); set('ticker', r.ticker); set('name', r.name); set('cost', String(r.price)); } }),
        Row2(e(Field, { label: 'Ticker' }, e(Inp, { value: f.ticker||'', onChange: ev => set('ticker', ev.target.value.toUpperCase()), placeholder: 'BTC' })),
             e(Field, { label: 'Name' }, e(Inp, { value: f.name||'', onChange: ev => set('name', ev.target.value), placeholder: 'Bitcoin' }))),
        Row2(e(Field, { label: 'Quantity' }, e(Inp, { type: 'number', value: f.qty??'', onChange: ev => set('qty', ev.target.value) })),
             e(Field, { label: 'Cost per unit' }, e(Inp, { type: 'number', value: f.cost??'', onChange: ev => set('cost', ev.target.value) }))),
        Row2(e(Field, { label: 'Acquisition date' }, e(Inp, { type: 'date', value: f.date||TODAY, onChange: ev => set('date', ev.target.value) })),
             e(Field, { label: 'Account / wallet' }, e(Inp, { value: f.account||'', onChange: ev => set('account', ev.target.value), placeholder: 'Coinbase' }))));
      preview = e(PreviewCard, { rows: [['Cost basis', A.fmtUSD(basis, {full:true})], ['Market price', marketPrice(f.ticker)?A.fmtUSD(mkt,{full:true,cents:true}):'— (will sync)', 'var(--ink-3)'], ['Unrealized P/L', (pl>=0?'+':'−')+A.fmtUSD(Math.abs(pl),{full:true}), pl>=0?'var(--pos)':'var(--neg)']], footLabel: 'Current value', footValue: A.fmtUSD(val, {full:true}), footColor: 'var(--ink)' });
    } else if (cls === 'cash') {
      const bal = num(f.value);
      fields = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        e(Field, { label: 'Account name' }, e(Inp, { value: f.name||'', onChange: ev => set('name', ev.target.value), placeholder: 'HYSA · Marcus / USDC · Aave' })),
        Row2(e(Field, { label: 'Balance' }, e(Inp, { type: 'number', value: f.value??'', onChange: ev => set('value', ev.target.value) })),
             e(Field, { label: 'Institution' }, e(Inp, { value: f.account||'', onChange: ev => set('account', ev.target.value), placeholder: 'Marcus / Aave' }))),
        e(Field, { label: 'Yield / APY (%)', hint: 'Interest rate you earn — HYSA, money market, or stablecoin lending.' }, e(Inp, { type: 'number', value: f.apy??'', onChange: ev => set('apy', ev.target.value), placeholder: '5.40' })));
      preview = e(PreviewCard, { rows: [['Type', num(f.apy)>0?'Cash · yield-bearing':'Cash · live', 'var(--pos)'], num(f.apy)>0?['Est. annual yield', A.fmtUSD(bal*num(f.apy)/100, {full:true}), 'var(--pos)']:['Liquidity', 'Instant', 'var(--ink-3)']], footLabel: 'Balance', footValue: A.fmtUSD(bal, {full:true}) });
    } else if (cls === 'loans') {
      const principal = num(f.value), rate = num(f.rate), yrs = num(f.term)||1, pay = amortPayment(principal, rate, yrs*12);
      fields = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        e(Field, { label: 'Borrower / note' }, e(Inp, { value: f.name||'', onChange: ev => set('name', ev.target.value), placeholder: 'Loan · Friend' })),
        Row2(e(Field, { label: 'Principal' }, e(Inp, { type: 'number', value: f.value??'', onChange: ev => set('value', ev.target.value) })),
             e(Field, { label: 'Interest rate (APR %)' }, e(Inp, { type: 'number', value: f.rate??'', onChange: ev => set('rate', ev.target.value) }))),
        Row2(e(Field, { label: 'Term (years)' }, e(Inp, { type: 'number', value: f.term??'', onChange: ev => set('term', ev.target.value) })),
             e(Field, { label: 'Origination date' }, e(Inp, { type: 'date', value: f.date||TODAY, onChange: ev => set('date', ev.target.value) }))));
      preview = e(PreviewCard, { rows: [['Interest rate', rate?rate+'% APR':'—'], ['Term', yrs+' years'], ['Est. monthly payment', principal&&rate?A.fmtUSD(pay,{full:true,cents:true}):'—', 'var(--c-loans)']], footLabel: 'Outstanding', footValue: A.fmtUSD(principal, {full:true}) });
    } else { // realest / private (manual)
      const val = num(f.value), basis = num(f.basis), pl = val - basis;
      fields = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        e(Field, { label: 'Name' }, e(Inp, { value: f.name||'', onChange: ev => set('name', ev.target.value), placeholder: cls==='realest'?'Rental · Austin':'Watch · Patek' })),
        cls==='private' && e(Field, { label: 'Sub-category' }, e('select', { value: f.subcat||'Other', onChange: ev => set('subcat', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } }, SUBCATS.map(s => e('option', { key: s, value: s }, s)))),
        cls==='private' && f.subcat==='Trading Cards' && e(Field, { label: 'Grade / variant', hint: 'Priced daily by grade — PSA 10 ≠ PSA 9 ≠ raw.' }, e('select', { value: f.grade||'PSA 10', onChange: ev => set('grade', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } }, ['PSA 10','PSA 9','BGS 9.5','CGC 10','Raw / ungraded','Sealed'].map(s => e('option', { key: s, value: s }, s)))),
        Row2(e(Field, { label: 'Current value' }, e(Inp, { type: 'number', value: f.value??'', onChange: ev => set('value', ev.target.value) })),
             e(Field, { label: 'Cost basis' }, e(Inp, { type: 'number', value: f.basis??'', onChange: ev => set('basis', ev.target.value) }))),
        Row2(e(Field, { label: 'Acquired' }, e(Inp, { type: 'date', value: f.date||TODAY, onChange: ev => set('date', ev.target.value) })),
             e(Field, { label: 'Where held' }, e(Inp, { value: f.account||'', onChange: ev => set('account', ev.target.value), placeholder: 'Owned' }))));
      preview = e(PreviewCard, { rows: [['Cost basis', A.fmtUSD(basis, {full:true})], ['Pricing', 'Manual · valued today', 'var(--ink-3)'], ['Unrealized P/L', (pl>=0?'+':'−')+A.fmtUSD(Math.abs(pl),{full:true}), pl>=0?'var(--pos)':'var(--neg)']], footLabel: 'Current value', footValue: A.fmtUSD(val, {full:true}) });
    }
    return e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 230px', gap: 20, alignItems: 'start' } }, fields, preview);
  }

  function buildPosition(f) {
    const cls = f.cls, num = (v) => parseFloat(v) || 0;
    const date = f.date || TODAY, acct = f.account || (cls==='cash'?'Account':cls==='loans'?'Note':'Owned');
    if (UNIT[cls]) {
      const qty = num(f.qty), cost = num(f.cost), mkt = marketPrice(f.ticker) || cost;
      return { cls, ticker: (f.ticker||'—').toUpperCase(), name: f.name || f.ticker, live: true, qty, price: mkt, prev: mkt, account: acct, updated: 0,
        lots: [{ qty, price: cost, date, account: acct, basis: qty*cost }] };
    }
    if (cls === 'cash') return { cls, ticker: f.apy!=null&&String(f.apy).length?'USDC':'—', name: f.name || 'Cash', live: true, value: num(f.value), prevValue: num(f.value), account: acct, updated: 0, apy: num(f.apy)||0 };
    if (cls === 'loans') {
      const principal = num(f.value), rate = num(f.rate), months = (num(f.term)||1)*12;
      const due = new Date(date); due.setMonth(due.getMonth()+1);
      return { cls, ticker: '—', name: f.name || 'Loan', live: false, value: principal, basis: principal, valued: TODAY, account: 'Note',
        loan: { principal, balance: principal, rate, termMonths: months, originated: date, nextDue: due.toISOString().slice(0,10), nextAmt: amortPayment(principal, rate, months), paymentsMade: 0, interestYtd: 0 } };
    }
    // manual realest/private
    const val = num(f.value), basis = num(f.basis);
    const pos = { cls, ticker: '—', name: f.name || 'Asset', live: false, value: val, basis, valued: TODAY, qty: 1, account: acct, lots: [{ qty: 1, price: basis, date, account: acct, basis }] };
    if (cls === 'private') { pos.subcat = f.subcat || 'Other'; if (f.subcat === 'Trading Cards') { pos.grade = f.grade || 'PSA 10'; pos.priceSource = 'Collectr · daily'; } }
    return pos;
  }

  // ---------- TRADE form ----------
  function TradeForm({ f, set }) {
    const holdings = A.POSITIONS.filter(p => A.unitPriced(p));
    const p = holdings.find(h => h.id === f.positionId) || holdings[0];
    React.useEffect(() => { if (p && f.positionId !== p.id) set('positionId', p.id); }, []);
    const num = (v) => parseFloat(v) || 0;
    const qty = num(f.qty), price = num(f.price) || (p ? p.price : 0);
    const newQty = f.side === 'sell' ? Math.max(0, (p?p.qty:0) - qty) : (p?p.qty:0) + qty;
    const amount = qty * price;
    return e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 230px', gap: 20, alignItems: 'start' } },
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        e(Field, { label: 'Position' }, e('select', { value: f.positionId||(p?p.id:''), onChange: ev => set('positionId', ev.target.value), style: { ...inputStyle, cursor: 'pointer' } },
          holdings.map(h => e('option', { key: h.id, value: h.id }, `${h.ticker} · ${h.name} (${A.fmtQty(h.qty)})`)))),
        e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8, width: 'fit-content' } },
          ['buy','sell'].map(sd => e('button', { key: sd, onClick: () => set('side', sd), style: { padding: '7px 18px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize', color: f.side===sd?'var(--ink)':'var(--ink-3)', background: f.side===sd?'var(--surface)':'transparent', boxShadow: f.side===sd?'var(--shadow)':'none' } }, sd))),
        Row2(e(Field, { label: 'Quantity' }, e(Inp, { type: 'number', value: f.qty??'', onChange: ev => set('qty', ev.target.value) })),
             e(Field, { label: 'Price' }, e(Inp, { type: 'number', value: f.price??'', onChange: ev => set('price', ev.target.value), placeholder: p?String(p.price):'' }))),
        Row2(e(Field, { label: 'Date' }, e(Inp, { type: 'date', value: f.date||TODAY, onChange: ev => set('date', ev.target.value) })),
             e(Field, { label: 'Account' }, e(Inp, { value: f.account||(p?p.account:''), onChange: ev => set('account', ev.target.value) })))),
      e(PreviewCard, { rows: [['Position', p?`${p.ticker} · ${A.fmtQty(p.qty)}`:'—'], [f.side==='sell'?'Selling':'Buying', `${A.fmtQty(qty)} @ ${A.fmtUSD(price,{full:true,cents:price<1000})}`], ['New quantity', A.fmtQty(newQty), f.side==='sell'?'var(--neg)':'var(--pos)']],
        footLabel: f.side==='sell'?'Proceeds':'Cost', footValue: A.fmtUSD(amount, {full:true}), footColor: f.side==='sell'?'var(--neg)':'var(--ink)' }));
  }

  function AddPositionModal({ open, prefill, onClose }) {
    const [mode, setMode] = React.useState('add');
    const [f, setF] = React.useState({ cls: 'crypto', side: 'buy', date: TODAY });
    const set = (k, v) => setF(s => ({ ...s, [k]: v }));
    React.useEffect(() => {
      if (open) {
        if (prefill) { setMode('add'); setF({ cls: prefill.cls||'crypto', ticker: prefill.ticker||'', name: prefill.name||'', cost: prefill.price||'', date: TODAY, side: 'buy', account: '' }); }
        else { setF({ cls: 'crypto', side: 'buy', date: TODAY }); setMode('add'); }
      }
    }, [open, prefill]);
    if (!open) return null;

    const submit = () => {
      if (mode === 'add') { const pos = buildPosition(f); S.addPosition(pos); }
      else { S.logTrade({ positionId: f.positionId, side: f.side, qty: f.qty, price: f.price || (A.POSITIONS.find(p=>p.id===f.positionId)||{}).price, date: f.date, account: f.account }); }
      onClose && onClose();
    };
    const tabBtn = (m, label) => e('button', { onClick: () => setMode(m), style: { padding: '8px 4px', fontSize: 14, fontWeight: mode===m?700:500, color: mode===m?'var(--ink)':'var(--ink-3)', background: 'none', border: 'none', borderBottom: mode===m?'2px solid var(--ink)':'2px solid transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, label);

    return e('div', { style: { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      e('div', { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(10,12,14,.45)' } }),
      e('div', { style: { position: 'relative', width: 660, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.3)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 0' } },
          e('div', { style: { display: 'flex', gap: 22 } }, tabBtn('add', 'Add position'), tabBtn('trade', 'Log trade')),
          e('button', { onClick: onClose, style: { background: 'var(--bg-sunk)', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', fontSize: 17, fontFamily: 'var(--font-sans)' } }, '✕')),
        e('div', { style: { borderBottom: 'var(--hair) solid var(--border)', marginTop: 14 } }),
        e('div', { style: { padding: '22px 24px' } },
          mode === 'add' && e('div', { style: { marginBottom: 18 } }, e('div', { style: { fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 9 } }, 'Asset class'), e(ClassPicker, { value: f.cls, onChange: v => set('cls', v) })),
          mode === 'add' ? e(AddForm, { f, set }) : e(TradeForm, { f, set })),
        e('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: 'var(--hair) solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--surface)' } },
          e('button', { onClick: onClose, style: { padding: '10px 16px', background: 'var(--bg-sunk)', color: 'var(--ink-2)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Cancel'),
          e('button', { onClick: submit, style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, e(Plus, { size: 15 }), mode==='add'?'Add to portfolio':'Log trade')))
    );
  }

  window.AddPositionModal = AddPositionModal;
})();
