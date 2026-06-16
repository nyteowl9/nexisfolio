/* $ALL — shared presentational bits (donut, sparkline, badges, helpers)
   Exported to window for both Overview directions + the full app. */
(function () {
  const A = window.ALL;

  // ---------- Donut ----------
  function Donut({ data, size = 200, thickness = 26, activeKey = null, onSlice, centerTop, centerMain, centerSub, gap = 2 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const C = 2 * Math.PI * r;
    let acc = 0;
    const segs = data.map((d) => {
      const frac = d.value / total;
      const dash = Math.max(0, frac * C - gap);
      const seg = { ...d, dash, offset: -acc * C, frac };
      acc += frac;
      return seg;
    });
    const dim = activeKey ? 0.18 : 1;
    return React.createElement('div', { style: { position: 'relative', width: size, height: size } },
      React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
        React.createElement('g', { transform: `rotate(-90 ${size/2} ${size/2})` },
          React.createElement('circle', { cx: size/2, cy: size/2, r, fill: 'none', stroke: 'var(--donut-track)', strokeWidth: thickness }),
          segs.map((s) =>
            React.createElement('circle', {
              key: s.key, cx: size/2, cy: size/2, r, fill: 'none',
              stroke: s.color, strokeWidth: activeKey === s.key ? thickness + 4 : thickness,
              strokeDasharray: `${s.dash} ${C - s.dash}`, strokeDashoffset: s.offset,
              strokeLinecap: 'butt',
              opacity: activeKey && activeKey !== s.key ? dim : 1,
              style: { cursor: onSlice ? 'pointer' : 'default', transition: 'opacity .18s, stroke-width .18s' },
              onMouseEnter: onSlice ? () => onSlice(s.key) : undefined,
            })
          )
        )
      ),
      React.createElement('div', {
        style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center' }
      },
        centerTop && React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 } }, centerTop),
        React.createElement('div', { className: 'num', style: { fontSize: size > 180 ? 26 : 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 2 } }, centerMain),
        centerSub && React.createElement('div', { className: 'num', style: { fontSize: 12, color: 'var(--ink-2)', marginTop: 3 } }, centerSub)
      )
    );
  }

  // ---------- Sparkline / area ----------
  function Area({ points, width = 240, height = 64, color = 'var(--ink)', fill = true, strokeWidth = 1.6 }) {
    const min = Math.min(...points), max = Math.max(...points);
    const pad = (max - min) * 0.12 || 1;
    const lo = min - pad, hi = max + pad;
    const x = (i) => (i / (points.length - 1)) * width;
    const y = (v) => height - ((v - lo) / (hi - lo)) * height;
    const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    const gid = 'g' + Math.random().toString(36).slice(2, 8);
    return React.createElement('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { display: 'block', overflow: 'visible' } },
      fill && React.createElement('defs', null,
        React.createElement('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.16 }),
          React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0 })
        )
      ),
      fill && React.createElement('path', { d: area, fill: `url(#${gid})`, stroke: 'none' }),
      React.createElement('path', { d: line, fill: 'none', stroke: color, strokeWidth, strokeLinejoin: 'round', strokeLinecap: 'round' })
    );
  }

  // ---------- asset icon: real brand logo (crypto/stock) with monogram fallback ----------
  function AssetIcon({ cls, ticker, name, size = 36, radius = 9 }) {
    const c = A.CLASSES[cls] || {};
    const txt = ticker && ticker !== '—' ? ticker.slice(0, 4) : (name || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
    const logo = A.assetLogo ? A.assetLogo(cls, ticker) : null;
    const [broken, setBroken] = React.useState(false);
    const showLogo = logo && !broken;
    const fs = size <= 32 ? 9.5 : size <= 40 ? 10.5 : size <= 48 ? 13 : 16;
    return React.createElement('div', {
      style: { width: size, height: size, borderRadius: radius, background: showLogo ? '#FFFFFF' : `var(--${c.tint})`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, position: 'relative', overflow: 'hidden', flex: 'none', border: showLogo ? 'var(--hair) solid var(--border)' : 'none' }
    },
      txt,
      showLogo && React.createElement('img', { src: logo, alt: txt, onError: () => setBroken(true), style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: Math.round(size * 0.17), boxSizing: 'border-box', background: '#FFFFFF', display: 'block' } }));
  }

  // ---------- class badge ----------
  function Badge({ cls, mini }) {
    const c = A.CLASSES[cls];
    return React.createElement('span', {
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: mini ? 11 : 12, fontWeight: 500, color: 'var(--ink-2)',
        background: `var(--${c.tint})`, padding: mini ? '2px 8px' : '3px 9px', borderRadius: 99, whiteSpace: 'nowrap'
      }
    },
      React.createElement('span', { style: { width: 6, height: 6, borderRadius: 99, background: c.color, flex: 'none' } }),
      c.label
    );
  }

  // ---------- live / manual chip ----------
  function LiveChip({ live, updated, valued, small }) {
    if (live) {
      return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: small ? 11 : 12, color: 'var(--pos)', fontWeight: 500 } },
        React.createElement(Bolt, { size: small ? 11 : 12 }),
        `${updated < 60 ? updated + 's' : Math.round(updated/60) + 'm'} ago`
      );
    }
    return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: small ? 11 : 12, color: 'var(--ink-3)', fontWeight: 450 } },
      React.createElement(Clock, { size: small ? 11 : 12 }),
      `valued ${A.fmtDate(valued).replace(', 2026','').replace(', 2025',' \u201925')}`
    );
  }

  // ---------- tiny inline icons (stroke) ----------
  const ic = (paths, props = {}) => ({ size = 16, color = 'currentColor', sw = 1.6, style } = {}) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', style, ...props },
      paths.map((d, i) => React.createElement('path', { key: i, d })));
  const Bolt = ({ size = 14, color = 'currentColor' }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: color, stroke: 'none' },
      React.createElement('path', { d: 'M13 2 L4.5 13.5 H11 L10 22 L19.5 9.5 H13 Z' }));
  const Clock = ic(['M12 7v5l3 2', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z']);
  const ArrowUp = ic(['M12 19V5', 'M6 11l6-6 6 6']);
  const ArrowDown = ic(['M12 5v14', 'M6 13l6 6 6-6']);
  const Search = ic(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3']);
  const Caret = ic(['M6 9l6 6 6-6']);
  const Plus = ic(['M12 5v14', 'M5 12h14']);
  const Sun = ic(['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z','M12 1v2','M12 21v2','M4.2 4.2l1.4 1.4','M18.4 18.4l1.4 1.4','M1 12h2','M21 12h2','M4.2 19.8l1.4-1.4','M18.4 5.6l1.4-1.4']);
  const Moon = ic(['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z']);
  const Back = ic(['M15 18l-6-6 6-6']);
  const Chevron = ic(['M9 18l6-6-6-6']);
  const Download = ic(['M12 3v12','M7 10l5 5 5-5','M5 21h14']);
  const Link = ic(['M9 15l6-6','M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1','M13.5 17.5l-1 1a4 4 0 0 1-6-6l1-1']);
  const Wallet = ic(['M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2','M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3','M21 10v4h-4a2 2 0 0 1 0-4Z']);
  const Building = ic(['M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16','M15 9h4a1 1 0 0 1 1 1v11','M4 21h17','M8 8h0M8 12h0M8 16h0M11 8h0M11 12h0M11 16h0']);
  const Check = ic(['M20 6L9 17l-5-5']);
  const Dot = ic(['M12 12h.01']);
  const FileText = ic(['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z','M14 3v6h6','M8 13h8','M8 17h6']);
  const Refresh = ic(['M21 12a9 9 0 1 1-2.6-6.4','M21 4v5h-5']);
  const Calendar = ic(['M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z','M5 9h14','M9 4V2M15 4V2']);
  const Coins = ic(['M9 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z','M16 9.5a6 6 0 1 1-7 9.9']);
  const Pie = ic(['M12 3v9l7 4','M12 21a9 9 0 1 0-9-9']);
  const Bars = ic(['M4 20V10','M10 20V4','M16 20v-7','M22 20H2']);

  window.ALLUI = { Donut, Area, AssetIcon, Badge, LiveChip, Bolt, Clock, ArrowUp, ArrowDown, Search, Caret, Plus, Sun, Moon, Back, Chevron, Download, Link, Wallet, Building, Check, Dot, FileText, Refresh, Calendar, Coins, Pie, Bars };
})();
