/* $ALL — Connections screen (interactive: sync states, wallet-add, reauth) */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Bolt, Check, Link, Wallet, Building, Refresh, Plus, Clock } = U;
  const e = React.createElement;

  const SEED = [
    { provider: 'Fidelity', via: 'Plaid', type: 'brokerage', status: 'live', synced: '2 min ago', accounts: 1, value: 716730, cls: 'stocks' },
    { provider: 'Charles Schwab', via: 'SnapTrade', type: 'brokerage', status: 'live', synced: '2 min ago', accounts: 2, value: 690000, cls: 'stocks' },
    { provider: 'Ledger (BTC)', via: 'xpub', type: 'wallet', status: 'live', synced: '8 sec ago', accounts: 1, value: 855250, cls: 'crypto' },
    { provider: 'MetaMask', via: '0x7a3f…b21c', type: 'wallet', status: 'live', synced: '8 sec ago', accounts: 1, value: 632160, cls: 'crypto' },
    { provider: 'Phantom', via: 'SOL · 9xQe…4Rd2', type: 'wallet', status: 'live', synced: '12 sec ago', accounts: 1, value: 371520, cls: 'crypto' },
    { provider: 'Bank of America', via: 'Plaid', type: 'bank', status: 'live', synced: '5 min ago', accounts: 1, value: 84000, cls: 'cash' },
    { provider: 'Marcus + Vanguard', via: 'Plaid', type: 'bank', status: 'attention', synced: '2 days ago', accounts: 2, value: 455000, cls: 'cash' },
    { provider: 'Real estate (3)', via: 'Manual', type: 'manual', status: 'manual', synced: 'Mar 15', accounts: 3, value: 3075000, cls: 'realest' },
    { provider: 'Private & collectibles (4)', via: 'Manual', type: 'manual', status: 'manual', synced: 'Mar 1', accounts: 4, value: 803000, cls: 'private' },
    { provider: 'Loan notes (3)', via: 'Manual', type: 'manual', status: 'manual', synced: 'Jun 1', accounts: 3, value: 358900, cls: 'loans' },
  ].map((c, i) => ({ ...c, id: 'c' + i }));

  function StatusChip({ status, synced }) {
    if (status === 'syncing') return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 } }, e('span', { style: { display: 'inline-flex', animation: 'allspin 0.7s linear infinite' } }, e(Refresh, { size: 12 })), 'syncing…');
    if (status === 'live') return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--pos)', fontWeight: 500 } }, e(Bolt,{size:12}), synced);
    if (status === 'attention') return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--c-crypto)', fontWeight: 500 } }, e('span',{style:{width:6,height:6,borderRadius:99,background:'var(--c-crypto)'}}), `needs reauth · ${synced}`);
    return e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)', fontWeight: 450 } }, e(Clock,{size:12}), `valued ${synced}`);
  }

  function AddCard({ icon, title, desc, cta, accent, onClick, busy }) {
    return e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 } },
      e('div', { style: { width: 40, height: 40, borderRadius: 10, background: `var(--${accent})`, color: A.CLASSES[accent.replace('t-','')]?.color || 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, icon),
      e('div', null, e('div', { style: { fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' } }, title), e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 } }, desc)),
      e('button', { onClick, disabled: busy, style: { marginTop: 'auto', padding: '9px', background: 'var(--bg-sunk)', color: 'var(--ink)', border: 'var(--hair) solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: busy?'default':'pointer', fontFamily: 'var(--font-sans)', opacity: busy?0.6:1 } }, busy ? 'Opening…' : cta));
  }

  function Connections() {
    const [conns, setConns] = React.useState(SEED.map(c => ({ ...c })));
    const [addr, setAddr] = React.useState('');
    const [toast, setToast] = React.useState('');
    const [busy, setBusy] = React.useState('');
    const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
    const setStatus = (id, patch) => setConns(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));

    const syncOne = (id) => {
      const c = conns.find(x => x.id === id);
      if (!c || c.type === 'manual' || c.status === 'syncing') return;
      setStatus(id, { status: 'syncing' });
      setTimeout(() => setStatus(id, { status: 'live', synced: 'just now' }), 850 + Math.random() * 500);
    };
    const syncAll = () => {
      const ids = conns.filter(c => c.type !== 'manual').map(c => c.id);
      ids.forEach(id => setStatus(id, { status: 'syncing' }));
      ids.forEach((id, i) => setTimeout(() => setStatus(id, { status: 'live', synced: 'just now' }), 700 + i * 180 + Math.random() * 300));
      flash('Syncing all live connections…');
    };
    const addWallet = () => {
      const a = addr.trim(); if (!a) return;
      const short = a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
      const chain = a.startsWith('0x') ? 'ETH' : a.startsWith('bc1') || a.startsWith('xpub') ? 'BTC' : 'SOL';
      const id = 'w' + Date.now();
      setConns(cs => [...cs, { id, provider: `${chain} wallet`, via: short, type: 'wallet', status: 'syncing', synced: '', accounts: 1, value: 0, cls: 'crypto' }]);
      setAddr('');
      setTimeout(() => setStatus(id, { status: 'live', synced: 'just now', value: Math.round(20000 + Math.random() * 180000) }), 1100);
      flash(`Watching ${short} (read-only)`);
    };
    const reauth = (id) => { setStatus(id, { status: 'syncing' }); setTimeout(() => setStatus(id, { status: 'live', synced: 'just now' }), 1000); flash('Reconnected · credentials refreshed'); };
    const connect = (label) => { setBusy(label); setTimeout(() => { setBusy(''); flash(`${label} link would open here — wired in the real build`); }, 900); };

    const total = conns.reduce((s,c)=>s+c.value,0);
    const live = conns.filter(c=>c.status==='live').length;
    const anySync = conns.some(c => c.status === 'syncing');

    return e('div', { className: 'nw-page', style: { maxWidth: 1240, margin: '0 auto', padding: '32px 36px 64px' } },
      e('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 } },
        e('div', null, e('h1', { style: { fontSize: 26, fontWeight: 650, margin: 0, letterSpacing: '-.02em' } }, 'Connections'),
          e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 5 } }, `${conns.length} sources · ${live} syncing live · ${A.fmtUSD(total)} tracked`)),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          toast && e('span', { style: { fontSize: 12, color: 'var(--pos)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 } }, e(Check, { size: 13 }), toast),
          e('button', { onClick: syncAll, disabled: anySync, style: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: anySync?'default':'pointer', fontFamily: 'var(--font-sans)', opacity: anySync?0.6:1 } }, e('span', { style: { display: 'inline-flex', animation: anySync?'allspin 0.7s linear infinite':'none' } }, e(Refresh,{size:15})), anySync?'Syncing…':'Sync all'))),
      // add-new row
      e('div', { className: 'nw-stack-3', style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 } },
        e(AddCard, { icon: e(Building,{size:19}), title: 'Brokerage', desc: 'Plaid or SnapTrade — Fidelity, Schwab, Robinhood, IBKR, and 12,000+ institutions.', cta: 'Connect via Plaid / SnapTrade', accent: 't-stocks', onClick: () => connect('Plaid / SnapTrade'), busy: busy==='Plaid / SnapTrade' }),
        // wallet input card (interactive — read-only address)
        e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 } },
          e('div', { style: { width: 40, height: 40, borderRadius: 10, background: 'var(--t-crypto)', color: 'var(--c-crypto)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, e(Wallet,{size:19})),
          e('div', null, e('div', { style: { fontSize: 14.5, fontWeight: 600 } }, 'Crypto wallet'), e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 } }, 'Paste an address or xpub — BTC, ETH, SOL & EVM chains, read-only. No keys, no signing.')),
          e('div', { style: { display: 'flex', gap: 8 } },
            e('input', { value: addr, onChange: ev=>setAddr(ev.target.value), onKeyDown: ev => { if (ev.key === 'Enter') addWallet(); }, placeholder: '0x… / bc1… / xpub…', style: { flex: 1, padding: '9px 11px', border: 'var(--hair) solid var(--border-strong)', borderRadius: 8, fontSize: 12.5, fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', minWidth: 0 } }),
            e('button', { onClick: addWallet, style: { padding: '9px 13px', background: 'var(--ink)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Add'))),
        e(AddCard, { icon: e(Plus,{size:19}), title: 'Manual asset', desc: 'Real estate, private equity, collectibles, or a loan you made — value it yourself.', cta: 'Add manual entry', accent: 't-private', onClick: () => { if (window.__openAddPosition) window.__openAddPosition(); }, busy: false })),
      // connections table
      e('div', { style: { background: 'var(--surface)', border: 'var(--hair) solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' } },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', borderBottom: 'var(--hair) solid var(--border)' } }, e('span', { style: { fontSize: 14, fontWeight: 600 } }, 'Linked sources'), e('span', { style: { fontSize: 12, color: 'var(--ink-3)' } }, 'sync status · last updated')),
        conns.map((c,i)=>{
          const cl = A.CLASSES[c.cls];
          return e('div', { key: c.id, className: 'nw-conn', style: { display: 'grid', gridTemplateColumns: '1fr 150px 150px 130px 36px', alignItems: 'center', gap: 12, padding: '14px 22px', borderTop: i?'var(--hair) solid var(--border)':'none' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 13 } },
              e('div', { style: { width: 36, height: 36, borderRadius: 9, background: `var(--${cl.tint})`, color: cl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, c.type==='wallet'?e(Wallet,{size:17}):c.type==='manual'?e(Building,{size:17}):c.type==='bank'?e(U.Coins,{size:17}):e(Building,{size:17})),
              e('div', null, e('div', { style: { fontSize: 14, fontWeight: 600, color: 'var(--ink)' } }, c.provider), e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5 } }, c.via!=='Manual'&&c.type!=='wallet'?e(Link,{size:11}):null, `${c.via} · ${c.accounts} account${c.accounts>1?'s':''}`))),
            e('div', null, e('span', { style: { fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', background: `var(--${cl.tint})`, padding: '3px 9px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6 } }, e('span',{style:{width:6,height:6,borderRadius:99,background:cl.color}}), cl.label.split(' ')[0])),
            e('div', null, e(StatusChip, { status: c.status, synced: c.synced })),
            e('div', { className: 'num', style: { textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--ink)' } }, A.fmtUSD(c.value)),
            e('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
              c.type==='manual' ? null :
              c.status==='attention'
                ? e('button', { onClick: () => reauth(c.id), title: 'Reconnect', style: iconBtn('var(--c-crypto)') }, e(Refresh,{size:15}))
                : e('button', { onClick: () => syncOne(c.id), title: 'Sync now', disabled: c.status==='syncing', style: iconBtn('var(--ink-3)') }, e('span', { style: { display: 'inline-flex', animation: c.status==='syncing'?'allspin 0.7s linear infinite':'none' } }, e(Refresh,{size:15})))));
        }))
    );
  }
  function iconBtn(color) { return { background: 'transparent', border: 'none', cursor: 'pointer', color, display: 'flex', padding: 4, borderRadius: 6, fontFamily: 'var(--font-sans)' }; }

  window.Connections = Connections;
})();
