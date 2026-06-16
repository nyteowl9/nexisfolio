/* $ALL — Asset detail drill-down (market positions + loans) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Area, Badge, LiveChip, Bolt, Back, ArrowUp, ArrowDown } = U;
  const e = React.createElement;

  function Stat({ label, value, sub, color }) {
    return e('div', { style: { padding: '16px 20px' } },
      e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 } }, label),
      e('div', { className: 'num', style: { fontSize: 20, fontWeight: 600, color: color || 'var(--ink)', letterSpacing: '-.01em' } }, value),
      sub && e('div', { className: 'num', style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 4 } }, sub));
  }

  function genPriceHistory(price, n = 80) {
    let seed = Math.round(price * 7) & 0x7fffffff;
    const rnd = () => { seed = (seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const out = []; let v = price * 0.7;
    for (let i=0;i<n;i++){ v = v + (price - v)*0.04 + (rnd()-0.48)*price*0.02; out.push(Math.max(price*0.4, v)); }
    out[n-1] = price; return out;
  }

  function MarketDetail({ p }) {
    const value = A.mv(p), basis = A.costBasis(p), unreal = value - basis, unrealPct = unreal/basis*100;
    const chg = p.live && p.prev ? (p.price-p.prev)/p.prev*100 : null;
    // realized from disposals of this asset
    const method = (window.__ALL_METHOD) || 'FIFO';
    const tx = A.taxSummary(method).rows.filter(r => r.asset === p.ticker);
    const realized = tx.reduce((s,r)=>s+r.gain,0);
    const hist = genPriceHistory(A.unitPriced(p) ? p.price : value/ (p.qty||1));
    const oldestLot = p.lots ? p.lots.reduce((a,b)=> new Date(a.date)<new Date(b.date)?a:b) : null;
    const holdY = oldestLot ? A.holdYears(oldestLot.date) : (p.valued ? A.holdYears(p.lots[0].date) : 0);

    return e('div', null,
      // price chart card
      e('div', { style: card(), }, 
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 6px' } },
          e('div', null,
            e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 } }, p.live && A.unitPriced(p) ? 'Market price' : 'Current value'),
            e('div', { className: 'num', style: { fontSize: 28, fontWeight: 650, letterSpacing: '-.02em', marginTop: 3 } }, A.unitPriced(p) ? A.fmtUSD(p.price, {full:true,cents:true}) : A.fmtUSD(value, {full:true})),
            chg!=null && e('div', { className: 'num', style: { fontSize: 13, fontWeight: 600, color: chg>=0?'var(--pos)':'var(--neg)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 } }, e(chg>=0?ArrowUp:ArrowDown,{size:13}), A.fmtPct(chg,true), ' today')),
          e('div', { style: { display: 'inline-flex', gap: 4, background: 'var(--bg-sunk)', padding: 3, borderRadius: 8 } }, ['1W','1M','1Y','ALL'].map((r,i)=>e('span',{key:r,style:{padding:'4px 12px',fontSize:12,fontWeight:550,borderRadius:6,color:i===2?'var(--ink)':'var(--ink-3)',background:i===2?'var(--surface)':'transparent',boxShadow:i===2?'var(--shadow)':'none'}},r)))),
        e('div', { style: { padding: '8px 12px 14px' } }, e(Area, { points: hist, width: 1080, height: 150, color: unreal>=0?'var(--pos)':'var(--neg)', strokeWidth: 2 }))),
      // P/L stat grid
      e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', ...card(), marginTop: 16 } },
        e(Stat, { label: 'Market value', value: A.fmtUSD(value), sub: p.qty ? `${A.fmtQty(p.qty)} units` : null }),
        e('div', { style: divL() }, e(Stat, { label: 'Cost basis', value: A.fmtUSD(basis), sub: p.lots ? `${p.lots.length} lot${p.lots.length>1?'s':''}` : null })),
        e('div', { style: divL() }, e(Stat, { label: 'Unrealized P/L', value: (unreal>=0?'+':'−')+A.fmtUSD(Math.abs(unreal)), sub: A.fmtPct(unrealPct,true), color: unreal>=0?'var(--pos)':'var(--neg)' })),
        e('div', { style: divL() }, e(Stat, { label: 'Realized P/L (2026)', value: realized? ((realized>=0?'+':'−')+A.fmtUSD(Math.abs(realized))) : '$0', sub: tx.length?`${tx.length} sale${tx.length>1?'s':''}`:'no sales', color: realized>0?'var(--pos)':realized<0?'var(--neg)':'var(--ink)' }))),
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' } },
        // lots table
        e('div', { style: card() },
          e('div', { style: cardHead() }, 'Tax lots', e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 450 } }, `${method} basis`)),
          e('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            e('thead', null, e('tr', null, ['Acquired','Qty','Price','Cost basis','Holding'].map((h,i)=>e('th',{key:i,style:{textAlign:i>0?'right':'left',padding:'8px 18px',fontSize:11,fontWeight:600,color:'var(--ink-3)'}},h)))),
            e('tbody', null, (p.lots||[]).map((l,i)=>{
              const ly = A.holdYears(l.date);
              return e('tr', { key: i },
                e('td', { style: td() }, A.fmtDate(l.date)),
                e('td', { className: 'num', style: td(1) }, A.fmtQty(l.qty)),
                e('td', { className: 'num', style: td(1) }, A.fmtUSD(l.price,{full:true,cents:l.price<1000})),
                e('td', { className: 'num', style: td(1) }, A.fmtUSD(l.basis)),
                e('td', { style: td(1) }, e('span', { style: { fontSize: 11.5, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: ly>1?'var(--t-realest)':'var(--t-crypto)', color: ly>1?'var(--c-realest)':'var(--c-crypto)' } }, ly>1?`LT · ${ly.toFixed(1)}y`:`ST · ${Math.round(ly*12)}mo`)));
            }))) ),
        // holding facts
        e('div', { style: card() },
          e('div', { style: cardHead() }, 'Position facts'),
          e('div', { style: { padding: '6px 0' } }, [
            ['Account', p.account],
            ['First acquired', oldestLot ? A.fmtDate(oldestLot.date) : '—'],
            ['Holding period', `${holdY.toFixed(1)} years`],
            ['Tax treatment', holdY>1?'Long-term':'Short-term'],
            ['Pricing', p.live ? 'Live (API)' : 'Manual'],
            ['Avg cost', p.qty ? A.fmtUSD(basis/p.qty,{full:true,cents:true}) : '—'],
          ].map(([k,v],i)=>e('div',{key:i,style:{display:'flex',justifyContent:'space-between',padding:'10px 22px',borderTop:i?'var(--hair) solid var(--border)':'none'}},
            e('span',{style:{fontSize:13,color:'var(--ink-3)'}},k), e('span',{className:'num',style:{fontSize:13,fontWeight:550,color:'var(--ink)'}},v)))))
      )
    );
  }

  function LoanDetail({ p }) {
    const L = p.loan;
    const paidPrincipal = L.principal - L.balance;
    const pctPaid = paidPrincipal / L.principal * 100;
    // build a short amortization schedule around current point
    const r = L.rate/100/12;
    const schedule = [];
    let bal = L.balance;
    for (let i=0;i<6;i++){
      const interest = bal * r;
      const principal = L.nextAmt - interest;
      const start = bal; bal = Math.max(0, bal - principal);
      const d = new Date(L.nextDue); d.setMonth(d.getMonth()+i);
      schedule.push({ n: L.paymentsMade+i+1, date: d.toISOString().slice(0,10), payment: L.nextAmt, interest, principal, balance: bal });
    }
    return e('div', null,
      e('div', { className: 'nw-stack-2', style: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, alignItems: 'start' } },
        // next payment hero
        e('div', { style: { ...card(), padding: '22px 24px', background: 'var(--surface)' } },
          e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 6 } }, 'Next payment due'),
          e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12 } },
            e('div', { className: 'num', style: { fontSize: 30, fontWeight: 650, letterSpacing: '-.02em' } }, A.fmtUSD(L.nextAmt,{full:true,cents:true})),
            e('div', { style: { fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 } }, A.fmtDate(L.nextDue))),
          e('div', { style: { marginTop: 18 } },
            e('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 } }, e('span',null,`${A.fmtUSD(paidPrincipal)} repaid`), e('span',null,`${pctPaid.toFixed(0)}% of principal`)),
            e('div', { style: { height: 8, borderRadius: 99, background: 'var(--bg-sunk)', overflow: 'hidden' } }, e('div', { style: { width: `${pctPaid}%`, height: '100%', background: 'var(--c-loans)', borderRadius: 99 } }))),
          e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 18, borderTop: 'var(--hair) solid var(--border)' } },
            [['Original principal',A.fmtUSD(L.principal)],['Outstanding balance',A.fmtUSD(L.balance)],['Interest rate',`${L.rate}% APR`],['Term',`${L.termMonths/12} years`],['Payments made',`${L.paymentsMade} of ${L.termMonths}`],['Interest YTD',A.fmtUSD(L.interestYtd)]].map(([k,v],i)=>
              e('div',{key:i,style:{padding:'12px 0',borderTop:i>1?'var(--hair) solid var(--border)':'none'}},
                e('div',{style:{fontSize:11.5,color:'var(--ink-3)',marginBottom:4}},k), e('div',{className:'num',style:{fontSize:15,fontWeight:600}},v))))),
        // facts
        e('div', { style: card() },
          e('div', { style: cardHead() }, 'Loan terms'),
          e('div', { style: { padding: '4px 0' } }, [
            ['Borrower', p.name.replace('Loan · ','').replace('Personal Loan · ','').replace('Seller-financed Note · ','')],
            ['Originated', A.fmtDate(L.originated)],
            ['Maturity', A.fmtDate(new Date(new Date(L.originated).setMonth(new Date(L.originated).getMonth()+L.termMonths)).toISOString().slice(0,10))],
            ['Monthly payment', A.fmtUSD(L.nextAmt,{full:true,cents:true})],
            ['Total interest (life)', A.fmtUSD(L.nextAmt*L.termMonths - L.principal)],
            ['Status', 'Current · on schedule'],
          ].map(([k,v],i)=>e('div',{key:i,style:{display:'flex',justifyContent:'space-between',padding:'11px 22px',borderTop:i?'var(--hair) solid var(--border)':'none'}},
            e('span',{style:{fontSize:13,color:'var(--ink-3)'}},k), e('span',{className:'num',style:{fontSize:13,fontWeight:550,color:i===5?'var(--pos)':'var(--ink)'}},v))))),
      // amortization schedule
      e('div', { style: { ...card(), marginTop: 16 } },
        e('div', { style: cardHead() }, 'Amortization schedule', e('span', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 450 } }, 'next 6 payments')),
        e('table', { style: { width: '100%', borderCollapse: 'collapse' } },
          e('thead', null, e('tr', null, ['#','Date','Payment','Principal','Interest','Balance'].map((h,i)=>e('th',{key:i,style:{textAlign:i>1?'right':'left',padding:'9px 22px',fontSize:11,fontWeight:600,color:'var(--ink-3)'}},h)))),
          e('tbody', null, schedule.map((s,i)=>e('tr',{key:i,style:{background:i===0?'var(--surface-2)':'transparent'}},
            e('td',{className:'num',style:td()},s.n),
            e('td',{style:td()},A.fmtDate(s.date)+(i===0?'  · next':'')),
            e('td',{className:'num',style:td(1)},A.fmtUSD(s.payment,{full:true,cents:true})),
            e('td',{className:'num',style:{...td(1),color:'var(--c-loans)',fontWeight:600}},A.fmtUSD(s.principal,{full:true,cents:true})),
            e('td',{className:'num',style:td(1)},A.fmtUSD(s.interest,{full:true,cents:true})),
            e('td',{className:'num',style:{...td(1),fontWeight:600}},A.fmtUSD(s.balance,{full:true})))))))
    ));
  }

  function Detail({ assetId, navigate }) {
    const p = A.POSITIONS.find(x => x.id === assetId) || A.POSITIONS[0];
    const c = A.CLASSES[p.cls];
    const value = A.mv(p);
    return e('div', { className: 'nw-page', style: { maxWidth: 1240, margin: '0 auto', padding: '24px 36px 64px' } },
      e('button', { onClick: () => navigate('overview'), style: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '4px 0', marginBottom: 16, fontFamily: 'var(--font-sans)' } }, e(Back,{size:16}), 'Back to overview'),
      e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 16 } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
          e(U.AssetIcon, { cls: p.cls, ticker: p.ticker, name: p.name, size: 52, radius: 12 }),
          e('div', null,
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } }, e('h1', { style: { fontSize: 22, fontWeight: 650, margin: 0, letterSpacing: '-.02em' } }, p.name), e(Badge, { cls: p.cls })),
            e('div', { style: { marginTop: 5 } }, e(LiveChip, { live: p.live, updated: p.updated, valued: p.valued })))),
        e('div', { style: { textAlign: 'right' } },
          e('div', { className: 'num', style: { fontSize: 26, fontWeight: 650, letterSpacing: '-.02em' } }, A.fmtUSD(value, { full: true })),
          e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 } }, p.cls==='loans'?'outstanding balance':'current value'))),
      p.cls==='loans' ? e(LoanDetail, { p }) : (p.cls==='private' && p.subcat==='Trading Cards' && window.CardsDetail) ? e(window.CardsDetail, { p, navigate }) : e(MarketDetail, { p })
    );
  }

  function card(){ return { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }; }
  function cardHead(){ return { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 22px', borderBottom: 'var(--hair) solid var(--border)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }; }
  function divL(){ return { borderLeft: 'var(--hair) solid var(--border)' }; }
  function td(right){ return { padding: '10px 18px', borderTop: 'var(--hair) solid var(--border)', fontSize: 13, color: 'var(--ink)', textAlign: right?'right':'left' }; }

  window.Detail = Detail;
})();
