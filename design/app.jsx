/* global React, ReactDOM */
const { useState: useSt, useEffect: useEf } = React;

function App() {
  const [route, setRoute] = useSt("dashboard");
  const [txOpen, setTxOpen] = useSt(false);
  const [shortcutsOpen, setShortcutsOpen] = useSt(false);

  const crumbs = {
    dashboard: ["Aperçu", "Tableau de bord"],
    wealth:    ["Aperçu", "Patrimoine"],
    portfolio: ["Investir", "Portefeuille"],
    tx:        ["Investir", "Transactions"],
    alloc:     ["Investir", "Allocation"],
    perf:      ["Investir", "Performance"],
    dca:       ["Outils", "DCA helper"],
    calendar:  ["Outils", "Calendrier"],
    compare:   ["Outils", "Comparateur ETF"],
    alerts:    ["Outils", "Alertes"],
    glossary:  ["Outils", "Glossaire"],
  };

  // Keyboard shortcuts
  const gMode = window.useShortcuts({
    setRoute,
    openTx:        () => setTxOpen(true),
    openShortcuts: () => setShortcutsOpen(true),
    closeAll:      () => { setTxOpen(false); setShortcutsOpen(false); },
  });

  // Page title for screen readers
  useEf(() => {
    document.title = `${crumbs[route][1]} — Patrimonia`;
  }, [route]);

  const screen = (() => {
    switch (route) {
      case "dashboard": return <window.ScreenDashboard goto={setRoute} onNewTx={()=>setTxOpen(true)}/>;
      case "wealth":    return <window.ScreenWealth goto={setRoute}/>;
      case "portfolio": return <window.ScreenPortfolio/>;
      case "tx":        return <window.ScreenTransactions onNewTx={()=>setTxOpen(true)}/>;
      case "alloc":     return <window.ScreenAllocation/>;
      case "perf":      return <window.ScreenPerf/>;
      case "dca":       return <window.ScreenDCA onNewTx={()=>setTxOpen(true)}/>;
      case "calendar":  return <window.ScreenCalendar/>;
      case "compare":   return <window.ScreenCompare/>;
      case "alerts":    return <window.ScreenAlerts/>;
      case "glossary":  return <window.ScreenGlossary/>;
      default:          return <div className="page"><h1 className="page-title">Bientôt</h1></div>;
    }
  })();

  return (
    <>
      <a href="#main" className="skip-link">Aller au contenu principal</a>
      <div className="app" data-screen-label={crumbs[route].join(" · ")}>
        <window.Sidebar route={route} setRoute={setRoute} alertCount={window.ALERTS.length} openShortcuts={()=>setShortcutsOpen(true)}/>
        <div className="main">
          <window.Topbar crumbs={crumbs[route]} onNewTx={()=>setTxOpen(true)} openShortcuts={()=>setShortcutsOpen(true)}/>
          <main id="main" tabIndex={-1} aria-label={crumbs[route].join(", ")}>
            {screen}
          </main>
        </div>
        {txOpen && <window.TxModal onClose={()=>setTxOpen(false)}/>}
        {shortcutsOpen && <window.ShortcutsDialog onClose={()=>setShortcutsOpen(false)}/>}
        {gMode && <window.GModeBadge/>}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
