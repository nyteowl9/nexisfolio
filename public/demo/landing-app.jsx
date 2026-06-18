/* NEST WATCH — auth + onboarding + router */
(function () {
  const e = React.createElement;
  const { useState } = React;
  const { btnDark, btnGhost, Wordmark } = window.NW_helpers;
  const DASH = 'app.html';

  const input = { width: '100%', padding: '12px 13px', border: 'var(--hair) solid var(--border-strong)', borderRadius: 10, fontSize: 14.5, fontFamily: 'var(--font-sans)', background: 'var(--surface)', color: 'var(--ink)', boxSizing: 'border-box' };
  const Field = ({ label, children }) => e('label', { style: { display: 'block', marginBottom: 14, textAlign: 'left' } },
    e('div', { style: { fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 6 } }, label), children);

  function GBtn({ onClick, logo, label }) {
    return e('button', { onClick, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', background: 'var(--surface)', color: 'var(--ink)', border: 'var(--hair) solid var(--border-strong)', borderRadius: 10, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, logo, label);
  }
  const googleLogo = e('svg', { width: 17, height: 17, viewBox: '0 0 48 48' },
    e('path', { fill: '#EA4335', d: 'M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.7 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z' }),
    e('path', { fill: '#4285F4', d: 'M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7l7.2 5.6c4.2-3.9 6.2-9.6 6.2-17.1z' }),
    e('path', { fill: '#FBBC05', d: 'M10.4 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.4l7.8-6.1z' }),
    e('path', { fill: '#34A853', d: 'M24 48c6.1 0 11.3-2 15-5.5l-7.2-5.6c-2 1.4-4.6 2.2-7.8 2.2-6.3 0-11.7-3.7-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z' }));
  const appleLogo = e('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor' },
    e('path', { d: 'M16.4 12.9c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.9c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.2 6c.6-.8 1.1-1.9.9-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.9-1.3z' }));

  // ============ AUTH ============
  function Auth({ mode, setMode, onSignup, onSignin, onHome }) {
    const isUp = mode === 'signup';
    return e('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' } },
      e('div', { style: { padding: '22px 28px' }, onClick: onHome }, e('div', { style: { cursor: 'pointer', display: 'inline-block' } }, e(Wordmark, null))),
      e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' } },
        e('div', { style: { width: 380, maxWidth: '100%' } },
          e('h1', { style: { fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', margin: 0, textAlign: 'center' } }, isUp ? 'Create your account' : 'Welcome back'),
          e('p', { style: { fontSize: 14.5, color: 'var(--ink-3)', textAlign: 'center', margin: '8px 0 26px' } }, isUp ? 'Start tracking everything in minutes.' : 'Sign in to your portfolio.'),
          e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 } },
            e(GBtn, { onClick: isUp ? onSignup : onSignin, logo: googleLogo, label: 'Continue with Google' }),
            e(GBtn, { onClick: isUp ? onSignup : onSignin, logo: appleLogo, label: 'Continue with Apple' })),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 18px', color: 'var(--ink-3)', fontSize: 12 } },
            e('div', { style: { flex: 1, height: 1, background: 'var(--border)' } }), 'or', e('div', { style: { flex: 1, height: 1, background: 'var(--border)' } })),
          e(Field, { label: 'Email' }, e('input', { type: 'email', placeholder: 'you@example.com', style: input })),
          e(Field, { label: 'Password' }, e('input', { type: 'password', placeholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', style: input })),
          e('button', { onClick: isUp ? onSignup : onSignin, style: { ...btnDark, width: '100%', marginTop: 6, padding: '13px' } }, isUp ? 'Create account' : 'Sign in'),
          e('div', { style: { textAlign: 'center', fontSize: 13.5, color: 'var(--ink-3)', marginTop: 20 } },
            isUp ? 'Already have an account? ' : 'New to Nexis Folio? ',
            e('button', { onClick: () => setMode(isUp ? 'signin' : 'signup'), style: { background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5 } }, isUp ? 'Sign in' : 'Create one')))));
  }

  // ============ ONBOARDING ============
  const lot = (qty, price, date, account) => ({ qty, price, date, account, basis: qty * price });
  function Onboarding({ onDone }) {
    const [step, setStep] = useState(0);
    const [added, setAdded] = useState([]);
    const [brokers, setBrokers] = useState({});       // name -> 'connecting'|'done'
    const [addr, setAddr] = useState('');
    const [home, setHome] = useState('');
    const [homeBasis, setHomeBasis] = useState('');
    const [homeYear, setHomeYear] = useState('');
    const push = (pos) => setAdded(a => [...a, pos]);

    const connectBroker = (name) => {
      if (brokers[name]) return;
      setBrokers(b => ({ ...b, [name]: 'connecting' }));
      setTimeout(() => {
        setBrokers(b => ({ ...b, [name]: 'done' }));
        push({ id: 'ob-aapl-' + name, cls: 'stocks', ticker: 'AAPL', name: 'Apple Inc.', live: true, qty: 40, price: 212.4, prev: 210.9, account: name, updated: 0, lots: [lot(40, 168.5, '2023-05-12', name)] });
        push({ id: 'ob-voo-' + name, cls: 'stocks', ticker: 'VOO', name: 'Vanguard S&P 500', live: true, qty: 120, price: 512, prev: 509, account: name, updated: 0, lots: [lot(120, 405, '2022-08-01', name)] });
      }, 1100);
    };
    const addWallet = () => {
      const a = addr.trim(); if (!a) return;
      const chain = a.startsWith('0x') ? 'ETH' : a.startsWith('bc1') || a.startsWith('xpub') ? 'BTC' : 'SOL';
      const short = a.length > 12 ? a.slice(0, 6) + '\u2026' + a.slice(-4) : a;
      const m = { ETH: { t: 'ETH', n: 'Ethereum', p: 3512, pv: 3488, q: 2.4, c: 1800 }, BTC: { t: 'BTC', n: 'Bitcoin', p: 68420, pv: 67980, q: 0.4, c: 41000 }, SOL: { t: 'SOL', n: 'Solana', p: 154.8, pv: 159.2, q: 60, c: 90 } }[chain];
      push({ id: 'ob-w-' + Date.now(), cls: 'crypto', ticker: m.t, name: m.n, live: true, qty: m.q, price: m.p, prev: m.pv, account: short, updated: 0, lots: [lot(m.q, m.c, '2024-03-01', short)] });
      setAddr('');
    };
    const addHome = () => {
      const v = parseFloat(home) || 0; if (!v) return;
      const b = parseFloat(homeBasis) || v;
      const yr = (homeYear && /^\d{4}$/.test(homeYear)) ? homeYear : '2024';
      push({ id: 'ob-home' + Date.now(), cls: 'realest', ticker: '\u2014', name: 'Primary Residence', live: false, value: v, basis: b, valued: '2026-06-15', qty: 1, account: 'Owned', lots: [lot(1, b, yr + '-06-01', 'Deed')] });
      setHome(''); setHomeBasis(''); setHomeYear('');
    };

    const steps = [
      { key: 'broker', title: 'Connect a brokerage', sub: 'Pull in your stocks automatically through Plaid or SnapTrade. View-only \u2014 we can never trade.' },
      { key: 'wallet', title: 'Add a crypto wallet', sub: 'Paste a public address or xpub. Read-only, no private keys, no signing.' },
      { key: 'manual', title: 'Add an asset by hand', sub: 'Your home, a collection, a loan you made \u2014 anything markets don\u2019t price for you.' },
      { key: 'done', title: 'You\u2019re all set.', sub: '' },
    ];
    const s = steps[step];
    const last = step === steps.length - 1;
    const count = added.length;

    const body = () => {
      if (s.key === 'broker') return e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        ['Fidelity', 'Charles Schwab', 'Robinhood', 'Interactive Brokers'].map(name => {
          const st = brokers[name];
          return e('button', { key: name, onClick: () => connectBroker(name), style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: `1px solid ${st === 'done' ? 'var(--pos)' : 'var(--border-strong)'}`, background: st === 'done' ? 'color-mix(in oklab, var(--pos) 8%, var(--surface))' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' } },
            name, e('span', { style: { fontSize: 12, fontWeight: 600, color: st === 'done' ? 'var(--pos)' : 'var(--ink-3)' } }, st === 'connecting' ? 'Connecting\u2026' : st === 'done' ? '\u2713 Linked' : 'Connect'));
        }));
      if (s.key === 'wallet') return e('div', null,
        e('div', { style: { display: 'flex', gap: 8 } },
          e('input', { value: addr, onChange: ev => setAddr(ev.target.value), onKeyDown: ev => { if (ev.key === 'Enter') addWallet(); }, placeholder: '0x\u2026 / bc1\u2026 / xpub\u2026', style: input }),
          e('button', { onClick: addWallet, style: { ...btnDark, padding: '0 22px' } }, 'Add')),
        e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 8 } }, 'Add as many wallets as you like — one address at a time.'),
        added.filter(a => a.cls === 'crypto').map(a => e('div', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13.5, color: 'var(--ink-2)' } }, e('span', { style: { width: 7, height: 7, borderRadius: 99, background: '#E0992B' } }), `${a.name} \u00b7 ${a.account} \u00b7 watching`)));
      if (s.key === 'manual') return e('div', null,
        e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
          e('input', { value: home, onChange: ev => setHome(ev.target.value), type: 'number', placeholder: 'Current value, e.g. 243000', style: input }),
          e('input', { value: homeBasis, onChange: ev => setHomeBasis(ev.target.value), type: 'number', placeholder: 'Cost basis (what you paid)', style: input })),
        e('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          e('input', { value: homeYear, onChange: ev => setHomeYear(ev.target.value), onKeyDown: ev => { if (ev.key === 'Enter') addHome(); }, type: 'number', placeholder: 'Year purchased, e.g. 2019', style: input }),
          e('button', { onClick: addHome, style: { ...btnDark, padding: '0 26px' } }, 'Add')),
        added.filter(a => a.cls === 'realest').map(a => e('div', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)' } }, e('span', { style: { width: 7, height: 7, borderRadius: 99, background: '#14A6A0' } }), `${a.name} \u00b7 $${(a.value).toLocaleString()}`)));
      // done
      return e('div', { style: { textAlign: 'center' } },
        e('div', { style: { width: 64, height: 64, borderRadius: 99, background: 'color-mix(in oklab, var(--pos) 14%, var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' } },
          e('svg', { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--pos)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }, e('path', { d: 'M20 6L9 17l-5-5' }))),
        e('p', { style: { fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5, margin: '10px 0 22px' } }, count > 0 ? `${count} ${count === 1 ? 'asset' : 'assets'} added. Jump into your dashboard \u2014 or explore the full sample portfolio first.` : 'Explore the sample portfolio to see everything Nest Watch can do, then add your own.'),
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          count > 0 && e('button', { onClick: () => onDone(added), style: { ...btnDark, width: '100%', padding: '14px' } }, `Enter with my ${count} ${count === 1 ? 'asset' : 'assets'}`),
          e('button', { onClick: () => onDone(null), style: { ...(count > 0 ? btnGhost : btnDark), width: '100%', padding: '14px' } }, 'Explore the sample portfolio')));
    };

    return e('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' } },
      e('div', { style: { padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e(Wordmark, null),
        !last && e('button', { onClick: () => setStep(step + 1), style: { background: 'none', border: 'none', fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Skip for now')),
      // progress
      e('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 } },
        steps.slice(0, 3).map((_, i) => e('div', { key: i, style: { width: 36, height: 4, borderRadius: 99, background: i <= step ? ['#3E72F0','#E0992B','#14A6A0'][i] : 'var(--border)' } }))),
      e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' } },
        e('div', { style: { width: 460, maxWidth: '100%' } },
          e('h1', { style: { fontSize: 30, fontWeight: 700, letterSpacing: '-.025em', margin: 0, textAlign: 'center' } }, s.title),
          s.sub && e('p', { style: { fontSize: 15.5, color: 'var(--ink-2)', textAlign: 'center', margin: '12px 0 28px', lineHeight: 1.5 } }, s.sub),
          e('div', { style: { marginTop: last ? 18 : 8 } }, body()),
          !last && e('button', { onClick: () => setStep(step + 1), style: { ...btnDark, width: '100%', marginTop: 24, padding: '14px' } }, step === 2 ? 'Finish' : 'Continue'),
          !last && e('button', { onClick: () => setStep(step + 1), style: { display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Skip this step'),
          !last && e('p', { style: { fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', marginTop: 18, lineHeight: 1.5 } }, e('span', { style: { color: 'var(--pos)', fontWeight: 600 } }, 'You already have enough to get started. '), 'Add or connect more anytime from your dashboard.'))));
  }

  // ============ ROUTER ============
  function NestWatch() {
    const [view, setView] = useState('landing');   // landing | auth | onboarding
    const [mode, setMode] = useState('signup');
    // Real auth lives in the Next app — send sign-in/sign-up there.
    const goAuth = () => { window.location.href = '/login'; };
    const enter = (added) => {
      try {
        if (added && added.length) { localStorage.setItem('all_positions_v3', JSON.stringify(added)); localStorage.setItem('all_tx_v3', '[]'); localStorage.setItem('all_realized_v3', '[]'); }
        else { localStorage.removeItem('all_positions_v3'); localStorage.removeItem('all_tx_v3'); localStorage.removeItem('all_realized_v3'); }
      } catch (err) {}
      window.location.href = DASH;
    };
    if (view === 'auth') return e(Auth, { mode, setMode, onSignup: () => { setView('onboarding'); window.scrollTo(0, 0); }, onSignin: () => enter(null), onHome: () => setView('landing') });
    if (view === 'onboarding') return e(Onboarding, { onDone: enter });
    return e(window.NW_Landing, { onAuth: goAuth });
  }

  window.NestWatch = NestWatch;
})();
