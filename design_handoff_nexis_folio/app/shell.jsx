/* $ALL — app shell: top nav, router, theme + tweaks wiring */
(function () {
  const A = window.ALL, U = window.ALLUI;
  const { Bolt, Search, Sun, Moon, Plus } = U;
  const e = React.createElement;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "accent": "#15171A",
    "numberFormat": "abbreviated",
    "allocChart": "donut",
    "costBasis": "FIFO",
    "showNews": true
  }/*EDITMODE-END*/;

  const RETIRE_DEFAULTS = { currentAge: 40, retireAge: 65, annualSpend: 60000 };

  const ACCENTS = ['#15171A', '#3E72F0', '#14A6A0', '#9466F0'];
  const MONO = '#15171A';

  function applyTheme(theme, accent) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    let a = accent, ai = '#FFFFFF';
    if (accent === MONO) {
      if (theme === 'dark') { a = '#F3F4F5'; ai = '#15171A'; }
      else { a = '#15171A'; ai = '#FFFFFF'; }
    }
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent-ink', ai);
  }

  function NavTab({ label, active, onClick }) {
    return e('button', { onClick, style: { padding: '6px 2px', fontSize: 13.5, fontWeight: active ? 600 : 450, color: active ? 'var(--ink)' : 'var(--ink-2)', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: active ? 'var(--ink)' : 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)', height: 58 } }, label);
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [route, setRoute] = React.useState('overview');
    const [assetId, setAssetId] = React.useState(null);
    const [addOpen, setAddOpen] = React.useState(false);
    const [addPrefill, setAddPrefill] = React.useState(null);
    const [navOpen, setNavOpen] = React.useState(false);
    if (window.PortfolioStore) window.PortfolioStore.useStore();   // re-render on portfolio changes
    // global opener so Watchlist / other screens can launch the add flow
    window.__openAddPosition = (pf) => { setAddPrefill(pf || null); setAddOpen(true); };
    const [catalogPos, setCatalogPos] = React.useState(null);
    window.__openCardCatalog = (posId) => setCatalogPos(posId || 'cards');

    React.useEffect(() => { applyTheme(t.theme, t.accent); }, [t.theme, t.accent]);
    React.useEffect(() => { window.__ALL_ABBR = (t.numberFormat === 'abbreviated'); window.__ALL_METHOD = t.costBasis; }, [t.numberFormat, t.costBasis]);
    // ensure correct format on first paint
    window.__ALL_ABBR = (t.numberFormat === 'abbreviated');

    const navigate = (r, id) => { if (id !== undefined) setAssetId(id); setRoute(r); window.scrollTo(0, 0); };
    const toggleTheme = () => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark');
    const mobile = window.useMobile ? window.useMobile() : false;

    const tabs = [['overview','Overview'],['history','History'],['watchlist','Watchlist'],['news','News'],['retirement','Retirement'],['tax','Tax'],['connections','Connections']]
      .filter(([r]) => r !== 'news' || t.showNews);
    // if News is hidden while viewing it, bounce to overview
    React.useEffect(() => { if (route === 'news' && !t.showNews) setRoute('overview'); }, [t.showNews, route]);
    let screen;
    if (route === 'overview') screen = e(window.Overview, { navigate, tweaks: t, key: 'ov'+t.numberFormat+t.allocChart });
    else if (route === 'history') screen = e(window.History, { navigate, tweaks: t, key: 'hi'+t.numberFormat });
    else if (route === 'watchlist') screen = e(window.Watchlist, { navigate, key: 'wl'+t.numberFormat });
    else if (route === 'news') screen = e(window.News, { navigate, key: 'nw' });
    else if (route === 'retirement') screen = e(window.Retirement, { defaults: RETIRE_DEFAULTS, key: 'rt'+t.numberFormat });
    else if (route === 'detail') screen = e(window.Detail, { assetId, navigate, key: 'de'+assetId+t.numberFormat });
    else if (route === 'tax') screen = e(window.Tax, { navigate, tweaks: t, setTweak, key: 'tx'+t.numberFormat+t.costBasis });
    else if (route === 'connections') screen = e(window.Connections, { navigate, key: 'co'+t.numberFormat });

    return e('div', { style: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' } },
      // top nav
      e('header', { style: { position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: mobile?'0 14px':'0 28px', height: 56, borderBottom: 'var(--hair) solid var(--border)', background: 'var(--surface)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: mobile?12:24, minWidth: 0, flex: 1 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 'none' }, onClick: () => navigate('overview') },
            e('img', { src: 'landing-assets/nexis-mark.png', alt: 'Nexis Folio', style: { height: 24, width: 'auto', display: 'block' } }),
            e('span', { style: { fontWeight: 700, fontSize: 15, letterSpacing: '.08em' } }, 'NEXIS FOLIO')),
          !mobile && e('nav', { className: 'nw-nav', style: { display: 'flex', gap: 20, minWidth: 0 } }, tabs.map(([r,l]) => e(NavTab, { key: r, label: l, active: route===r || (route==='detail'&&r==='overview'), onClick: () => navigate(r) })))),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: mobile?8:12, flex: 'none' } },
          mobile && e('button', { 'aria-label': 'Menu', onClick: () => setNavOpen(true), style: iconBtn() }, e('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }, e('path', { d: 'M3 6h18' }), e('path', { d: 'M3 12h18' }), e('path', { d: 'M3 18h18' }))),
          !mobile && e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--pos)', fontWeight: 500, marginRight: 2 } }, e(Bolt,{size:12}), 'live'),
          !mobile && e('button', { 'aria-label': 'Search', style: iconBtn() }, e(Search, { size: 15 })),
          e('button', { 'aria-label': 'Toggle theme', onClick: toggleTheme, style: iconBtn() }, t.theme==='dark'?e(Sun,{size:15}):e(Moon,{size:15})),
          e('button', { onClick: () => { setAddPrefill(null); setAddOpen(true); }, style: { display: 'flex', alignItems: 'center', gap: 7, padding: mobile?'8px':'8px 14px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', flex: 'none' } }, e(Plus,{size:15}), !mobile && 'Add position'),
          !mobile && e('div', { style: { width: 30, height: 30, borderRadius: 99, background: 'var(--bg-sunk)', border: 'var(--hair) solid var(--border)' } }))
      ),
      mobile && navOpen && e('div', { onClick: () => setNavOpen(false), style: { position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(10,12,14,.4)' } },
        e('div', { onClick: ev => ev.stopPropagation(), style: { position: 'absolute', top: 56, left: 0, right: 0, background: 'var(--surface)', borderBottom: 'var(--hair) solid var(--border)', boxShadow: 'var(--shadow)', padding: '8px' } },
          tabs.map(([r,l]) => e('button', { key: r, onClick: () => { navigate(r); setNavOpen(false); }, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 16px', background: route===r?'var(--bg-sunk)':'transparent', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: route===r?700:500, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-sans)' } }, l, route===r && e('span', { style: { width: 7, height: 7, borderRadius: 99, background: 'var(--accent)' } }))))),
      screen,
      // tweaks
      e(TweaksPanel, null,
        e(TweakSection, { label: 'Appearance' }),
        e(TweakRadio, { label: 'Theme', value: t.theme, options: ['light','dark'], onChange: v => setTweak('theme', v) }),
        e(TweakColor, { label: 'Brand accent', value: t.accent, options: ACCENTS, onChange: v => setTweak('accent', v) }),
        e(TweakSection, { label: 'Data display' }),
        e(TweakRadio, { label: 'Numbers', value: t.numberFormat, options: ['abbreviated','full'], onChange: v => setTweak('numberFormat', v) }),
        e(TweakRadio, { label: 'Allocation', value: t.allocChart, options: ['donut','bars'], onChange: v => setTweak('allocChart', v) }),
        e(TweakSection, { label: 'Tax' }),
        e(TweakRadio, { label: 'Cost basis', value: t.costBasis, options: ['FIFO','LIFO','HIFO'], onChange: v => setTweak('costBasis', v) }),
        e(TweakSection, { label: 'Tabs' }),
        e(TweakToggle, { label: 'News tab', value: t.showNews, onChange: v => setTweak('showNews', v) })
      ),
      // add position / log trade modal
      window.AddPositionModal && e(window.AddPositionModal, { open: addOpen, prefill: addPrefill, onClose: () => setAddOpen(false) }),
      // trading-card catalog browser
      window.CardCatalogModal && e(window.CardCatalogModal, { open: !!catalogPos, positionId: catalogPos, onClose: () => setCatalogPos(null) })
    );
  }

  function iconBtn() { return { width: 32, height: 32, border: 'var(--hair) solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', background: 'var(--surface)', cursor: 'pointer' }; }

  window.AppShell = App;
})();
