/* global React, EnvGlyph, Delta, Sparkline, Bar */
const {
  ENVELOPES: ENVS_T, ETFS: ETFS_T, TRANSACTIONS: TX_T, TX_LABELS: TXL,
  ALERTS: AL_T, TARGETS: TT,
  etfValue: evT, fmtEur: $eT, fmtNum: $nT, fmtPct: $pT, fmtPctRaw: $prT, fmtDate: $dT,
} = window;

/* ============================================
   TRANSACTIONS — timeline + filters
   ============================================ */

function ScreenTransactions({ onNewTx }) {
  const [filter, setFilter] = React.useState("ALL");
  const counts = TX_T.reduce((a,t)=>{ a[t.type] = (a[t.type]||0)+1; a.ALL = (a.ALL||0)+1; return a; },{});
  const filtered = filter === "ALL" ? TX_T : TX_T.filter(t => t.type === filter);

  // Group by month
  const groups = {};
  filtered.forEach(t => {
    const key = t.date.slice(0,7);
    (groups[key] = groups[key] || []).push(t);
  });

  return (
    <div className="page">
      <div className="page-head">
        <div className="row">
          <div className="grow">
            <div className="page-eyebrow">Journal — 142 mouvements</div>
            <h1 className="page-title">Toutes les <em>opérations</em></h1>
            <p className="page-sub">
              Une seule source de vérité. PRU, cash, positions, plus-values latentes —
              tout est recalculé à la volée depuis cette table.
            </p>
          </div>
          <button className="btn primary" onClick={onNewTx}>+ Nouvelle transaction</button>
        </div>
      </div>

      <div className="row" style={{marginBottom: 16, gap: 6, flexWrap:"wrap"}}>
        {[
          { id: "ALL", label: "Toutes" },
          { id: "BUY", label: "Achats" },
          { id: "SELL", label: "Ventes" },
          { id: "DEPOSIT", label: "Dépôts" },
          { id: "WITHDRAWAL", label: "Retraits" },
          { id: "DIVIDEND", label: "Dividendes" },
          { id: "INTEREST", label: "Intérêts" },
        ].map(f => (
          <button key={f.id}
            className={"pill " + (filter === f.id ? "solid" : "")}
            style={{cursor:"pointer", padding:"5px 12px", fontSize:12}}
            onClick={() => setFilter(f.id)}>
            {f.label}
            {counts[f.id] && <span className="muted num tiny" style={{marginLeft: 6}}>{counts[f.id]}</span>}
          </button>
        ))}
        <div style={{marginLeft:"auto", display:"flex", gap:6}}>
          <button className="btn sm">Import CSV</button>
          <button className="btn sm">Exporter</button>
        </div>
      </div>

      {/* Cohérence panel */}
      <div className="card" style={{marginBottom: 20, padding: "14px 18px", background:"var(--paper-2)", border:"1px dashed var(--rule)"}}>
        <div className="row">
          <span className="pill gain"><span className="dot"/>Cohérence OK</span>
          <span className="muted small">Solde cash recalculé = somme des mouvements · Aucun écart détecté</span>
          <button className="btn sm ghost" style={{marginLeft:"auto"}}>Détails ↓</button>
        </div>
      </div>

      {/* Groups */}
      {Object.entries(groups).map(([month, txs]) => {
        const d = new Date(month + "-01");
        const label = d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
        const monthTotal = txs.reduce((a,t)=>{
          const sign = TXL[t.type].dir === "+" ? 1 : -1;
          return a + sign * t.amount;
        }, 0);
        return (
          <div key={month} style={{marginBottom: 22}}>
            <div className="row" style={{padding:"0 4px 8px", borderBottom:"1px solid var(--rule)"}}>
              <span className="serif-italic" style={{fontSize: 18, textTransform:"capitalize"}}>{label}</span>
              <span className="muted small">{txs.length} mouvements</span>
              <span style={{marginLeft:"auto"}} className={"num " + (monthTotal>=0?"pos":"neg")}>
                {monthTotal>=0?"+":""}{$eT(monthTotal, 2)}
              </span>
            </div>
            <table className="tbl tbl-compact">
              <tbody>
                {txs.map(t => {
                  const env = ENVS_T.find(e=>e.id===t.envelope);
                  const lbl = TXL[t.type];
                  const etf = t.etf ? ETFS_T.find(e=>e.ticker===t.etf) : null;
                  return (
                    <tr key={t.id}>
                      <td style={{width:80}}>
                        <div className="num small">{$dT(t.date)}</div>
                      </td>
                      <td style={{width:36}}>
                        <span className="env-glyph" style={{
                          width:24, height:24, fontSize:11,
                          background:["BUY","SELL"].includes(t.type) ? "var(--ink)" :
                                      lbl.dir==="+" ? "var(--gain)" : "var(--loss)",
                        }}>
                          {lbl.sym}
                        </span>
                      </td>
                      <td>
                        <div style={{fontSize: 14}}>
                          {lbl.label} {etf && <span className="serif-italic">— {etf.ticker}</span>}
                        </div>
                        <div className="muted tiny">{etf ? etf.name : env.label + " · " + env.broker}</div>
                      </td>
                      <td style={{width: 110}}>
                        <div className="row gap-12">
                          <EnvGlyph env={env} size={18}/>
                          <span className="small">{env.code}</span>
                        </div>
                      </td>
                      <td className="r" style={{width: 70}}>
                        {t.etf ? <span className="num small">{$nT(t.qty,0)}</span> : ""}
                      </td>
                      <td className="r" style={{width: 90}}>
                        {t.price ? <span className="num small">{$nT(t.price,2)} €</span> : ""}
                      </td>
                      <td className="r" style={{width: 70}}>
                        {t.fees > 0 ? <span className="num small muted">{$nT(t.fees,2)} €</span> : ""}
                      </td>
                      <td className="r" style={{width: 130}}>
                        <span className={"num " + (lbl.dir==="+"?"pos":"neg")}>
                          {lbl.dir==="+"?"+":"−"} {$eT(t.amount,2).replace("€","€")}
                        </span>
                      </td>
                      <td style={{width: 30}} className="r">
                        <button className="btn sm ghost" style={{padding:"3px 8px"}}>···</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="row" style={{justifyContent:"center", marginTop: 24}}>
        <button className="btn">Charger 30 mouvements de plus</button>
      </div>
    </div>
  );
}

/* ============================================
   ALERTS — full list + rules
   ============================================ */

function ScreenAlerts() {
  const rules = [
    { type:"CASH_IDLE",     label:"Cash dormant",         threshold:"500 € / 30 j",  enabled:true,  channels:"In-app · Email" },
    { type:"DRIFT_ETF",     label:"Drift par ETF",        threshold:"> 5 pts",       enabled:true,  channels:"In-app" },
    { type:"DRIFT_CLASS",   label:"Drift Actions/Oblig",  threshold:"> 10 pts",      enabled:true,  channels:"In-app · Email" },
    { type:"DCA_MISSED",    label:"Mois sans DCA",        threshold:"35 jours",      enabled:true,  channels:"In-app" },
    { type:"PRICE_DROP",    label:"Baisse vs PRU",        threshold:"< −15 %",       enabled:true,  channels:"In-app" },
    { type:"PEA_AGE",       label:"Anniversaire PEA",     threshold:"5 ans, 8 ans",  enabled:true,  channels:"In-app" },
    { type:"CONCENTRATION", label:"Concentration géo",    threshold:"> 70 %",        enabled:true,  channels:"In-app" },
    { type:"PEA_INELIGIBLE",label:"ETF inéligible PEA",   threshold:"changement",    enabled:true,  channels:"In-app · Email" },
    { type:"DIVIDEND",      label:"Dividende reçu",       threshold:"chaque",        enabled:false, channels:"In-app" },
    { type:"TER_INCREASE",  label:"Hausse de TER",        threshold:"chaque",        enabled:true,  channels:"Email" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">8 alertes actives · 14 règles configurées</div>
        <h1 className="page-title">Le tracker te <em>prévient</em><br/>quand quelque chose bouge.</h1>
        <p className="page-sub">
          Tu décides quoi surveiller, avec quels seuils, et par quel canal. Évaluation toutes les heures.
        </p>
      </div>

      <div className="grid" style={{gridTemplateColumns:"1.4fr 1fr"}}>
        <div>
          <div className="section-head" style={{marginTop:0}}>
            <h2 className="section-title">Boîte de réception</h2>
            <span className="section-sub">{AL_T.length} alertes</span>
            <div className="section-right">
              <div className="tabs">
                <button className="active">Toutes</button>
                <button>Non lues</button>
                <button>Archivées</button>
              </div>
            </div>
          </div>
          <div className="grid" style={{gridTemplateColumns:"1fr"}}>
            {AL_T.map(a => (
              <div key={a.id} className={"nba " + (a.severity==="warn"?"warn":a.severity==="gain"?"gain":a.severity==="loss"?"loss":"info")}>
                <div className="sev">{a.severity==="warn"?"!":a.severity==="gain"?"✓":a.severity==="loss"?"✗":"i"}</div>
                <div className="body">
                  <h4>{a.title}</h4>
                  <p>{a.body}</p>
                  <div className="meta">
                    <span>{a.date}</span>
                    <span>·</span>
                    <span>{a.type.replace(/_/g," ").toLowerCase()}</span>
                  </div>
                </div>
                <div className="actions">
                  <button className="btn sm">Ignorer</button>
                  <button className="btn sm primary">{a.cta}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="section-head" style={{marginTop:0}}>
            <h2 className="section-title">Règles</h2>
            <span className="section-sub">configurables</span>
            <div className="section-right">
              <button className="btn sm">+ Nouvelle règle</button>
            </div>
          </div>
          <div className="card" style={{padding:"4px 12px"}}>
            <table className="tbl tbl-compact">
              <tbody>
                {rules.map(r => (
                  <tr key={r.type}>
                    <td style={{width: 18}}>
                      <div style={{
                        width:22, height:12, borderRadius:999,
                        background: r.enabled ? "var(--brand)" : "var(--rule)",
                        position:"relative",
                      }}>
                        <span style={{
                          position:"absolute", top:1,
                          left: r.enabled ? 11 : 1,
                          width:10, height:10, borderRadius:"50%",
                          background:"var(--paper)",
                          transition: "left 0.2s",
                        }}/>
                      </div>
                    </td>
                    <td>
                      <div style={{fontSize:13}}>{r.label}</div>
                      <div className="muted tiny">{r.channels}</div>
                    </td>
                    <td className="r">
                      <div className="num small muted">{r.threshold}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenTransactions, ScreenAlerts });
