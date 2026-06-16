/* $ALL — reactive portfolio store (the single source of truth)
   Owns: positions (with buy-lots), the transaction ledger, and realized sales.
   Screens read window.ALL.POSITIONS / store.transactions / store.realized and
   re-render via useStore(). Portfolio actions write ledger entries; sells record a
   realized-gain event (with a lot snapshot) that the Tax center matches per method. */
(function () {
  const A = window.ALL;
  // global responsive hook — re-renders subscriber on breakpoint cross
  window.useMobile = function (bp) {
    bp = bp || 760;
    const [m, setM] = React.useState(typeof window !== 'undefined' && window.innerWidth < bp);
    React.useEffect(() => {
      const h = () => setM(window.innerWidth < bp);
      window.addEventListener('resize', h); h();
      return () => window.removeEventListener('resize', h);
    }, [bp]);
    return m;
  };
  const K_POS = 'all_positions_v3', K_TX = 'all_tx_v3', K_REAL = 'all_realized_v3';
  let subs = [];
  let version = 0;
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = (p) => (p || 'x') + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);

  // ledger + realized live on the store object
  let transactions = A.TRANSACTIONS.map(t => ({ ...t }));
  let realized = [];

  function persist() {
    try {
      localStorage.setItem(K_POS, JSON.stringify(A.POSITIONS));
      localStorage.setItem(K_TX, JSON.stringify(transactions));
      localStorage.setItem(K_REAL, JSON.stringify(realized));
    } catch (e) {}
  }
  function notify() { version++; subs.forEach(f => { try { f(version); } catch (e) {} }); persist(); }

  (function hydrate() {
    try {
      const sp = localStorage.getItem(K_POS); if (sp) { const a = JSON.parse(sp); if (Array.isArray(a) && a.length) { A.POSITIONS.length = 0; a.forEach(p => A.POSITIONS.push(p)); } }
      const st = localStorage.getItem(K_TX); if (st) { const a = JSON.parse(st); if (Array.isArray(a)) transactions = a; }
      const sr = localStorage.getItem(K_REAL); if (sr) { const a = JSON.parse(sr); if (Array.isArray(a)) realized = a; }
    } catch (e) {}
  })();

  // ---- ledger ----
  function addTransaction(t) { transactions = [{ ...t, id: t.id || uid('tx') }, ...transactions]; notify(); }
  function updateTransaction(id, patch) { transactions = transactions.map(t => t.id === id ? { ...t, ...patch } : t); notify(); }
  function removeTransaction(id) { transactions = transactions.filter(t => t.id !== id); notify(); }

  function txFromPosition(pos) {
    const base = { id: uid('tx'), date: (pos.lots && pos.lots[0] && pos.lots[0].date) || today(), cls: pos.cls, ticker: pos.ticker, name: pos.name, account: pos.account, source: pos.live ? 'live' : 'manual', note: 'Added position' };
    if (A.unitPriced(pos)) return { ...base, type: 'buy', qty: pos.qty, price: pos.lots ? pos.lots[0].price : pos.price };
    if (pos.cls === 'cash') return { ...base, type: 'deposit', qty: null, price: null, amount: pos.value };
    if (pos.cls === 'loans') return { ...base, type: 'buy', qty: null, price: null, amount: pos.value, note: 'Loan originated' };
    return { ...base, type: 'valuation', qty: null, price: null, amount: pos.value };
  }

  // ---- positions ----
  function addPosition(p) {
    const pos = Object.assign({ id: uid(p.cls || 'pos') }, p);
    A.POSITIONS.push(pos);
    transactions = [txFromPosition(pos), ...transactions];
    notify();
    return pos;
  }

  function reduceLotsFIFO(p, qty) {
    if (!p.lots) return;
    let rem = qty;
    const sorted = p.lots.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const out = [];
    for (const l of sorted) {
      if (rem <= 0) { out.push(l); continue; }
      if (l.qty <= rem) { rem -= l.qty; }
      else { out.push({ ...l, qty: l.qty - rem, basis: (l.qty - rem) * l.price }); rem = 0; }
    }
    p.lots = out;
  }

  function logTrade({ positionId, side, qty, price, date, account }) {
    const p = A.POSITIONS.find(x => x.id === positionId);
    if (!p) return null;
    qty = Math.abs(parseFloat(qty) || 0);
    price = parseFloat(price) || 0;
    date = date || today();
    if (side === 'buy') {
      p.lots = p.lots || [];
      p.lots.push({ qty, price, date, account: account || p.account, basis: qty * price });
      p.qty = (p.qty || 0) + qty;
      if (A.unitPriced(p)) p.price = price;
    } else {
      // snapshot lots BEFORE reducing so the tax engine can match per any method
      const snapshot = (p.lots || []).map(l => ({ ...l }));
      realized = [{ id: uid('rl'), ticker: p.ticker, cls: p.cls, qty, proceeds: qty * price, date, lotsSnapshot: snapshot }, ...realized];
      p.qty = Math.max(0, (p.qty || 0) - qty);
      reduceLotsFIFO(p, qty);
      if (A.unitPriced(p)) p.price = price;
    }
    transactions = [{ id: uid('tx'), date, type: side, cls: p.cls, ticker: p.ticker, name: p.name, qty, price, account: account || p.account, source: 'manual', note: side === 'sell' ? 'Sold' : 'Bought' }, ...transactions];
    notify();
    return p;
  }

  // ---- trading-card line-items ----
  function recomputeCards(p) { if (window.CARDS_DB) window.CARDS_DB.recompute(p); }
  function addCardItem(positionId, item) {
    const p = A.POSITIONS.find(x => x.id === positionId); if (!p) return null;
    p.items = p.items || [];
    const it = Object.assign({ id: uid('ci') }, item);
    p.items.push(it);
    recomputeCards(p);
    const meta = window.CARDS_DB ? window.CARDS_DB.itemMeta(it) : { name: 'Card' };
    transactions = [{ id: uid('tx'), date: it.acquired || today(), type: 'buy', cls: 'private', ticker: '—',
      name: meta.name + (it.type === 'graded' ? ` · ${it.grader} ${it.grade}` : it.type === 'raw' ? ' · Raw' : ''),
      qty: it.qty || 1, price: it.basis || 0, account: p.account, source: 'manual', note: 'Added to collection' }, ...transactions];
    notify();
    return it;
  }
  function removeCardItem(positionId, itemId) {
    const p = A.POSITIONS.find(x => x.id === positionId); if (!p || !p.items) return;
    p.items = p.items.filter(i => i.id !== itemId);
    recomputeCards(p);
    notify();
  }
  function updateCardItem(positionId, itemId, patch) {
    const p = A.POSITIONS.find(x => x.id === positionId); if (!p || !p.items) return;
    p.items = p.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
    recomputeCards(p);
    notify();
  }

  function updatePosition(id, patch) { const p = A.POSITIONS.find(x => x.id === id); if (p) { Object.assign(p, patch); notify(); } }
  function removePosition(id) { const i = A.POSITIONS.findIndex(x => x.id === id); if (i >= 0) { A.POSITIONS.splice(i, 1); notify(); } }

  function reset() {
    try { localStorage.removeItem(K_POS); localStorage.removeItem(K_TX); localStorage.removeItem(K_REAL); } catch (e) {}
    if (typeof location !== 'undefined') location.reload();
  }

  function useStore() {
    const [, set] = React.useState(0);
    React.useEffect(() => {
      const f = (v) => set(v);
      subs.push(f);
      return () => { subs = subs.filter(x => x !== f); };
    }, []);
    return version;
  }

  window.PortfolioStore = {
    addPosition, logTrade, updatePosition, removePosition,
    addCardItem, removeCardItem, updateCardItem,
    addTransaction, updateTransaction, removeTransaction,
    reset, useStore,
    get transactions() { return transactions; },
    get realized() { return realized; },
    get version() { return version; },
  };
})();
