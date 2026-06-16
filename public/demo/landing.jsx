/* NEST WATCH — landing + auth + onboarding (Apple-clean) */
(function () {
  const e = React.createElement;
  const { useState, useEffect, useRef } = React;

  // ---------- brand mark ----------
  function Mark({ size = 26 }) {
    return e('img', { src: 'landing-assets/nexis-mark.png', alt: 'Nexis Folio', style: { height: size, width: 'auto', display: 'block' } });
  }
  function Wordmark({ light }) {
    return e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      e(Mark, null),
      e('span', { style: { fontWeight: 700, fontSize: 18, letterSpacing: '.12em', color: light ? '#fff' : 'var(--ink)' } }, 'NEXIS FOLIO'));
  }

  // reveal-on-scroll hook
  function useReveal() {
    const ref = useRef(null);
    useEffect(() => {
      const els = ref.current ? ref.current.querySelectorAll('.reveal') : [];
      const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); }), { threshold: 0.12 });
      els.forEach(el => io.observe(el));
      return () => io.disconnect();
    });
    return ref;
  }

  const CLASS_COLORS = [
    ['Crypto', '#E0992B'], ['Stocks', '#3E72F0'], ['Real estate', '#14A6A0'],
    ['Collectibles', '#9466F0'], ['Cash', '#93999F'], ['Loans', '#E5689A'], ['Metals', '#B5703C'],
  ];

  const btnDark = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 24px', background: 'var(--ink)', color: 'var(--surface)', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' };
  const btnGhost = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 24px', background: 'transparent', color: 'var(--ink)', border: 'var(--hair) solid var(--border-strong)', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' };

  function Shot({ src, w }) {
    return e('div', { style: { borderRadius: 16, overflow: 'hidden', border: 'var(--hair) solid var(--border)', boxShadow: '0 30px 70px -28px rgba(20,22,26,.32), 0 8px 24px -12px rgba(20,22,26,.18)', background: 'var(--surface)', maxWidth: w || '100%', margin: '0 auto' } },
      e('img', { src, alt: '', style: { width: '100%', display: 'block' } }));
  }

  // ============ LANDING ============
  function Landing({ onAuth }) {
    const ref = useReveal();
    const nav = (href) => (ev) => { ev.preventDefault(); const el = document.querySelector(href); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
    return e('div', { ref, style: { fontFamily: 'var(--font-sans)' } },
      // nav
      e('header', { style: { position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'saturate(180%) blur(20px)', background: 'color-mix(in oklab, var(--bg) 78%, transparent)', borderBottom: 'var(--hair) solid var(--border)' } },
        e('div', { style: { maxWidth: 1100, margin: '0 auto', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          e(Wordmark, null),
          e('nav', { style: { display: 'flex', alignItems: 'center', gap: 30 } },
            ['Net worth', 'Retirement', 'Taxes', 'Security'].map((l, i) => e('a', { key: l, href: '#f' + i, onClick: nav('#f' + i), style: { fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, cursor: 'pointer' } }, l))),
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
            e('button', { onClick: () => onAuth('signin'), style: { background: 'none', border: 'none', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, 'Sign in'),
            e('button', { onClick: () => onAuth('signup'), style: { ...btnDark, padding: '8px 16px', fontSize: 13.5 } }, 'Get started')))),

      // hero
      e('section', { style: { maxWidth: 1100, margin: '0 auto', padding: '88px 28px 40px', textAlign: 'center' } },
        e('div', { className: 'reveal in', style: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, border: 'var(--hair) solid var(--border)', background: 'var(--surface)', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 26 } },
          e('span', { style: { width: 7, height: 7, borderRadius: 99, background: 'var(--pos)' } }), 'Live across crypto, markets, property & more'),
        e('h1', { className: 'reveal in', style: { fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.04, fontWeight: 700, letterSpacing: '-.04em', margin: 0, maxWidth: 880, marginInline: 'auto' } },
          'Every asset you own,', e('br', null), e('span', { style: { color: 'var(--ink-3)' } }, 'in one place.')),
        e('p', { className: 'reveal in', style: { fontSize: 'clamp(16px, 2vw, 21px)', color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 600, margin: '24px auto 0', fontWeight: 450 } },
          'Crypto, stocks, real estate, collectibles, cash, and loans \u2014 tracked live, valued honestly, and ready for tax season.'),
        e('div', { className: 'reveal in', style: { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 34, flexWrap: 'wrap' } },
          e('button', { onClick: () => onAuth('signup'), style: btnDark }, 'Get started free'),
          e('a', { href: '#f0', onClick: nav('#f0'), style: btnGhost }, 'See how it works')),
        e('div', { className: 'reveal', style: { marginTop: 56 } }, e(Shot, { src: 'landing-assets/01-shot.jpg', w: 980 }))),

      // feature sections
      Feature({ id: 'f0', tag: 'NET WORTH', color: '#14A6A0', title: 'See your true number.', body: 'One total that finally includes everything \u2014 the bank account and the Bitcoin, the house and the watch collection. Live prices on what moves, honest \u201clast valued\u201d dates on what doesn\u2019t.', shot: 'landing-assets/01-shot.jpg' }),
      Feature({ id: 'f1', tag: 'RETIREMENT', color: '#3E72F0', title: 'Know when you can stop.', body: 'Coast FIRE, Traditional, or full FIRE \u2014 with a Monte-Carlo success rate, editable per-sector growth, and one confident answer: the age you hit your number, and the age it\u2019s safe to retire.', shot: 'landing-assets/02-shot.jpg', flip: true }),
      Feature({ id: 'f2', tag: 'TAXES', color: '#E0992B', title: 'Tax season, already done.', body: 'Every sale is matched to its lot under FIFO, LIFO, or HIFO. Export a real Form 8949, Schedule D, Schedule B, TurboTax file, or a full CPA package \u2014 recomputed the moment you switch methods.', shot: 'landing-assets/03-shot.jpg' }),
      Feature({ id: 'f3', tag: 'ONE LEDGER', color: '#9466F0', title: 'Every account, one history.', body: 'Connect brokerages, paste a wallet address, or value an asset by hand \u2014 it all flows into a single editable ledger that powers your net worth, your gains, and your taxes.', shot: 'landing-assets/04-shot.jpg', flip: true }),

      // class strip
      e('section', { id: 'f-classes', style: { background: 'var(--bg-sunk)', borderTop: 'var(--hair) solid var(--border)', borderBottom: 'var(--hair) solid var(--border)' } },
        e('div', { className: 'reveal', style: { maxWidth: 1100, margin: '0 auto', padding: '80px 28px', textAlign: 'center' } },
          e('h2', { style: { fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, letterSpacing: '-.03em', margin: 0 } }, 'Seven asset classes. One number.'),
          e('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 32 } },
            CLASS_COLORS.map(([label, c]) => e('span', { key: label, style: { display: 'inline-flex', alignItems: 'center', gap: 9, padding: '10px 18px', borderRadius: 999, background: 'var(--surface)', border: 'var(--hair) solid var(--border)', fontSize: 15, fontWeight: 550 } },
              e('span', { style: { width: 11, height: 11, borderRadius: 99, background: c } }), label))))),

      // security band
      e('section', { id: 'f3-sec', style: { maxWidth: 760, margin: '0 auto', padding: '80px 28px', textAlign: 'center' } },
        e('div', { className: 'reveal' },
          e('div', { style: { fontSize: 12, letterSpacing: '.16em', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 14 } }, 'SECURITY'),
          e('h2', { style: { fontSize: 'clamp(24px,3vw,34px)', fontWeight: 650, letterSpacing: '-.02em', margin: 0, lineHeight: 1.25 } }, 'Read-only by design.'),
          e('p', { style: { fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 16 } }, 'Brokerages connect through Plaid and SnapTrade \u2014 view access only. Wallets are tracked by public address, never private keys. Nothing here can move your money.'))),

      // final CTA
      e('section', { style: { background: 'var(--ink)', color: 'var(--surface)' } },
        e('div', { className: 'reveal', style: { maxWidth: 800, margin: '0 auto', padding: '96px 28px', textAlign: 'center' } },
          e('h2', { style: { fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, letterSpacing: '-.035em', margin: 0, color: '#fff' } }, 'Start tracking everything.'),
          e('p', { style: { fontSize: 18, color: 'rgba(255,255,255,.6)', marginTop: 18, lineHeight: 1.5 } }, 'Free to set up. Your whole financial life, finally on one screen.'),
          e('button', { onClick: () => onAuth('signup'), style: { ...btnDark, background: '#fff', color: 'var(--ink)', marginTop: 30, padding: '15px 30px', fontSize: 16 } }, 'Get started free'))),

      // footer
      e('footer', { style: { maxWidth: 1100, margin: '0 auto', padding: '40px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 } },
        e(Wordmark, null),
        e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)' } }, '\u00a9 2026 Nexis Folio \u00b7 Illustrative demo \u00b7 Not financial or tax advice')));
  }

  function Feature({ id, tag, color, title, body, shot, flip }) {
    const text = e('div', { style: { flex: '1 1 360px', minWidth: 300 } },
      e('div', { style: { fontSize: 12, letterSpacing: '.16em', color, fontWeight: 700, marginBottom: 16 } }, tag),
      e('h2', { style: { fontSize: 'clamp(28px,3.4vw,42px)', fontWeight: 700, letterSpacing: '-.03em', margin: 0, lineHeight: 1.1 } }, title),
      e('p', { style: { fontSize: 17.5, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 18, maxWidth: 460 } }, body));
    const img = e('div', { style: { flex: '1 1 420px', minWidth: 320 } }, e(Shot, { src: shot }));
    return e('section', { id, className: 'reveal', style: { maxWidth: 1100, margin: '0 auto', padding: '72px 28px', display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap', flexDirection: flip ? 'row-reverse' : 'row' } }, text, img);
  }

  window.NW_Landing = Landing;
  window.NW_helpers = { e, btnDark, btnGhost, Wordmark, Mark };
})();
