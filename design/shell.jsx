/* global React */
const { useState } = React;

/* ============================================
   ICONS — minimal stroke set
   ============================================ */

const Ico = ({ d, fill }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {fill ? <path d={d} fill="currentColor" stroke="none"/> : <path d={d}/>}
  </svg>
);

const ICONS = {
  dashboard: <Ico d="M2 8 L8 3 L14 8 M3.5 7 V13.5 H6.5 V10 H9.5 V13.5 H12.5 V7"/>,
  wealth:    <Ico d="M2.5 13.5 V5.5 L8 2.5 L13.5 5.5 V13.5 M5.5 13.5 V8.5 H10.5 V13.5"/>,
  portfolio: <Ico d="M2.5 4 H13.5 V12.5 H2.5 Z M2.5 7 H13.5 M5.5 10 H8 M5.5 12 H8"/>,
  tx:        <Ico d="M3 5 H13 M3 5 L5.5 2.5 M13 11 H3 M13 11 L10.5 13.5"/>,
  alloc:     <Ico d="M8 2.5 A5.5 5.5 0 1 0 13.5 8 M8 2.5 V8 H13.5 A5.5 5.5 0 0 0 8 2.5 Z"/>,
  perf:      <Ico d="M2.5 12 L6 8 L9 10 L13.5 4 M9.5 4 H13.5 V8"/>,
  dca:       <Ico d="M8 2.5 V11.5 M8 11.5 L5 8.5 M8 11.5 L11 8.5 M3 13.5 H13"/>,
  calendar:  <Ico d="M3 4 H13 V13 H3 Z M3 7 H13 M5.5 2.5 V5 M10.5 2.5 V5 M5.5 9.5 H6.5 M9.5 9.5 H10.5"/>,
  compare:   <Ico d="M3.5 13 V3 H6.5 V13 Z M9.5 13 V6 H12.5 V13 Z"/>,
  alert:     <Ico d="M8 2.5 L14 12.5 H2 Z M8 6.5 V9 M8 11 V11.2"/>,
  glossary:  <Ico d="M3.5 2.5 H11.5 A1 1 0 0 1 12.5 3.5 V13.5 L8 11 L3.5 13.5 Z M6 5.5 H10 M6 8 H10"/>,
  settings:  <Ico d="M8 5.5 A2.5 2.5 0 1 0 8 10.5 A2.5 2.5 0 0 0 8 5.5 Z M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5 M12.6 3.4 L11.6 4.4 M4.4 11.6 L3.4 12.6 M12.6 12.6 L11.6 11.6 M4.4 4.4 L3.4 3.4"/>,
  search:    <Ico d="M7 3 A4 4 0 1 0 7 11 A4 4 0 0 0 7 3 Z M10 10 L13 13"/>,
  plus:      <Ico d="M8 3 V13 M3 8 H13"/>,
  bell:      <Ico d="M4 11 H12 V10 L11 9 V6.5 A3 3 0 0 0 5 6.5 V9 L4 10 Z M6.5 11.5 A1.5 1.5 0 0 0 9.5 11.5"/>,
  chevron:   <Ico d="M6 4 L10 8 L6 12"/>,
  upload:    <Ico d="M8 2.5 V10 M8 2.5 L5 5.5 M8 2.5 L11 5.5 M3 13 H13"/>,
};

/* ============================================
   SIDEBAR
   ============================================ */

function Sidebar({ route, setRoute, alertCount, openShortcuts }) {
  const nav = [
    { group: "Aperçu", items: [
      { id: "dashboard", label: "Tableau de bord", icon: ICONS.dashboard, key: "D" },
      { id: "wealth",    label: "Patrimoine",       icon: ICONS.wealth, key: "W" },
    ]},
    { group: "Investir", items: [
      { id: "portfolio", label: "Portefeuille",    icon: ICONS.portfolio, key: "P" },
      { id: "tx",        label: "Transactions",    icon: ICONS.tx, badge: "13", key: "T" },
      { id: "alloc",     label: "Allocation",      icon: ICONS.alloc, key: "L" },
      { id: "perf",      label: "Performance",     icon: ICONS.perf, key: "F" },
    ]},
    { group: "Outils", items: [
      { id: "dca",       label: "DCA helper",      icon: ICONS.dca },
      { id: "calendar",  label: "Calendrier",      icon: ICONS.calendar, key: "C" },
      { id: "compare",   label: "Comparateur ETF", icon: ICONS.compare, key: "M" },
      { id: "alerts",    label: "Alertes",         icon: ICONS.alert, badge: String(alertCount), key: "A" },
      { id: "glossary",  label: "Glossaire",       icon: ICONS.glossary, key: "R" },
    ]},
  ];

  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">P</div>
        <div>
          <div className="brand-name">Patrimo<em>nia</em></div>
          <div className="brand-sub">Tracker · v0.4</div>
        </div>
      </div>

      {nav.map((g, i) => (
        <nav key={i} className="nav-group" aria-label={g.group}>
          <div className="nav-label" id={`navgrp-${i}`}>{g.group}</div>
          {g.items.map(it => (
            <button
              key={it.id}
              className={"nav-item " + (route === it.id ? "active" : "")}
              onClick={() => setRoute(it.id)}
              aria-current={route === it.id ? "page" : undefined}
              aria-keyshortcuts={it.key ? `g ${it.key}` : undefined}
              title={it.key ? `Raccourci : G puis ${it.key}` : undefined}
            >
              <span className="ico" aria-hidden="true">{it.icon}</span>
              {it.label}
              {it.badge && <span className="badge" aria-label={`${it.badge} en attente`}>{it.badge}</span>}
            </button>
          ))}
        </nav>
      ))}

      <div className="sidebar-footer">
        <div className="avatar" aria-hidden="true">{window.USER.initials}</div>
        <div className="user-meta" style={{flex:1}}>
          <div className="user-name">{window.USER.firstName} Huet</div>
          <div className="user-role">{window.USER.riskProfile}</div>
        </div>
        <button
          className="btn ghost sm"
          onClick={openShortcuts}
          aria-label="Afficher les raccourcis clavier"
          title="Raccourcis (?)"
          style={{padding: "4px 8px"}}
        >
          <window.Kbd>?</window.Kbd>
        </button>
      </div>
    </aside>
  );
}

/* ============================================
   TOPBAR
   ============================================ */

function Topbar({ crumbs, onNewTx, openShortcuts }) {
  return (
    <header className="topbar" role="banner">
      <nav aria-label="Fil d'Ariane" className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span aria-hidden="true" style={{margin:"0 8px", opacity:0.4}}>/</span>}
            {i === crumbs.length - 1 ? <b aria-current="page">{c}</b> : c}
          </React.Fragment>
        ))}
      </nav>
      <div className="topbar-right">
        <label className="search">
          <span aria-hidden="true" style={{display:"inline-flex"}}>{ICONS.search}</span>
          <span className="sr-only">Recherche</span>
          <input
            data-search
            type="search"
            placeholder="Rechercher ETF, ISIN, transaction…"
            aria-keyshortcuts="Meta+K Control+K"
          />
          <span className="kbd" aria-hidden="true">⌘K</span>
        </label>
        <button className="btn ghost" aria-label="Notifications (3 non lues)" title="Notifications">
          <span aria-hidden="true" style={{display:"inline-flex"}}>{ICONS.bell}</span>
        </button>
        <button className="btn primary" onClick={onNewTx} aria-keyshortcuts="n" title="Raccourci : N">
          <span aria-hidden="true" style={{display:"inline-flex"}}>{ICONS.plus}</span>
          Nouvelle transaction
        </button>
      </div>
    </header>
  );
}

/* ============================================
   SHARED ATOMS
   ============================================ */

function EnvGlyph({ env, size }) {
  return (
    <div
      className={"env-glyph " + env.glyph}
      style={size ? { width: size, height: size, fontSize: Math.round(size * 0.5) } : undefined}
    >
      {env.code === "PEA-PME" ? "P+" :
       env.code === "Livret A" ? "₳" :
       env.code === "LDDS" ? "ⓁD" :
       env.code === "SCPI" ? "Sc" :
       env.code === "Or" ? "Au" :
       env.code === "Crypto" ? "₿" :
       env.code.charAt(0)}
    </div>
  );
}

function Delta({ value, suffix = "%", digits = 2 }) {
  if (value === 0 || value === null || value === undefined) return <span className="delta flat">—</span>;
  const cls = value > 0 ? "up" : "down";
  const sign = value > 0 ? "+" : "";
  return <span className={"delta " + cls}>{sign}{window.fmtNum(value, digits)}{suffix}</span>;
}

function Sparkline({ data, color = "currentColor", width = 80, height = 24, fill }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const last = data[data.length - 1];
  const first = data[0];
  const stroke = last >= first ? "var(--gain)" : "var(--loss)";
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && (
        <polygon
          points={`1,${height} ${pts.join(" ")} ${width-1},${height}`}
          fill={stroke} opacity="0.08"
        />
      )}
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color === "currentColor" ? stroke : color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Bar({ pct, max=100, className="" }) {
  return (
    <div className={"bar " + className}>
      <span style={{ width: Math.min(100, (pct/max)*100) + "%" }} />
    </div>
  );
}

function Donut({ data, size = 160, thickness = 22 }) {
  const total = data.reduce((a,d)=>a+d.value, 0);
  const r = size/2 - thickness/2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={thickness}/>
      {data.map((d, i) => {
        const len = (d.value/total) * C;
        const dasharray = `${len} ${C - len}`;
        const el = (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={dasharray}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

Object.assign(window, { Sidebar, Topbar, EnvGlyph, Delta, Sparkline, Bar, Donut, ICONS });
