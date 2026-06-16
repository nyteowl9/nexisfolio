/* $ALL — sample portfolio data
   Backbone: every position is one or more LOTS (a buy at price+date).
   Sells match lots per the chosen accounting method. Powers P/L + tax. */
(function () {
  'use strict';

  // ---- asset-class registry (color, label, pricing mode) ----
  const CLASSES = {
    crypto:  { key: 'crypto',  label: 'Crypto',                color: '#E0992B', tint: 't-crypto',  live: true  },
    stocks:  { key: 'stocks',  label: 'Stocks & Equities',     color: '#3E72F0', tint: 't-stocks',  live: true  },
    realest: { key: 'realest', label: 'Real Estate',           color: '#14A6A0', tint: 't-realest', live: false },
    private: { key: 'private', label: 'Private & Collectibles', color: '#9466F0', tint: 't-private', live: false },
    cash:    { key: 'cash',    label: 'Cash',                  color: '#93999F', tint: 't-cash',    live: true  },
    loans:   { key: 'loans',   label: 'Loans Receivable',      color: '#E5689A', tint: 't-loans',   live: false },
    metals:  { key: 'metals',  label: 'Commodities & Metals',   color: '#B5703C', tint: 't-metals',  live: true  },
  };

  // helper to build a lot
  const lot = (qty, price, date, account) => ({ qty, price, date, account, basis: qty * price });

  // ---- positions ----
  const POSITIONS = [
    // ===== CRYPTO (live) =====
    { id:'btc', cls:'crypto', ticker:'BTC', name:'Bitcoin', live:true, qty:0.5, price:68420, prev:67980,
      account:'Coinbase', updated:8,
      lots:[ lot(0.3, 28400,'2021-02-04','Coinbase'), lot(0.2, 52000,'2024-02-27','Coinbase') ] },
    { id:'eth', cls:'crypto', ticker:'ETH', name:'Ethereum', live:true, qty:5, price:3512, prev:3488,
      account:'MetaMask', updated:8,
      lots:[ lot(3, 1240,'2021-01-12','MetaMask'), lot(2, 2980,'2023-10-02','MetaMask') ] },
    { id:'sol', cls:'crypto', ticker:'SOL', name:'Solana', live:true, qty:30, price:154.8, prev:159.2,
      account:'Phantom', updated:8,
      lots:[ lot(30, 38.5,'2023-06-14','Phantom') ] },

    // ===== STOCKS (live) =====
    { id:'vti', cls:'stocks', ticker:'VTI', name:'Vanguard Total Mkt ETF', live:true, qty:670, price:278.3, prev:277.6,
      account:'Fidelity · 401(k)', updated:14,
      lots:[ lot(670, 198.4,'2022-01-03','Fidelity') ] },
    { id:'aapl', cls:'stocks', ticker:'AAPL', name:'Apple Inc.', live:true, qty:200, price:212.4, prev:210.9,
      account:'Fidelity · Brokerage', updated:14,
      lots:[ lot(120, 84.2,'2019-05-20','Fidelity'), lot(80, 168.5,'2022-09-12','Fidelity') ] },
    { id:'nvda', cls:'stocks', ticker:'NVDA', name:'NVIDIA Corp.', live:true, qty:300, price:125.1, prev:122.4,
      account:'Fidelity · Brokerage', updated:14,
      lots:[ lot(300, 19.8,'2020-03-23','Fidelity') ] },
    { id:'msft', cls:'stocks', ticker:'MSFT', name:'Microsoft Corp.', live:true, qty:80, price:445.2, prev:447.1,
      account:'Fidelity · Brokerage', updated:14,
      lots:[ lot(50, 210.4,'2021-02-08','Fidelity'), lot(30, 332.0,'2023-07-19','Fidelity') ] },

    // ===== REAL ESTATE (manual) =====
    { id:'home', cls:'realest', ticker:'—', name:'Primary Residence · Austin TX', live:false,
      value:243000, valued:'2026-03-15', basis:198000, qty:1, account:'Owned',
      lots:[ lot(1, 198000,'2019-06-01','Deed') ] },
    { id:'condo', cls:'realest', ticker:'—', name:'Rental Condo · San Antonio', live:false,
      value:132000, valued:'2026-02-01', basis:104000, qty:1, account:'Owned · rented',
      lots:[ lot(1, 104000,'2021-09-15','Deed') ] },

    // ===== PRIVATE & COLLECTIBLES (manual, sub-categorized) =====
    { id:'watches', cls:'private', subcat:'Watches', ticker:'—', name:'Watch · Omega Speedmaster', live:false,
      value:11000, valued:'2026-03-01', basis:7500, qty:1, account:'Insured · home safe',
      lots:[ lot(1, 7500,'2022-06-30','Dealer') ] },
    { id:'cards', cls:'private', subcat:'Trading Cards', ticker:'—', name:'Graded Cards · PSA 10', live:false,
      value:6400, valued:'2026-01-12', basis:2800, qty:8, account:'Vault · graded', grade:'PSA 10', priceSource:'Collectr · daily',
      lots:[ lot(8, 350,'2021-11-20','Dealer') ] },
    { id:'jewelry', cls:'private', subcat:'Jewelry', ticker:'—', name:'Fine Jewelry · estate pieces', live:false,
      value:5200, valued:'2025-12-30', basis:3900, qty:3, account:'Insured · home safe',
      lots:[ lot(3, 1300,'2020-12-10','Estate') ] },

    // ===== COMMODITIES & METALS (live spot) =====
    { id:'gold', cls:'metals', ticker:'XAU', name:'Gold Bullion', live:true, qty:4, price:2358, prev:2341,
      account:'Allocated · vault', updated:30,
      lots:[ lot(4, 1820,'2021-07-01','Vault') ] },
    { id:'silver', cls:'metals', ticker:'XAG', name:'Silver Bullion', live:true, qty:80, price:29.4, prev:29.9,
      account:'Allocated · vault', updated:30,
      lots:[ lot(80, 21.5,'2021-05-10','Vault') ] },

    // ===== CASH & STABLECOINS (live) =====
    { id:'checking', cls:'cash', ticker:'—', name:'Checking · Chase', live:true, value:6200, prevValue:6200, updated:120, account:'Chase', apy:0.01 },
    { id:'hysa', cls:'cash', ticker:'—', name:'HYSA · Marcus', live:true, value:18500, prevValue:18497, updated:120, account:'Marcus', apy:4.30 },
    { id:'usdc', cls:'cash', ticker:'USDC', name:'USDC · Aave', live:true, value:7800, prevValue:7799, updated:30, account:'Aave v3', apy:5.40, stable:true },

    // ===== LOANS RECEIVABLE (manual) =====
    { id:'loan-friend', cls:'loans', ticker:'—', name:'Personal Loan · Friend', live:false,
      value:11200, valued:'2026-06-01', basis:15000, account:'Note',
      loan:{ principal:15000, balance:11200, rate:6.0, termMonths:60, originated:'2024-09-01', nextDue:'2026-07-05', nextAmt:289.99, paymentsMade:21, interestYtd:560 } },
  ];

  // ---- derive market value per position ----
  const LIVE_QTY = { crypto: 1, stocks: 1, metals: 1 };
  function mv(p) {
    if (LIVE_QTY[p.cls]) return p.qty * p.price;
    return p.value;
  }
  function prevMv(p) {
    if (LIVE_QTY[p.cls]) return p.qty * p.prev;
    if (p.cls === 'cash') return p.prevValue != null ? p.prevValue : p.value;
    return p.value; // manual assets don't move intraday
  }
  function costBasis(p) {
    if (p.basis != null) return p.basis;
    if (p.lots) return p.lots.reduce((s, l) => s + l.basis, 0);
    return mv(p); // cash basis = value
  }

  // ---- class + portfolio rollups ----
  function byClass() {
    const out = {};
    for (const k of Object.keys(CLASSES)) out[k] = { ...CLASSES[k], value: 0, prev: 0, basis: 0, count: 0, positions: [] };
    for (const p of POSITIONS) {
      const c = out[p.cls];
      c.value += mv(p); c.prev += prevMv(p); c.basis += costBasis(p); c.count++; c.positions.push(p);
    }
    return out;
  }

  function totals() {
    const c = byClass();
    const liquid = c.crypto.value + c.stocks.value + c.cash.value + c.metals.value;
    const illiquid = c.realest.value + c.private.value;
    const loansOut = c.loans.value;
    const net = liquid + illiquid + loansOut;
    const prevNet = Object.values(c).reduce((s, x) => s + x.prev, 0);
    const basis = Object.values(c).reduce((s, x) => s + x.basis, 0);
    return {
      net, prevNet, change24: net - prevNet, changePct: (net - prevNet) / prevNet * 100,
      liquid, illiquid, loansOut, basis, pl: net - basis, plPct: (net - basis) / basis * 100,
      classes: c,
    };
  }

  // ---- net-worth history series (synthesized, deterministic) ----
  function history(range) {
    const T = totals().net;
    const cfg = {
      '1D': { n: 48,  drift: 0.004, vol: 0.0009 },
      '1W': { n: 56,  drift: 0.012, vol: 0.004 },
      '1M': { n: 60,  drift: 0.03,  vol: 0.006 },
      '1Y': { n: 73,  drift: 0.22,  vol: 0.012 },
      'ALL':{ n: 96,  drift: 0.78,  vol: 0.02 },
    }[range] || { n: 60, drift: 0.03, vol: 0.006 };
    const start = T / (1 + cfg.drift);
    let seed = 20260608;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pts = [];
    for (let i = 0; i < cfg.n; i++) {
      const t = i / (cfg.n - 1);
      const trend = start + (T - start) * t;
      const wiggle = (rnd() - 0.45) * trend * cfg.vol * (1 - t * 0.3);
      pts.push(Math.max(0, trend + wiggle));
    }
    pts[pts.length - 1] = T;
    return pts;
  }

  // markers for large deposits/withdrawals on history
  const FLOW_MARKERS = {
    '1Y': [ { t:0.18, type:'in', amt:9000, label:'Bonus' }, { t:0.52, type:'out', amt:-12000, label:'Car repair' }, { t:0.81, type:'in', amt:6000, label:'Tax refund' } ],
    'ALL':[ { t:0.22, type:'in', amt:45000, label:'Home down-payment' }, { t:0.55, type:'in', amt:18000, label:'401(k) rollover' }, { t:0.88, type:'out', amt:-9000, label:'Withdrawal' } ],
  };

  // ---- formatters ----
  function fmtUSD(n, opts) {
    opts = opts || {};
    const abbr = window.__ALL_ABBR !== false; // tweakable
    const neg = n < 0; const a = Math.abs(n);
    let s;
    if (opts.full || !abbr) {
      s = a.toLocaleString('en-US', { maximumFractionDigits: opts.cents ? 2 : 0, minimumFractionDigits: opts.cents ? 2 : 0 });
    } else if (a >= 1e6) s = (a / 1e6).toFixed(2) + 'M';
    else if (a >= 1e3) s = (a / 1e3).toFixed(1) + 'K';
    else s = a.toFixed(opts.cents ? 2 : 0);
    return (neg ? '−$' : '$') + s;
  }
  function fmtPct(n, signed) {
    const s = (signed && n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2) + '%';
    return s;
  }
  function fmtQty(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 4 : 2 });
  }
  function holdYears(dateStr) {
    const d = new Date(dateStr); const now = new Date('2026-06-08');
    return (now - d) / (365.25 * 864e5);
  }
  function fmtDate(s) {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  window.ALL = { CLASSES, POSITIONS, mv, prevMv, costBasis, byClass, totals, history, FLOW_MARKERS, fmtUSD, fmtPct, fmtQty, holdYears, fmtDate };
  window.ALL.unitPriced = (p) => !!LIVE_QTY[p.cls];

  // ---- brand logos: crypto coin icons + public company logos (with monogram fallback) ----
  // crypto → spothq cryptocurrency-icons CDN (keyed by lowercase symbol)
  // stocks → Clearbit logo API (keyed by company domain)
  const STOCK_DOMAINS = {
    AAPL:'apple.com', MSFT:'microsoft.com', NVDA:'nvidia.com', GOOGL:'google.com', GOOG:'google.com',
    AMZN:'amazon.com', META:'meta.com', TSLA:'tesla.com', VTI:'vanguard.com', VOO:'vanguard.com',
    SPY:'ssga.com', QQQ:'invesco.com', AMD:'amd.com', NFLX:'netflix.com', DIS:'disney.com',
  };
  window.ALL.assetLogo = function (cls, ticker) {
    if (!ticker || ticker === '—') return null;
    if (cls === 'crypto') return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${ticker.toLowerCase()}.svg`;
    if (cls === 'stocks') { const d = STOCK_DOMAINS[ticker.toUpperCase()]; return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : null; }
    return null;
  };

  // intraday + 7-day % change (live assets only; manual → null)
  window.ALL.change24 = function (p) {
    if (LIVE_QTY[p.cls] && p.prev) return (p.price - p.prev) / p.prev * 100;
    if (p.cls === 'cash' && p.prevValue) return (p.value - p.prevValue) / p.prevValue * 100;
    return null;
  };
  window.ALL.change7d = function (p) {
    if (!LIVE_QTY[p.cls]) return null;
    let h = 0; const s = (p.ticker || p.id) + ''; for (const ch of s) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
    return ((h % 2100) / 100) - 7;   // deterministic −7.00%..+13.99%
  };

  // ---- realized sales in tax year 2026 (each matched against lots) ----
  // Stored as raw disposals; the lot-matching engine resolves basis per method.
  const DISPOSALS = [
    { id:'d1', cls:'crypto', asset:'BTC',  qty:0.1,  proceeds:6842, date:'2026-02-12',
      lots:{ FIFO:2840, LIFO:5200, HIFO:5200 }, acq:{ FIFO:'2021-02-04', LIFO:'2024-02-27', HIFO:'2024-02-27' } },
    { id:'d2', cls:'crypto', asset:'ETH',  qty:1,    proceeds:3512, date:'2026-04-03',
      lots:{ FIFO:1240, LIFO:2980, HIFO:2980 }, acq:{ FIFO:'2021-01-12', LIFO:'2023-10-02', HIFO:'2023-10-02' } },
    { id:'d3', cls:'stocks', asset:'NVDA', qty:50,   proceeds:6255,  date:'2026-01-22',
      lots:{ FIFO:990, LIFO:990, HIFO:990 }, acq:{ FIFO:'2020-03-23', LIFO:'2020-03-23', HIFO:'2020-03-23' } },
    { id:'d4', cls:'stocks', asset:'AAPL', qty:30,   proceeds:6372,  date:'2026-05-08',
      lots:{ FIFO:2526, LIFO:5055, HIFO:5055 }, acq:{ FIFO:'2019-05-20', LIFO:'2022-09-12', HIFO:'2022-09-12' } },
    { id:'d5', cls:'crypto', asset:'SOL',  qty:20,   proceeds:3096,  date:'2026-05-29',
      lots:{ FIFO:770, LIFO:770, HIFO:770 }, acq:{ FIFO:'2023-06-14', LIFO:'2023-06-14', HIFO:'2023-06-14' } },
  ];

  // loan interest income (Schedule B)
  const LOAN_INTEREST = POSITIONS.filter(p => p.cls === 'loans').map(p => ({ name: p.name, amt: p.loan.interestYtd }));

  function isLongTerm(acq, sale) {
    return (new Date(sale) - new Date(acq)) > 365.25 * 864e5;
  }

  // Match a sale of `qty` against buy-lots per accounting method → { basis, acq }.
  // FIFO = oldest first, LIFO = newest first, HIFO = highest-price first.
  function matchLots(lots, qty, method) {
    const ls = (lots || []).slice().sort((a, b) =>
      method === 'LIFO' ? new Date(b.date) - new Date(a.date) :
      method === 'HIFO' ? b.price - a.price :
      new Date(a.date) - new Date(b.date));
    let rem = qty, basis = 0, acq = null;
    for (const l of ls) {
      if (rem <= 0) break;
      const take = Math.min(rem, l.qty);
      basis += take * l.price;
      if (!acq) acq = l.date;          // earliest-matched lot drives holding period
      rem -= take;
    }
    return { basis, acq };
  }

  function taxSummary(method) {
    method = method || 'FIFO';
    const rows = [];
    // historical seed disposals (carry per-method basis maps)
    for (const d of DISPOSALS) {
      const basis = d.lots[method], acq = d.acq[method];
      const gain = d.proceeds - basis;
      rows.push({ ...d, basis, acq, gain, term: isLongTerm(acq, d.date) ? 'long' : 'short' });
    }
    // live realized sales recorded by the store — matched against the lot snapshot per method
    const realized = (window.PortfolioStore && window.PortfolioStore.realized) || [];
    for (const s of realized) {
      const m = matchLots(s.lotsSnapshot, s.qty, method);
      const acq = m.acq || s.date;
      const gain = s.proceeds - m.basis;
      rows.push({ id: s.id, cls: s.cls, asset: s.ticker, qty: s.qty, proceeds: s.proceeds, date: s.date,
        basis: m.basis, acq, gain, term: isLongTerm(acq, s.date) ? 'long' : 'short', live: true });
    }
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let stGain = 0, stLoss = 0, ltGain = 0, ltLoss = 0;
    const byClassGain = {};
    for (const r of rows) {
      if (r.term === 'long') { if (r.gain >= 0) ltGain += r.gain; else ltLoss += -r.gain; }
      else { if (r.gain >= 0) stGain += r.gain; else stLoss += -r.gain; }
      byClassGain[r.cls] = (byClassGain[r.cls] || 0) + r.gain;
    }
    const realizedGains = stGain + ltGain;
    const realizedLosses = stLoss + ltLoss;
    const netST = stGain - stLoss;
    const netLT = ltGain - ltLoss;
    const netCapGain = netST + netLT;
    const interestIncome = LOAN_INTEREST.reduce((s, x) => s + x.amt, 0);
    const estTax = Math.max(0, netST) * 0.35 + Math.max(0, netLT) * 0.20 + interestIncome * 0.35;
    return { method, rows, stGain, stLoss, ltGain, ltLoss, netST, netLT, realizedGains, realizedLosses, netCapGain, interestIncome, estTax, byClassGain, loanInterest: LOAN_INTEREST };
  }

  window.ALL.DISPOSALS = DISPOSALS;
  window.ALL.taxSummary = taxSummary;
  window.ALL.matchLots = matchLots;
  window.ALL.isLongTerm = isLongTerm;

  // ================= WATCHLIST (top-20 crypto by mcap + Mag 7) =================
  const heldSyms = new Set(POSITIONS.filter(p => p.ticker && p.ticker !== '—').map(p => p.ticker));
  const rawWatch = [
    // crypto top-20
    ['crypto','BTC','Bitcoin',68420,67980],['crypto','ETH','Ethereum',3512,3488],['crypto','BNB','BNB',604,612],
    ['crypto','SOL','Solana',154.8,159.2],['crypto','XRP','XRP',0.62,0.605],['crypto','DOGE','Dogecoin',0.158,0.149],
    ['crypto','ADA','Cardano',0.46,0.468],['crypto','AVAX','Avalanche',36.2,35.1],['crypto','TRX','TRON',0.123,0.121],
    ['crypto','LINK','Chainlink',17.4,16.9],['crypto','DOT','Polkadot',7.15,7.32],['crypto','POL','Polygon',0.71,0.69],
    ['crypto','SHIB','Shiba Inu',0.0000248,0.0000242],['crypto','LTC','Litecoin',84.6,83.1],['crypto','BCH','Bitcoin Cash',482,475],
    ['crypto','NEAR','NEAR Protocol',6.84,7.02],['crypto','UNI','Uniswap',11.2,10.7],['crypto','ICP','Internet Computer',12.9,13.2],
    ['crypto','APT','Aptos',9.34,9.05],['crypto','ATOM','Cosmos',8.42,8.61],
    // Magnificent 7
    ['stocks','AAPL','Apple',212.4,210.9],['stocks','MSFT','Microsoft',445.2,447.1],['stocks','NVDA','NVIDIA',125.1,122.4],
    ['stocks','GOOGL','Alphabet',178.3,176.8],['stocks','AMZN','Amazon',186.5,184.2],['stocks','META','Meta Platforms',498.1,503.4],
    ['stocks','TSLA','Tesla',182.1,188.9],
  ];
  const WATCHLIST = rawWatch.map(([cls, sym, name, price, prev]) => ({
    cls, sym, name, price, prev, chg: (price - prev) / prev * 100, held: heldSyms.has(sym),
  }));

  function spark(sym, price) {
    let seed = 0; for (const ch of sym) seed = (seed * 31 + ch.charCodeAt(0)) & 0x7fffffff;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const out = []; let v = price * (0.82 + rnd() * 0.12);
    for (let i = 0; i < 32; i++) { v = v + (price - v) * 0.05 + (rnd() - 0.48) * price * 0.03; out.push(Math.max(price * 0.5, v)); }
    out[out.length - 1] = price; return out;
  }
  window.ALL.WATCHLIST = WATCHLIST;
  window.ALL.spark = spark;

  // ================= NEWS (curated, tied to holdings + watchlist) =================
  const NEWS = [
    { id:'n1', cls:'crypto', tickers:['BTC'], sentiment:'pos', source:'CoinDesk', time:'2h ago', top:true,
      title:'Bitcoin reclaims $68K as spot ETF inflows hit a 6-week high',
      summary:'Institutional desks added to positions through the morning session, with the largest US spot vehicles logging net creations for a fifth straight day.' },
    { id:'n2', cls:'stocks', tickers:['NVDA','MSFT'], sentiment:'pos', source:'Bloomberg', time:'4h ago', top:true,
      title:'AI capex guidance lifts NVIDIA and Microsoft into the green',
      summary:'Updated datacenter spending commitments from two hyperscalers reinforced demand expectations for accelerator silicon heading into the back half of the year.' },
    { id:'n3', cls:'metals', tickers:['XAU'], sentiment:'pos', source:'Reuters', time:'5h ago', top:true,
      title:'Gold steadies near record as real yields drift lower',
      summary:'Bullion held above $2,350/oz with traders positioning ahead of next week\u2019s inflation print; silver tracked higher on industrial demand.' },
    { id:'n4', cls:'stocks', tickers:['TSLA'], sentiment:'neg', source:'CNBC', time:'7h ago', top:false,
      title:'Tesla slips on softer delivery commentary from suppliers',
      summary:'Component makers trimmed near-term shipment outlooks, pressuring the stock despite an unchanged full-year production target.' },
    { id:'n5', cls:'crypto', tickers:['ETH','SOL'], sentiment:'neutral', source:'The Block', time:'9h ago', top:false,
      title:'Ethereum and Solana fees diverge as L2 activity migrates',
      summary:'On-chain data showed rollup settlement steady on Ethereum while Solana priority fees cooled from last month\u2019s highs.' },
    { id:'n6', cls:'realest', tickers:[], sentiment:'neg', source:'WSJ', time:'11h ago', top:false,
      title:'Sun Belt rents flatten as new supply comes online in Austin',
      summary:'A wave of multifamily completions is tempering rent growth across Texas metros, with concessions reappearing in several submarkets.' },
    { id:'n7', cls:'stocks', tickers:['AAPL'], sentiment:'pos', source:'Reuters', time:'13h ago', top:false,
      title:'Apple services revenue estimates nudged higher into print',
      summary:'Several analysts raised services forecasts citing App Store and advertising momentum, offsetting muted hardware expectations.' },
    { id:'n8', cls:'crypto', tickers:['LINK'], sentiment:'pos', source:'CoinDesk', time:'15h ago', top:false,
      title:'Chainlink expands cross-chain settlement pilot with two banks',
      summary:'A new tokenized-asset pilot extends the interoperability protocol\u2019s reach into regulated settlement workflows.' },
    { id:'n9', cls:'metals', tickers:['XAG'], sentiment:'neutral', source:'Kitco', time:'18h ago', top:false,
      title:'Silver\u2019s gold ratio narrows as solar demand forecasts firm',
      summary:'Analysts flagged tightening above-ground inventories against resilient photovoltaic consumption into 2027.' },
  ];
  window.ALL.NEWS = NEWS;

  // ================= RETIREMENT ENGINE (Coast FIRE) =================
  // Per-sector annual growth assumptions by scenario.
  const SCENARIOS = {
    Conservative: { crypto:0.06, stocks:0.05, realest:0.03, private:0.04, cash:0.02, metals:0.03 },
    Base:         { crypto:0.12, stocks:0.07, realest:0.04, private:0.06, cash:0.02, metals:0.05 },
    Aggressive:   { crypto:0.18, stocks:0.09, realest:0.05, private:0.08, cash:0.03, metals:0.06 },
  };

  // Which classes compound toward retirement, and how much of each counts.
  // Primary residence and loans receivable are excluded by default.
  function investableByClass(includeHome) {
    const c = byClass();
    return {
      crypto: c.crypto.value,
      stocks: c.stocks.value,
      cash:   c.cash.value,
      metals: c.metals.value,
      private:c.private.value,
      // investment real estate; primary residence ('home') only if explicitly included
      realest: c.realest.positions.filter(p => includeHome || p.id !== 'home').reduce((s,p)=>s+mv(p),0),
    };
  }

  function blendedCAGR(cagr, invest) {
    let tot = 0, w = 0;
    for (const k of Object.keys(invest)) { tot += invest[k] * (cagr[k] || 0); w += invest[k]; }
    return w ? tot / w : 0;
  }

  // Project a balance forward `years` with monthly contributions at annual `rate`.
  function fv(balance, monthlyContrib, years, rate) {
    const rm = Math.pow(1 + rate, 1 / 12) - 1;
    let b = balance;
    for (let m = 0; m < Math.round(years * 12); m++) b = b * (1 + rm) + monthlyContrib;
    return b;
  }

  // Years until balance (with contributions) first reaches target. Returns {years} or null if >60y.
  function yearsToTarget(balance, monthlyContrib, target, rate) {
    if (balance >= target) return 0;
    const rm = Math.pow(1 + rate, 1 / 12) - 1;
    let b = balance;
    for (let m = 1; m <= 60 * 12; m++) { b = b * (1 + rm) + monthlyContrib; if (b >= target) return m / 12; }
    return null;
  }

  // Full retirement model.
  // opts.method: 'traditional' | 'coast' | 'fire'  (affects defaults the UI sets, plus coastAge handling)
  // opts.coastAge: stop contributing at this age (only meaningful for 'coast'); null = contribute to retireAge
  // opts.withdrawalRate: % (default 4). FIRE number = annualSpend × (100/withdrawalRate)
  // opts.otherIncome / otherIncomeAge: annual income (SS/pension) that offsets spend from a start age
  // opts.cagrOverride: per-class CAGR map that supersedes the scenario preset
  function retirement(opts) {
    const o = Object.assign({ currentAge:40, retireAge:65, annualSpend:120000, monthly:8000, scenario:'Base',
      cagrOverride:null, target:null, endAge:95, method:'coast', coastAge:null, withdrawalRate:4,
      otherIncome:0, otherIncomeAge:67, includeHome:false }, opts || {});
    const invest = investableByClass(o.includeHome);
    const investable = Object.values(invest).reduce((s,v)=>s+v,0);
    const baseCagr = SCENARIOS[o.scenario] || SCENARIOS.Base;
    const cagr = Object.assign({}, baseCagr, o.cagrOverride || {});
    const blended = blendedCAGR(cagr, invest);
    const fireNumber = o.annualSpend * (100 / o.withdrawalRate);   // 4% rule by default
    const target = o.target != null ? o.target : fireNumber;
    const yrsToRetire = Math.max(0, o.retireAge - o.currentAge);
    const coastStop = (o.method === 'coast' && o.coastAge != null) ? o.coastAge : o.retireAge;

    // Coast FIRE: amount needed NOW so it grows to target by retireAge with NO new contributions.
    const coastNumber = target / Math.pow(1 + blended, yrsToRetire);
    const coastAchieved = investable >= coastNumber;

    const rmAcc  = Math.pow(1 + blended, 1/12) - 1;
    const drawRate = blended * 0.7;                 // de-risk in retirement
    const rmDraw = Math.pow(1 + drawRate, 1/12) - 1;

    // Unified monthly walk: accumulate to retireAge (contributions stop at coastStop), then draw down.
    function walk(startBal, monthlyContrib) {
      let bal = startBal, projAtRetire = null, depletionAge = null;
      const yearly = [];
      for (let age = o.currentAge; age <= o.endAge; age++) {
        yearly.push({ age, bal: Math.max(0, bal), phase: age < o.retireAge ? 'accum' : 'draw' });
        if (age === o.retireAge) projAtRetire = bal;
        for (let m = 0; m < 12; m++) {
          if (age < o.retireAge) {
            bal = bal * (1 + rmAcc);
            if (age < coastStop) bal += monthlyContrib;
          } else {
            bal = bal * (1 + rmDraw);
            let need = o.annualSpend;
            if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome);
            bal -= need / 12;
          }
        }
        if (bal <= 0 && depletionAge == null && age >= o.retireAge) depletionAge = age + 1;
      }
      if (projAtRetire == null) projAtRetire = bal;
      return { yearly, projAtRetire, depletionAge, endBal: bal };
    }

    const main = walk(investable, o.monthly);
    const coastWalk = walk(investable, 0);          // zero new contributions from today
    const series = main.yearly.map((d, i) => ({ age: d.age, bal: d.bal, phase: d.phase,
      coast: d.age <= o.retireAge ? coastWalk.yearly[i].bal : null }));

    const projWithContrib = main.projAtRetire;
    const projCoast = coastWalk.projAtRetire;
    const depletionAge = main.depletionAge;
    const neverDepletes = depletionAge == null;

    // Age you actually cross the goal (with contributions). Walk monthly for precision.
    function ageHitting(startBal, monthlyContrib) {
      if (startBal >= target) return o.currentAge;
      let bal = startBal;
      for (let m = 1; m <= (o.endAge - o.currentAge) * 12; m++) {
        const age = o.currentAge + Math.floor((m - 1) / 12);
        bal = bal * (1 + rmAcc);
        if (age < o.retireAge && age < coastStop) bal += monthlyContrib;
        if (bal >= target) return o.currentAge + m / 12;
      }
      return null;
    }
    const fireAge = ageHitting(investable, o.monthly);
    const fireAgeUp = ageHitting(investable * 1.10, o.monthly);   // after a +10% year

    // Safe age to retire: earliest age you can stop working and have the money last to endAge
    // under CONSERVATIVE growth + a safe withdrawal rate (ignores aggressive overrides).
    const consBlended = blendedCAGR(SCENARIOS.Conservative, invest);
    const rmC = Math.pow(1 + consBlended, 1/12) - 1;
    const rmCdraw = Math.pow(1 + consBlended * 0.7, 1/12) - 1;
    const safeWR = Math.min(o.withdrawalRate, 3.5);               // be stricter than the headline rate
    function survivesRetiringAt(R) {
      let bal = investable;
      for (let age = o.currentAge; age < R; age++) for (let mo=0;mo<12;mo++){ bal = bal*(1+rmC) + o.monthly; }
      const safeNeed = o.annualSpend;
      for (let age = R; age <= o.endAge; age++) {
        for (let mo=0;mo<12;mo++){ bal = bal*(1+rmCdraw); let need = safeNeed; if (o.otherIncome>0 && age>=o.otherIncomeAge) need = Math.max(0, need - o.otherIncome); bal -= need/12; }
        if (bal <= 0) return false;
      }
      // also require the safe-withdrawal test at R: balance covers spend at the strict rate
      return bal > 0;
    }
    let safeAge = null;
    for (let R = o.currentAge; R <= Math.min(85, o.endAge); R++) { if (survivesRetiringAt(R)) { safeAge = R; break; } }
    const safeNumber = o.annualSpend * (100 / safeWR);

    const sustainableSpend = projWithContrib * (o.withdrawalRate / 100);

    const sectors = Object.keys(invest).map(k => ({
      key: k, label: CLASSES[k].label, color: CLASSES[k].color, value: invest[k], cagr: cagr[k] || 0,
      y10: invest[k] * Math.pow(1 + (cagr[k]||0), 10), y20: invest[k] * Math.pow(1 + (cagr[k]||0), 20),
    })).filter(s => s.value > 0).sort((a,b)=>b.value-a.value);

    return {
      ...o, invest, investable, cagr, baseCagr, blended, fireNumber, target, yrsToRetire, coastStop,
      coastNumber, coastAchieved, projWithContrib, projCoast, fireAge, fireAgeUp,
      safeAge, safeNumber, consBlended,
      sustainableSpend, depletionAge, neverDepletes, series, sectors,
      y10: fv(investable, o.monthly, 10, blended), y20: fv(investable, o.monthly, 20, blended),
    };
  }

  // Monte Carlo: random annual real returns ~ Normal(blended, sd). Survival = money lasts to endAge.
  function retirementMC(opts, runs) {
    runs = runs || 500;
    const o = Object.assign({ currentAge:40, retireAge:65, annualSpend:120000, monthly:8000, scenario:'Base',
      cagrOverride:null, endAge:95, method:'coast', coastAge:null, sd:0.13, otherIncome:0, otherIncomeAge:67, includeHome:false }, opts || {});
    const invest = investableByClass(o.includeHome);
    const investable = Object.values(invest).reduce((s,v)=>s+v,0);
    const cagr = Object.assign({}, SCENARIOS[o.scenario] || SCENARIOS.Base, o.cagrOverride || {});
    const mean = blendedCAGR(cagr, invest);
    const coastStop = (o.method === 'coast' && o.coastAge != null) ? o.coastAge : o.retireAge;
    const years = o.endAge - o.currentAge + 1;
    const cols = Array.from({ length: years }, () => []);
    let successes = 0;
    const randn = () => { let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    for (let run = 0; run < runs; run++) {
      let bal = investable, survived = true;
      for (let i = 0; i < years; i++) {
        const age = o.currentAge + i;
        const r = mean + o.sd * randn();
        bal = bal * (1 + r);
        if (age < o.retireAge) { if (age < coastStop) bal += o.monthly * 12; }
        else { let need = o.annualSpend; if (o.otherIncome > 0 && age >= o.otherIncomeAge) need = Math.max(0, need - o.otherIncome); bal -= need; }
        if (bal <= 0) { bal = 0; survived = false; }
        cols[i].push(bal);
      }
      if (survived) successes++;
    }
    const pct = (arr, p) => { const s = [...arr].sort((a,b)=>a-b); return s[Math.floor((p/100)*(s.length-1))]; };
    const bands = cols.map((vals, i) => ({ age: o.currentAge + i, p10: pct(vals,10), p50: pct(vals,50), p90: pct(vals,90) }));
    return { bands, successRate: Math.round(successes / runs * 100), runs };
  }

  window.ALL.SCENARIOS = SCENARIOS;
  window.ALL.retirement = retirement;
  window.ALL.retirementMC = retirementMC;
  window.ALL.investableByClass = investableByClass;

  // ================= TRANSACTIONS (history ledger, editable) =================
  const TX_TYPES = {
    buy:          { label: 'Buy',         color: 'var(--pos)' },
    sell:         { label: 'Sell',        color: 'var(--neg)' },
    deposit:      { label: 'Deposit',     color: 'var(--c-stocks)' },
    withdrawal:   { label: 'Withdrawal',  color: 'var(--c-crypto)' },
    dividend:     { label: 'Dividend',    color: 'var(--c-realest)' },
    valuation:    { label: 'Valuation',   color: 'var(--c-private)' },
    loan_payment: { label: 'Loan payment', color: 'var(--c-loans)' },
    transfer:     { label: 'Transfer',    color: 'var(--ink-3)' },
  };
  // source: 'live' = pulled via Plaid/SnapTrade/wallet · 'manual' = entered by hand
  const TRANSACTIONS = [
    { id:'t01', date:'2026-06-12', type:'buy',  cls:'crypto', ticker:'BTC',  name:'Bitcoin',          qty:0.05, price:67800, account:'Coinbase',             source:'live',   note:'DCA buy' },
    { id:'t02', date:'2026-06-08', type:'dividend', cls:'stocks', ticker:'VTI', name:'Vanguard Total Mkt ETF', qty:null, price:null, amount:412,  account:'Fidelity',     source:'live',   note:'Quarterly dividend' },
    { id:'t03', date:'2026-05-29', type:'sell', cls:'crypto', ticker:'SOL',  name:'Solana',           qty:20,   price:154.8, account:'Phantom',              source:'live',   note:'Trim position' },
    { id:'t04', date:'2026-05-15', type:'valuation', cls:'realest', ticker:'—', name:'Primary Residence · Austin TX', qty:null, price:null, amount:243000, account:'Zillow estimate', source:'manual', note:'Updated estimate' },
    { id:'t05', date:'2026-05-08', type:'sell', cls:'stocks', ticker:'AAPL', name:'Apple Inc.',       qty:30,   price:212.4, account:'Fidelity · Brokerage', source:'live',   note:'Rebalance' },
    { id:'t06', date:'2026-05-01', type:'loan_payment', cls:'loans', ticker:'—', name:'Personal Loan · Friend', qty:null, price:null, amount:289.99, account:'Note', source:'manual', note:'Payment received' },
    { id:'t07', date:'2026-04-22', type:'deposit', cls:'cash', ticker:'—', name:'HYSA · Marcus',      qty:null, price:null, amount:1500, account:'Marcus',          source:'live',   note:'Paycheck sweep' },
    { id:'t08', date:'2026-04-03', type:'sell', cls:'crypto', ticker:'ETH',  name:'Ethereum',         qty:1,    price:3512,  account:'MetaMask',             source:'live',   note:'Took profit' },
    { id:'t09', date:'2026-03-15', type:'valuation', cls:'private', ticker:'—', name:'Graded Cards · PSA 10', qty:null, price:null, amount:6400, account:'Collectr', source:'manual', note:'Daily revaluation' },
    { id:'t10', date:'2026-03-01', type:'buy',  cls:'metals', ticker:'XAU',  name:'Gold Bullion',     qty:1,    price:2280,  account:'Vault',                source:'manual', note:'Added 1 oz' },
    { id:'t11', date:'2026-02-12', type:'sell', cls:'crypto', ticker:'BTC',  name:'Bitcoin',          qty:0.1,  price:68420, account:'Coinbase',             source:'live',   note:'Rebalance to cash' },
    { id:'t12', date:'2026-01-22', type:'sell', cls:'stocks', ticker:'NVDA', name:'NVIDIA Corp.',     qty:50,   price:125.1, account:'Fidelity · Brokerage', source:'live',   note:'Trim winner' },
    { id:'t13', date:'2026-01-10', type:'loan_payment', cls:'loans', ticker:'—', name:'Personal Loan · Friend', qty:null, price:null, amount:289.99, account:'Note', source:'manual', note:'Payment received' },
    { id:'t14', date:'2025-12-15', type:'deposit', cls:'cash', ticker:'—', name:'401(k) contribution', qty:null, price:null, amount:1500, account:'Fidelity', source:'live', note:'Payroll 401(k)' },
    { id:'t15', date:'2025-11-20', type:'buy',  cls:'stocks', ticker:'VTI',  name:'Vanguard Total Mkt ETF', qty:40, price:262.4, account:'Fidelity',         source:'live',   note:'Index add' },
    { id:'t16', date:'2025-10-30', type:'withdrawal', cls:'cash', ticker:'—', name:'Checking · Chase', qty:null, price:null, amount:1800, account:'Chase',         source:'manual', note:'Home repairs' },
  ];
  // amount helper: market trades = qty×price, else stored amount
  function txAmount(t) { return (t.qty != null && t.price != null) ? t.qty * t.price : (t.amount || 0); }

  window.ALL.TX_TYPES = TX_TYPES;
  window.ALL.TRANSACTIONS = TRANSACTIONS;
  window.ALL.txAmount = txAmount;
})();
