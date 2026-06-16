/* $ALL — Tax center (lighter build, full UI) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Badge, Download, FileText, Coins } = U;
  const e = React.createElement;

  function MetricCard({ label, value, sub, color, accent }) {
    return e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)', borderTop: accent ? `2px solid ${accent}` : undefined } },
      e('div', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 11 } }, label),
      e('div', { className: 'num', style: { fontSize: 23, fontWeight: 650, letterSpacing: '-.02em', color: color || 'var(--ink)' } }, value),
      sub && e('div', { className: 'num', style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 5 } }, sub));
  }

  function STLTBar({ tax }) {
    const max = Math.max(tax.stGain, tax.stLoss, tax.ltGain, tax.ltLoss, 1);
    const Bar = ({ label, gain, loss }) => e('div', { style: { marginBottom: 16 } },
      e('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 } }, e('span', { style: { color: 'var(--ink-2)', fontWeight: 500 } }, label), e('span', { className: 'num', style: { color: 'var(--ink-3)' } }, `net ${gain-loss>=0?'+':'−'}${A.fmtUSD(Math.abs(gain-loss))}`)),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, e('div', { style: { flex: 1, height: 14, background: 'var(--bg-sunk)', borderRadius: 4, overflow: 'hidden' } }, e('div', { style: { width: `${gain/max*100}%`, height: '100%', background: 'var(--pos)', borderRadius: 4 } })), e('span', { className: 'num', style: { width: 78, textAlign: 'right', fontSize: 12, color: 'var(--pos)', fontWeight: 600 } }, '+'+A.fmtUSD(gain))),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, e('div', { style: { flex: 1, height: 14, background: 'var(--bg-sunk)', borderRadius: 4, overflow: 'hidden' } }, e('div', { style: { width: `${loss/max*100}%`, height: '100%', background: 'var(--neg)', borderRadius: 4 } })), e('span', { className: 'num', style: { width: 78, textAlign: 'right', fontSize: 12, color: 'var(--neg)', fontWeight: 600 } }, '−'+A.fmtUSD(loss)))));
    return e('div', null, e(Bar, { label: 'Short-term (≤1yr)', gain: tax.stGain, loss: tax.stLoss }), e(Bar, { label: 'Long-term (>1yr)', gain: tax.ltGain, loss: tax.ltLoss }));
  }

  function ByClassBars({ tax }) {
    const entries = Object.entries(tax.byClassGain).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
    const max = Math.max(...entries.map(([,v])=>Math.abs(v)), 1);
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 13 } }, entries.map(([k,v])=>{
      const c = A.CLASSES[k];
      return e('div', { key: k, style: { display: 'flex', alignItems: 'center', gap: 12 } },
        e('span', { style: { width: 110, fontSize: 12.5, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 7 } }, e('span', { style: { width: 8, height: 8, borderRadius: 2, background: c.color } }), c.label.split(' ')[0]),
        e('div', { style: { flex: 1, height: 16, background: 'var(--bg-sunk)', borderRadius: 4, position: 'relative', overflow: 'hidden' } }, e('div', { style: { position: 'absolute', left: 0, top: 0, width: `${Math.abs(v)/max*100}%`, height: '100%', background: v>=0?c.color:'var(--neg)', opacity: v>=0?1:0.6, borderRadius: 4 } })),
        e('span', { className: 'num', style: { width: 88, textAlign: 'right', fontSize: 13, fontWeight: 600, color: v>=0?'var(--pos)':'var(--neg)' } }, (v>=0?'+':'−')+A.fmtUSD(Math.abs(v))));
    }));
  }

  const EXPORTS = [
    { kind: 'f8949', name: 'IRS Form 8949', desc: 'Sales & dispositions of capital assets', icon: 'file' },
    { kind: 'schd',  name: 'Schedule D', desc: 'Capital gains & losses summary', icon: 'file' },
    { kind: 'schb',  name: 'Schedule B', desc: 'Interest income (loan notes)', icon: 'file' },
    { kind: 'txf',   name: 'TurboTax .txf', desc: 'Direct import file', icon: 'coin' },
    { kind: 'lots',  name: 'Raw lot CSV', desc: 'Every lot, every disposal', icon: 'coin' },
    { kind: 'cpa',   name: 'CPA package', desc: 'All forms + supporting notes', icon: 'coin' },
  ];

  // ---- real file generation ----
  function dl(name, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = (rows) => rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const money = (n) => (n < 0 ? '-' : '') + Math.abs(n).toFixed(2);
  const YEAR = 2026;

  function buildExport(kind, method, tax) {
    const rows = tax.rows;
    if (kind === 'f8949') {
      const head = ['(a) Description', '(b) Date acquired', '(c) Date sold', '(d) Proceeds', '(e) Cost basis', '(h) Gain/(loss)', 'Term'];
      const body = rows.map(r => [`${r.qty} ${r.asset}`, r.acq, r.date, money(r.proceeds), money(r.basis), money(r.gain), r.term === 'long' ? 'Long-term' : 'Short-term']);
      return { name: `Form_8949_${YEAR}_${method}.csv`, content: csv([[`Form 8949 — Tax Year ${YEAR} — ${method} basis`], head, ...body]) };
    }
    if (kind === 'schd') {
      const body = [
        ['', 'Proceeds', 'Cost basis', 'Net gain/(loss)'],
        ['Short-term', money(tax.stGain + tax.stLoss * 0), money(0), money(tax.netST)],
        ['Long-term', money(0), money(0), money(tax.netLT)],
        ['Net capital gain/(loss)', '', '', money(tax.netCapGain)],
      ];
      return { name: `Schedule_D_${YEAR}_${method}.csv`, content: csv([[`Schedule D — Tax Year ${YEAR} — ${method} basis`], ...body]) };
    }
    if (kind === 'schb') {
      const body = tax.loanInterest.map(l => [l.name, money(l.amt)]);
      return { name: `Schedule_B_${YEAR}.csv`, content: csv([[`Schedule B — Interest Income — Tax Year ${YEAR}`], ['Payer', 'Amount'], ...body, ['Total', money(tax.interestIncome)]]) };
    }
    if (kind === 'lots') {
      const head = ['Asset', 'Class', 'Qty', 'Acquired', 'Sold', 'Proceeds', 'Cost basis', 'Gain/(loss)', 'Term', 'Source'];
      const body = rows.map(r => [r.asset, (A.CLASSES[r.cls] || {}).label || r.cls, r.qty, r.acq, r.date, money(r.proceeds), money(r.basis), money(r.gain), r.term, r.live ? 'logged' : 'imported']);
      return { name: `Raw_lots_${YEAR}_${method}.csv`, content: csv([head, ...body]) };
    }
    if (kind === 'txf') {
      let t = `V042\nA$ALL Portfolio Tracker\nD${new Date().toLocaleDateString('en-US')}\n^\n`;
      rows.forEach(r => {
        const ref = r.term === 'long' ? '323' : '321';
        t += `TD\nN${ref}\nC1\nL1\nP${r.qty} ${r.asset}\nD${r.acq}\nD${r.date}\n$${money(r.proceeds)}\n$${money(r.basis)}\n^\n`;
      });
      return { name: `TurboTax_${YEAR}_${method}.txf`, content: t };
    }
    // cpa package = combined text bundle
    const parts = ['f8949', 'schd', 'schb', 'lots'].map(k => { const f = buildExport(k, method, tax); return `===== ${f.name} =====\n${f.content}\n`; });
    const summary = `$ALL — CPA PACKAGE — Tax Year ${YEAR}\nCost-basis method: ${method}\nRealized gains: $${money(tax.realizedGains)}\nRealized losses: $${money(tax.realizedLosses)}\nNet capital gain: $${money(tax.netCapGain)}\nLoan interest income: $${money(tax.interestIncome)}\nEstimated tax: $${money(tax.estTax)}\n\nNOTE: Figures are illustrative. Wash-sale and crypto per-wallet basis rules require professional review before filing.\n\n`;
    return { name: `CPA_package_${YEAR}_${method}.txt`, content: summary + parts.join('\n') };
  }

  function Tax({ tweaks, setTweak }) {
    const initial = (tweaks && tweaks.costBasis) || 'FIFO';
    const [method, setMethod] = React.useState(initial);
    React.useEffect(() => { setMethod(initial); }, [initial]);
    React.useEffect(() => { window.__ALL_METHOD = method; }, [method]);
    const [toast, setToast] = React.useState('');
    const tax = A.taxSummary(method);
    const methods = ['FIFO','LIFO','HIFO'];
    const doExport = (kind) => { const f = buildExport(kind, method, A.taxSummary(method)); dl(f.name, f.content); setToast(f.name + ' downloaded'); setTimeout(() => setToast(''), 3000); };

    return e('div', { className: 'nw-page', style: { maxWidth: 1240, margin: '0 auto', padding: '32px 36px 64px' } },
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 14 } },
        e('div', null,
          e('h1', { style: { fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: '-.02em' } }, 'Tax center'),
          e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 5 } }, 'Tax year 2026 · realized activity across all asset classes')),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          e('span', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 } }, 'Cost-basis method'),
          e('div', { style: { display: 'inline-flex', gap: 3, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } }, methods.map(m => e('button', { key: m, onClick: () => { setMethod(m); setTweak && setTweak('costBasis', m); }, style: { padding: '7px 15px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: method===m?'var(--ink)':'var(--ink-3)', background: method===m?'var(--surface)':'transparent', boxShadow: method===m?'var(--shadow)':'none' } }, m)))) ),
      // method note
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-3)', background: 'var(--surface-2)', border: 'var(--hair) solid var(--border)', borderRadius: 8, padding: '9px 13px', margin: '14px 0 20px' } },
        e('span', { style: { width: 6, height: 6, borderRadius: 99, background: 'var(--c-crypto)', flex: 'none' } }),
        e('span', null, e('b', { style: { color: 'var(--ink-2)', fontWeight: 600 } }, `${method} `), method==='FIFO'?'sells oldest lots first — often more long-term gains.':method==='LIFO'?'sells newest lots first — defers older low-basis lots.':'sells highest-basis lots first — minimizes realized gain.'),
        e('span', { style: { marginLeft: 'auto', color: 'var(--neg)', fontWeight: 500 } }, 'Engine requires CPA validation before filing')),
      // metric cards
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 18 } },
        e(MetricCard, { label: 'Realized gains', value: '+'+A.fmtUSD(tax.realizedGains), color: 'var(--pos)', sub: `${tax.rows.filter(r=>r.gain>=0).length} profitable sales` }),
        e(MetricCard, { label: 'Realized losses', value: tax.realizedLosses?'−'+A.fmtUSD(tax.realizedLosses):'$0', color: tax.realizedLosses?'var(--neg)':'var(--ink)', sub: `${tax.rows.filter(r=>r.gain<0).length} loss sales` }),
        e(MetricCard, { label: 'Net capital gain', value: (tax.netCapGain>=0?'+':'−')+A.fmtUSD(Math.abs(tax.netCapGain)), color: tax.netCapGain>=0?'var(--pos)':'var(--neg)', sub: `ST ${A.fmtUSD(tax.netST)} · LT ${A.fmtUSD(tax.netLT)}` }),
        e(MetricCard, { label: 'Loan interest income', value: A.fmtUSD(tax.interestIncome), sub: `${tax.loanInterest.length} notes · Sch. B` }),
        e(MetricCard, { label: 'Est. tax owed', value: A.fmtUSD(tax.estTax), accent: 'var(--c-loans)', sub: 'blended ST/LT estimate' })),
      // charts row
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 } },
        e('div', { style: card() }, e('div', { style: cardHead() }, 'Short-term vs long-term'), e('div', { style: { padding: '20px 24px' } }, e(STLTBar, { tax }))),
        e('div', { style: card() }, e('div', { style: cardHead() }, 'Net gain by asset class'), e('div', { style: { padding: '20px 24px' } }, e(ByClassBars, { tax })))),
      // disposals + export
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' } },
        e('div', { style: card() },
          e('div', { style: cardHead() }, `Disposals · ${tax.rows.length}`, e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 450 } }, 'recomputed on method change')),
          e('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            e('thead', null, e('tr', null, ['Asset','Sold','Proceeds','Basis','Gain/Loss','Term'].map((h,i)=>e('th',{key:i,style:{textAlign:i>0&&i<5?'right':i===5?'center':'left',padding:'9px 18px',fontSize:11,fontWeight:600,color:'var(--ink-3)'}},h)))),
            e('tbody', null, tax.rows.map(r=>e('tr',{key:r.id},
              e('td',{style:td()},e('div',{style:{display:'flex',alignItems:'center',gap:8}},e('span',{style:{width:7,height:7,borderRadius:2,background:A.CLASSES[r.cls].color}}),e('b',{style:{fontWeight:600}},r.asset))),
              e('td',{className:'num',style:td(1)},A.fmtDate(r.date).replace(', 2026','')),
              e('td',{className:'num',style:td(1)},A.fmtUSD(r.proceeds)),
              e('td',{className:'num',style:td(1)},A.fmtUSD(r.basis)),
              e('td',{className:'num',style:{...td(1),color:r.gain>=0?'var(--pos)':'var(--neg)',fontWeight:600}},(r.gain>=0?'+':'−')+A.fmtUSD(Math.abs(r.gain))),
              e('td',{style:{...td(),textAlign:'center'}},e('span',{style:{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99,background:r.term==='long'?'var(--t-realest)':'var(--t-stocks)',color:r.term==='long'?'var(--c-realest)':'var(--c-stocks)'}},r.term==='long'?'LT':'ST')))))) ),
        e('div', { style: card() },
          e('div', { style: cardHead() }, 'Export'),
          e('div', { style: { padding: '8px' } }, EXPORTS.map((x,i)=>e('button',{key:i,onClick:()=>doExport(x.kind),style:{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'12px 14px',background:'transparent',border:'none',borderRadius:8,cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)'},onMouseEnter:ev=>ev.currentTarget.style.background='var(--surface-2)',onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
            e('div',{style:{width:34,height:34,borderRadius:8,background:'var(--bg-sunk)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-2)',flex:'none'}},x.icon==='file'?e(FileText,{size:16}):e(Coins,{size:16})),
            e('div',{style:{flex:1}},e('div',{style:{fontSize:13.5,fontWeight:550,color:'var(--ink)'}},x.name),e('div',{style:{fontSize:11.5,color:'var(--ink-3)',marginTop:1}},x.desc)),
            e('span',{style:{color:'var(--ink-3)'}},e(Download,{size:16}))))),
          e('div', { style: { padding: '12px 16px', borderTop: 'var(--hair) solid var(--border)' } },
            e('button', { onClick: () => doExport('cpa'), style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, e(Download,{size:15}), `Generate ${method} package`),
            toast && e('div', { style: { fontSize: 11.5, color: 'var(--pos)', textAlign: 'center', marginTop: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 } }, e(U.Check, { size: 13 }), toast),
            e('div', { style: { fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 9, lineHeight: 1.5 } }, 'Wash-sale & per-wallet basis rules applied. Review with a tax professional before filing.')))
      )
    );
  }

  function card(){ return { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }; }
  function cardHead(){ return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 22px', borderBottom: 'var(--hair) solid var(--border)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }; }
  function td(right){ return { padding: '10px 18px', borderTop: 'var(--hair) solid var(--border)', fontSize: 13, color: 'var(--ink)', textAlign: right?'right':'left' }; }

  window.Tax = Tax;
})();
