/* $ALL — Trading-card catalog + collection model (Collectr-style)
   A browsable directory of cards & sealed product across sets, each priced by
   grade (raw / PSA / BGS / CGC). The user's "Graded Cards" position is itemised
   into individual line-items; its aggregate value/qty/basis are derived here so
   the rest of the app (overview, tax, allocation) stays consistent. */
(function () {
  const A = window.ALL;

  // ---- games (each gets a hue used for thumbnails / chips) ----
  const GAMES = {
    op:    { key:'op',    label:'One Piece',  color:'#C0303A', tint:'#F6E2E3' },
    pkm:   { key:'pkm',   label:'Pokémon',    color:'#2E6FE0', tint:'#E4ECFB' },
    lor:   { key:'lor',   label:'Lorcana',    color:'#1E9E8F', tint:'#DCF1EE' },
    mtg:   { key:'mtg',   label:'Magic',      color:'#B5703C', tint:'#F2E6D9' },
    sports:{ key:'sports',label:'Sports',     color:'#0E9D6E', tint:'#DCF1E8' },
  };

  // ---- sets (code is the prominent label; name is a subtitle) ----
  const SETS = {
    // One Piece
    'op-13': { id:'op-13', game:'op', code:'OP-13', name:'Booster Set 13', year:2025 },
    'op-09': { id:'op-09', game:'op', code:'OP-09', name:'Emperors in the New World', year:2024 },
    'op-05': { id:'op-05', game:'op', code:'OP-05', name:'Awakening of the New Era', year:2023 },
    'op-01': { id:'op-01', game:'op', code:'OP-01', name:'Romance Dawn', year:2022 },
    'eb-01': { id:'eb-01', game:'op', code:'EB-01', name:'Memorial Collection', year:2024 },
    // Pokémon
    'sv-151':  { id:'sv-151',  game:'pkm', code:'151',     name:'Scarlet & Violet — 151', year:2023 },
    'sv-prismatic': { id:'sv-prismatic', game:'pkm', code:'PRE', name:'Prismatic Evolutions', year:2025 },
    'sv-surging':   { id:'sv-surging',   game:'pkm', code:'SSP', name:'Surging Sparks', year:2024 },
    'base-1999':    { id:'base-1999',    game:'pkm', code:'BASE', name:'Base Set (Unlimited)', year:1999 },
    // Lorcana
    'lor-rise': { id:'lor-rise', game:'lor', code:'RISE', name:'Rise of the Floodborn', year:2023 },
    // Magic
    'mtg-mh3':  { id:'mtg-mh3',  game:'mtg', code:'MH3', name:'Modern Horizons 3', year:2024 },
    // Sports
    'topps-chrome': { id:'topps-chrome', game:'sports', code:'TOPPS', name:'Chrome Baseball', year:2023 },
  };

  // ---- price ladder helper: {raw, psa9, psa10, bgs95, cgc10} ----
  const px = (raw, psa10, opts) => {
    opts = opts || {};
    return {
      raw,
      psa9:  opts.psa9  != null ? opts.psa9  : Math.round(raw * 1.25),
      psa10: psa10,
      bgs95: opts.bgs95 != null ? opts.bgs95 : Math.round(psa10 * 0.82),
      cgc10: opts.cgc10 != null ? opts.cgc10 : Math.round(psa10 * 0.9),
    };
  };

  // ---- card catalog (single cards) ----
  // rarity codes drive a small accent dot; daily = today's % move (seeded look)
  const CARDS = [
    // ===== One Piece — OP-13 =====
    { id:'op13-119', game:'op', set:'op-13', num:'OP13-119', name:'Monkey D. Luffy', rarity:'Manga Rare', daily:2.4, prices:px(180, 690, {psa9:255, bgs95:560, cgc10:615}) },
    { id:'op13-118', game:'op', set:'op-13', num:'OP13-118', name:'Shanks',          rarity:'Manga Rare', daily:1.1, prices:px(120, 430) },
    { id:'op13-104', game:'op', set:'op-13', num:'OP13-104', name:'Roronoa Zoro',    rarity:'Super Rare', daily:-0.8, prices:px(42, 150) },
    { id:'op13-051', game:'op', set:'op-13', num:'OP13-051', name:'Boa Hancock',     rarity:'Secret Rare', daily:3.2, prices:px(95, 360) },
    // ===== One Piece — OP-09 =====
    { id:'op09-118', game:'op', set:'op-09', num:'OP09-118', name:'Portgas D. Ace',  rarity:'Manga Rare', daily:0.6, prices:px(160, 540) },
    { id:'op09-093', game:'op', set:'op-09', num:'OP09-093', name:'Yamato',          rarity:'Super Rare', daily:-1.4, prices:px(30, 110) },
    // ===== One Piece — OP-05 =====
    { id:'op05-119', game:'op', set:'op-05', num:'OP05-119', name:'Monkey D. Luffy', rarity:'Leader Parallel', daily:1.9, prices:px(125, 470, {psa9:175, bgs95:390, cgc10:420}) },
    { id:'op05-098', game:'op', set:'op-05', num:'OP05-098', name:'Kozuki Oden',     rarity:'Super Rare', daily:0.2, prices:px(28, 95) },
    // ===== One Piece — OP-01 =====
    { id:'op01-120', game:'op', set:'op-01', num:'OP01-120', name:'Roronoa Zoro',    rarity:'Manga Rare', daily:1.3, prices:px(230, 940, {psa9:330, bgs95:760, cgc10:840}) },
    { id:'op01-024', game:'op', set:'op-01', num:'OP01-024', name:'Trafalgar Law',   rarity:'Super Rare', daily:-0.5, prices:px(34, 120) },
    // ===== One Piece — EB-01 =====
    { id:'eb01-061', game:'op', set:'eb-01', num:'EB01-061', name:'Nico Robin',      rarity:'Secret Rare', daily:2.0, prices:px(70, 260) },
    // ===== Pokémon — 151 =====
    { id:'sv151-199', game:'pkm', set:'sv-151', num:'199/165', name:'Charizard ex', rarity:'Special Illustration', daily:1.7, prices:px(280, 720, {psa9:360, bgs95:600, cgc10:650}) },
    { id:'sv151-185', game:'pkm', set:'sv-151', num:'185/165', name:'Venusaur ex',  rarity:'Special Illustration', daily:0.4, prices:px(90, 240) },
    { id:'sv151-201', game:'pkm', set:'sv-151', num:'201/165', name:'Mew ex',        rarity:'Special Illustration', daily:0.9, prices:px(120, 320) },
    // ===== Pokémon — Prismatic =====
    { id:'pre-180', game:'pkm', set:'sv-prismatic', num:'180/131', name:'Umbreon ex', rarity:'Special Illustration', daily:4.1, prices:px(420, 980, {psa9:560, bgs95:820, cgc10:890}) },
    { id:'pre-167', game:'pkm', set:'sv-prismatic', num:'167/131', name:'Sylveon ex', rarity:'Special Illustration', daily:1.2, prices:px(110, 300) },
    // ===== Pokémon — Surging Sparks =====
    { id:'ssp-238', game:'pkm', set:'sv-surging', num:'238/191', name:'Pikachu ex',  rarity:'Special Illustration', daily:2.6, prices:px(150, 410) },
    // ===== Pokémon — Base Set 1999 =====
    { id:'base-4', game:'pkm', set:'base-1999', num:'4/102', name:'Charizard', rarity:'Holo Rare', daily:0.3, img:'https://images.pokemontcg.io/base1/4.png', prices:px(900, 14000, {psa9:3400, bgs95:9000, cgc10:9500}) },
    { id:'base-2', game:'pkm', set:'base-1999', num:'2/102', name:'Blastoise', rarity:'Holo Rare', daily:-0.2, img:'https://images.pokemontcg.io/base1/2.png', prices:px(220, 1600, {psa9:520}) },
    { id:'base-15', game:'pkm', set:'base-1999', num:'15/102', name:'Venusaur', rarity:'Holo Rare', daily:0.5, img:'https://images.pokemontcg.io/base1/15.png', prices:px(260, 2600, {psa9:700}) },
    { id:'base-10', game:'pkm', set:'base-1999', num:'10/102', name:'Mewtwo', rarity:'Holo Rare', daily:0.1, img:'https://images.pokemontcg.io/base1/10.png', prices:px(120, 1400, {psa9:360}) },
    { id:'base-16', game:'pkm', set:'base-1999', num:'16/102', name:'Zapdos', rarity:'Holo Rare', daily:-0.3, img:'https://images.pokemontcg.io/base1/16.png', prices:px(90, 900, {psa9:240}) },
    { id:'base-58', game:'pkm', set:'base-1999', num:'58/102', name:'Pikachu', rarity:'Common', daily:1.4, img:'https://images.pokemontcg.io/base1/58.png', prices:px(22, 220, {psa9:70}) },
    // ===== Lorcana =====
    { id:'lor-rise-223', game:'lor', set:'lor-rise', num:'223/204', name:'Elsa — Spirit of Winter', rarity:'Enchanted', daily:0.8, prices:px(140, 380) },
    // ===== Magic =====
    { id:'mh3-238', game:'mtg', set:'mtg-mh3', num:'238', name:'Ugin, Eye of the Storms', rarity:'Mythic (Serialized)', daily:1.5, prices:px(75, 210) },
    // ===== Sports =====
    { id:'topps-elly', game:'sports', set:'topps-chrome', num:'150', name:'Elly De La Cruz — RC', rarity:'Rookie', daily:2.2, prices:px(60, 260) },
  ];

  // ---- sealed product ----
  const SEALED = [
    { id:'s-op13-bb', game:'op', set:'op-13', name:'OP-13 Booster Box', kind:'Booster Box', daily:0.9, price:142 },
    { id:'s-op13-cs', game:'op', set:'op-13', name:'OP-13 Booster Case (12 boxes)', kind:'Sealed Case', daily:1.1, price:1620 },
    { id:'s-op05-bb', game:'op', set:'op-05', name:'OP-05 Booster Box', kind:'Booster Box', daily:1.8, price:280 },
    { id:'s-op01-bb', game:'op', set:'op-01', name:'OP-01 Booster Box (1st print)', kind:'Booster Box', daily:2.4, price:1450 },
    { id:'s-151-bb',  game:'pkm', set:'sv-151', name:'151 Booster Box', kind:'Booster Box', daily:1.0, price:165 },
    { id:'s-pre-etb', game:'pkm', set:'sv-prismatic', name:'Prismatic Evolutions ETB', kind:'Elite Trainer Box', daily:3.0, price:95 },
    { id:'s-base-bb', game:'pkm', set:'base-1999', name:'Base Set Booster Box (1999)', kind:'Vintage Sealed', daily:0.1, price:42000 },
    { id:'s-mh3-cb',  game:'mtg', set:'mtg-mh3', name:'Modern Horizons 3 Collector Box', kind:'Collector Box', daily:0.5, price:310 },
  ];

  // index helpers
  const cardById = {}; CARDS.forEach(c => cardById[c.id] = c);
  const sealedById = {}; SEALED.forEach(s => sealedById[s.id] = s);

  // ---- the user's collection (line-items on the `cards` position) ----
  // type: 'graded' | 'raw' | 'sealed'.  graded items carry grader+grade.
  const ITEMS = [
    { id:'i1', catId:'base-4',     type:'graded', grader:'PSA', grade:'9',  qty:1, basis:1800, acquired:'2021-11-20' },
    { id:'i2', catId:'op01-120',   type:'graded', grader:'PSA', grade:'10', qty:1, basis:240,  acquired:'2023-02-10' },
    { id:'i3', catId:'op13-119',   type:'graded', grader:'PSA', grade:'10', qty:1, basis:300,  acquired:'2025-01-15' },
    { id:'i4', catId:'sv151-199',  type:'graded', grader:'PSA', grade:'10', qty:1, basis:300,  acquired:'2024-03-30' },
    { id:'i5', catId:'op05-119',   type:'raw',    grader:null,  grade:null, qty:1, basis:60,   acquired:'2023-09-01' },
    { id:'i6', catId:'op13-118',   type:'graded', grader:'BGS', grade:'9.5',qty:1, basis:180,  acquired:'2025-02-04' },
    { id:'s1', catId:'s-op05-bb',  type:'sealed', grader:null,  grade:null, qty:1, basis:120,  acquired:'2022-12-01' },
    { id:'s2', catId:'s-op13-bb',  type:'sealed', grader:null,  grade:null, qty:2, basis:115,  acquired:'2025-02-20' },
  ];

  // ---- price for an arbitrary grader+grade, derived from the ladder ----
  // catalog stores raw/psa9/psa10/bgs95/cgc10; other grades derive from those.
  const GRADES = {
    PSA: ['10', '9', '8', '7'],
    BGS: ['10', '9.5', '9', '8.5'],
    CGC: ['10', '9.5', '9'],
  };
  function priceForGrade(prices, grader, grade) {
    if (!prices) return 0;
    const g = String(grade);
    if (grader === 'PSA') return ({ '10': prices.psa10, '9': prices.psa9, '8': Math.round(prices.psa9 * 0.55), '7': Math.round(prices.psa9 * 0.38) })[g] || prices.psa9;
    if (grader === 'BGS') return ({ '10': Math.round(prices.psa10 * 1.4), '9.5': prices.bgs95, '9': Math.round(prices.bgs95 * 0.62), '8.5': Math.round(prices.bgs95 * 0.42) })[g] || prices.bgs95;
    if (grader === 'CGC') return ({ '10': prices.cgc10, '9.5': Math.round(prices.cgc10 * 0.78), '9': Math.round(prices.cgc10 * 0.5) })[g] || prices.cgc10;
    return prices.raw;
  }

  // ---- per-item current value from catalog + grade ----
  function itemUnitValue(it) {
    if (it.manual) return it.value || 0;
    if (it.type === 'sealed') { const s = sealedById[it.catId]; return s ? s.price : 0; }
    const c = cardById[it.catId]; if (!c) return 0;
    if (it.type === 'raw') return c.prices.raw;
    return priceForGrade(c.prices, it.grader, it.grade);
  }
  function itemValue(it) { return itemUnitValue(it) * (it.qty || 1); }
  function itemBasis(it) { return (it.basis || 0) * (it.qty || 1); }
  function itemDaily(it) { if (it.manual) return 0; const o = it.type === 'sealed' ? sealedById[it.catId] : cardById[it.catId]; return o ? o.daily : 0; }
  function itemMeta(it) {
    if (it.manual) {
      return { name: it.name || 'Custom item', set: it.setCode ? { code: it.setCode, name: it.setName || '' } : null, game: it.game || null, num: it.num || '', rarity: it.type === 'sealed' ? (it.kind || 'Sealed') : it.type === 'raw' ? 'Raw / ungraded' : `${it.grader || ''} ${it.grade || ''}`.trim(), sealed: it.type === 'sealed', prices: null, custom: true, img: it.img || null };
    }
    if (it.type === 'sealed') { const s = sealedById[it.catId]; return { name: s ? s.name : 'Sealed', set: SETS[s && s.set], game: s && s.game, num: s ? s.kind : '', rarity: s ? s.kind : '', sealed: true, img: (s && s.img) || null }; }
    const c = cardById[it.catId]; return { name: c ? c.name : 'Card', set: SETS[c && c.set], game: c && c.game, num: c ? c.num : '', rarity: c ? c.rarity : '', prices: c && c.prices, img: (c && c.img) || null };
  }

  // ---- recompute the aggregate position from its items ----
  function recompute(pos) {
    if (!pos || !pos.items) return;
    let val = 0, basis = 0, qty = 0;
    pos.items.forEach(it => { val += itemValue(it); basis += itemBasis(it); qty += (it.qty || 1); });
    pos.value = Math.round(val);
    pos.basis = Math.round(basis);
    pos.qty = qty;
  }

  // attach items to the existing `cards` position and derive its totals
  function init() {
    const pos = A.POSITIONS.find(p => p.id === 'cards' || (p.cls === 'private' && p.subcat === 'Trading Cards'));
    if (!pos) return;
    if (!pos.items) {
      pos.items = ITEMS.map(it => ({ ...it }));
    }
    pos.name = 'Trading Cards';
    pos.account = 'Vault · graded + raw';
    pos.priceSource = 'Collectr · daily';
    pos.valued = '2026-06-15';
    recompute(pos);
  }
  init();

  window.CARDS_DB = {
    GAMES, SETS, CARDS, SEALED, cardById, sealedById, GRADES, priceForGrade,
    itemUnitValue, itemValue, itemBasis, itemDaily, itemMeta, recompute,
  };
})();
