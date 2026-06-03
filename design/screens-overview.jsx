/* global React, EnvGlyph, Delta, Sparkline, Bar, Donut, ICONS */
const {
  USER, ENVELOPES, ETFS, TRANSACTIONS, TX_LABELS, TARGETS, ALERTS,
  TOTAL_VALUE, TOTAL_BOURSE, TOTAL_LIVRET, TOTAL_CASH,
  etfValue, etfCost, etfPnl, etfPnlPct, etfDayPct,
  fmtEur, fmtNum, fmtPct, fmtPctRaw, fmtDate, SPARKS, PERF_SERIES,
} = window;

/* ============================================
   DASHBOARD
   ============================================ */

function ScreenDashboard({ goto, onNewTx }) {
  const portfolioValue = ETFS.reduce((a,e) => a + etfValue(e), 0);
  const portfolioCost  = ETFS.reduce((a,e) => a + etfCost(e), 0);
  const pnlLatent = portfolioValue - portfolioCost;
  const pnlPct = pnlLatent / portfolioCost * 100;
  const dayValue = ETFS.reduce((a,e) => a + (e.price - e.prev) * e.qty, 0);
  const dayPct = dayValue / portfolioValue * 100;

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow"><span className="dot"/>Vendredi 16 mai 2026 · Marchés ouverts</div>
        <h1 className="page-title">Bonjour <em>Antoine.</em></h1>
        <p className="page-sub">
          Ton patrimoine progresse de <span className="hl-soft">{fmtPct(dayPct, 2)}</span> aujourd'hui,
          soit <span className="hl-soft">{fmtEur(dayValue, 0)}</span>.
          <br/>
          <b>3 actions concrètes</b> t'attendent plus bas — la première vaut probablement
          <span className="hl"> quelques centaines d'euros</span>.
        </p>
      </div>

      {/* HERO STATS */}
      <div className="hero-stats">
        <div className="hero-main">
          <div className="hero-money">
            <div>
              <div className="label">Patrimoine total</div>
              <div className="value" style={{marginTop:12, fontVariantNumeric:"tabular-nums"}}>
                {fmtNum(TOTAL_VALUE, 0)}<small>,{fmtNum(TOTAL_VALUE,2).split(",")[1]} €</small>
              </div>
            </div>
            <div className="sub" style={{flexWrap:"wrap"}}>
              <Delta value={dayPct} digits={2}/>
              <span>aujourd'hui</span>
              <span style={{opacity:0.35}}>•</span>
              <span style={{color:"#4ADE80"}} className="num bold">+{fmtNum(pnlPct,1)} %</span>
              <span>depuis l'achat</span>
            </div>
          </div>
          <div className="stat">
            <div className="label">Investissements boursiers</div>
            <div className="value">{fmtEur(TOTAL_BOURSE, 0)}</div>
            <div className="sub" style={{display:"block"}}>
              <span className="num bold">{fmtNum(TOTAL_BOURSE/TOTAL_VALUE*100, 1)} %</span>
              <span className="muted"> du total</span>
            </div>
          </div>
          <div className="stat">
            <div className="label">Épargne réglementée</div>
            <div className="value">{fmtEur(TOTAL_LIVRET, 0)}</div>
            <div className="sub" style={{display:"block"}}>
              <span className="num bold">{fmtNum(TOTAL_LIVRET/TOTAL_VALUE*100, 1)} %</span>
              <span className="muted"> du total</span>
            </div>
          </div>
          <div className="stat">
            <div className="label">Cash dormant</div>
            <div className="value">{fmtEur(TOTAL_CASH - TOTAL_LIVRET, 0)}</div>
            <div className="sub" style={{display:"block"}}>
              <span className="pill warn"><span className="dot"/>à investir</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COL */}
      <div className="grid" style={{gridTemplateColumns: "1.6fr 1fr"}}>
        {/* LEFT — Performance */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Performance <em>vs benchmark</em></div>
            <span className="card-sub">12 mois glissants</span>
            <div className="card-right">
              <div className="tabs">
                <button>1M</button><button>3M</button><button>6M</button>
                <button className="active">1A</button><button>YTD</button><button>MAX</button>
              </div>
            </div>
          </div>
          <PerfChart />
          <div className="grid cols-4" style={{marginTop:18}}>
            <MiniStat label="YTD" value="+8,42 %" pos/>
            <MiniStat label="1 an" value="+19,60 %" pos/>
            <MiniStat label="Volatilité 1A" value="11,4 %"/>
            <MiniStat label="Sharpe" value="1,42"/>
          </div>
        </div>

        {/* RIGHT — Repartition */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Répartition</div>
            <span className="card-sub">par enveloppe</span>
          </div>
          <div style={{display:"flex", gap:24, alignItems:"center"}}>
            <Donut size={150} thickness={22} data={[
              { value: 22145, color: "#16A34A" },
              { value: 22950, color: "#CA8A04" },
              { value: 12500, color: "#DC2626" },
              { value:  8543, color: "#7C3AED" },
              { value:  6320, color: "#EA580C" },
              { value:  5400, color: "#EAB308" },
              { value:  4210, color: "#475569" },
              { value:  4218, color: "#18181B" },
              { value:  3845, color: "#B45309" },
              { value:  3210, color: "#15803D" },
              { value:  2580, color: "#0284C7" },
            ]}/>
            <div style={{flex:1, fontSize:12.5}}>
              {ENVELOPES.slice(0,6).map(e => (
                <div key={e.id} style={{display:"flex", alignItems:"center", padding:"4px 0", gap:8}}>
                  <span style={{width:8, height:8, borderRadius:2, background: glyphColor(e.glyph)}}/>
                  <span style={{flex:1}}>{e.label}</span>
                  <span className="num muted">{fmtPctRaw(e.value/TOTAL_VALUE*100, 1)}</span>
                </div>
              ))}
              <button className="btn sm ghost" style={{marginTop:6, padding:0, color:"var(--ink-3)"}}
                onClick={() => goto("wealth")}>Tout voir →</button>
            </div>
          </div>
        </div>
      </div>

      {/* NEXT BEST ACTIONS */}
      <div className="nba-header">
        <span className="count-chip">3</span>
        <h2>Prochaines <em>actions</em></h2>
        <span className="desc">Recommandations triées par impact</span>
        <div className="right">
          <button className="btn sm" onClick={() => goto("alerts")}>Voir toutes les alertes →</button>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:"1fr"}}>
        {ALERTS.slice(0,3).map(a => (
          <div key={a.id} className={"nba " + (a.severity === "warn" ? "warn" : a.severity === "loss" ? "loss" : a.severity === "gain" ? "gain" : "info")}>
            <div className="sev">{a.severity === "warn" ? "!" : a.severity === "gain" ? "✓" : "i"}</div>
            <div className="body">
              <h4>{a.title}</h4>
              <p>{a.body}</p>
              <div className="meta">
                <span>{a.date}</span>
                <span>·</span>
                <span>{a.type.replace(/_/g, " ").toLowerCase()}</span>
              </div>
            </div>
            <div className="actions">
              <button className="btn sm">Ignorer</button>
              <button className="btn sm primary">{a.cta}</button>
            </div>
          </div>
        ))}
      </div>

      {/* RECENT TX */}
      <div className="section-head">
        <h2 className="section-title">Mouvements <em>récents</em></h2>
        <span className="section-sub">7 derniers jours</span>
        <div className="section-right">
          <button className="btn sm" onClick={() => goto("tx")}>Tout l'historique →</button>
        </div>
      </div>
      <div className="card" style={{padding:"4px 12px"}}>
        <table className="tbl tbl-compact">
          <thead>
            <tr>
              <th style={{width:90}}>Date</th>
              <th style={{width:140}}>Type</th>
              <th>Enveloppe</th>
              <th>ETF</th>
              <th className="r">Quantité</th>
              <th className="r">Prix</th>
              <th className="r">Montant</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.slice(0,5).map(t => {
              const env = ENVELOPES.find(e => e.id === t.envelope);
              const lbl = TX_LABELS[t.type];
              return (
                <tr key={t.id}>
                  <td className="muted small">{fmtDate(t.date)}</td>
                  <td>
                    <span className="pill soft">
                      <span className="serif-italic" style={{fontSize:13}}>{lbl.sym}</span>
                      {lbl.label}
                    </span>
                  </td>
                  <td>
                    <div className="row gap-12">
                      <EnvGlyph env={env} size={20}/>
                      <span>{env.label}</span>
                    </div>
                  </td>
                  <td className="serif-italic">{t.etf || "—"}</td>
                  <td className="r num">{t.etf ? fmtNum(t.qty, 0) : "—"}</td>
                  <td className="r num">{t.price ? fmtEur(t.price, 2) : "—"}</td>
                  <td className={"r num " + (lbl.dir === "+" ? "pos" : "neg")}>
                    {lbl.dir}{fmtEur(t.amount, 2).replace("€", "").trim()} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value, pos, neg }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 6}}>{label}</div>
      <div className="serif" style={{fontSize: 22, lineHeight:1, letterSpacing:"-0.01em"}}>
        <span className={pos?"pos":neg?"neg":""}>{value}</span>
      </div>
    </div>
  );
}

function PerfChart() {
  const W = 700, H = 220, P = 20;
  const data = PERF_SERIES.portfolio;
  const bench = PERF_SERIES.benchmark;
  const all = [...data, ...bench];
  const min = Math.min(...all) - 2;
  const max = Math.max(...all) + 2;
  const pts = (s) => s.map((v, i) => {
    const x = P + (i / (s.length - 1)) * (W - P*2);
    const y = H - P - ((v - min) / (max - min)) * (H - P*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Grid
  const gridY = [0, 0.25, 0.5, 0.75, 1].map(t => H - P - t * (H - P*2));
  const labels = ["", "1A", "9M", "6M", "3M", "1M", "Auj."];

  return (
    <svg viewBox={`0 0 ${W} ${H+20}`} style={{width:"100%", height:"auto", display:"block"}}>
      {gridY.map((y, i) => (
        <line key={i} x1={P} x2={W-P} y1={y} y2={y} stroke="var(--rule-soft)" strokeDasharray={i===gridY.length-1?"none":"2 4"}/>
      ))}
      <polygon
        points={`${P},${H-P} ${pts(data)} ${W-P},${H-P}`}
        fill="var(--brand)"
        opacity="0.07"
      />
      <polyline points={pts(bench)} fill="none" stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 4"/>
      <polyline points={pts(data)} fill="none" stroke="var(--brand)" strokeWidth="2"/>
      {/* end dot */}
      {(() => {
        const i = data.length - 1;
        const x = P + (i / (data.length - 1)) * (W - P*2);
        const y = H - P - ((data[i] - min) / (max - min)) * (H - P*2);
        return <>
          <circle cx={x} cy={y} r="4" fill="var(--brand)" stroke="var(--paper)" strokeWidth="2"/>
          <text x={x-8} y={y-10} fontSize="11" fontFamily="var(--font-mono)" fill="var(--brand-ink)" textAnchor="end">+19,6%</text>
        </>;
      })()}
      {labels.slice(1).map((l, i) => {
        const x = P + (i / (labels.length - 2)) * (W - P*2);
        return <text key={l} x={x} y={H+10} fontSize="10" fill="var(--ink-3)" textAnchor="middle">{l}</text>;
      })}
      <g transform={`translate(${P+8} ${P+8})`}>
        <rect width="0" height="0"/>
        <line x1="0" x2="14" y1="3" y2="3" stroke="var(--brand)" strokeWidth="2"/>
        <text x="20" y="6" fontSize="11" fill="var(--ink-2)">Portefeuille</text>
        <line x1="100" x2="114" y1="3" y2="3" stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="3 4"/>
        <text x="120" y="6" fontSize="11" fill="var(--ink-2)">MSCI World</text>
      </g>
    </svg>
  );
}

function glyphColor(g) {
  return ({
    pea:"#16A34A", peapme:"#15803D", cto:"#EA580C", av:"#7C3AED",
    per:"#475569", pee:"#0284C7", livret:"#CA8A04", crypto:"#18181B",
    immo:"#DC2626", metal:"#B45309",
  })[g] || "#999";
}

/* ============================================
   WEALTH — all envelopes
   ============================================ */

function ScreenWealth({ goto }) {
  const families = [
    { label: "Comptes boursiers", ids: ["pea","peapme","cto"] },
    { label: "Assurance-vie & retraite", ids: ["av","per","pee"] },
    { label: "Épargne réglementée", ids: ["livreta","ldds"] },
    { label: "Autres placements", ids: ["crypto","immo","metal"] },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Patrimoine global</div>
        <h1 className="page-title">11 enveloppes, <em>une seule vue</em>.</h1>
        <p className="page-sub">
          Toutes tes poches d'épargne et d'investissement, des PEA aux livrets jusqu'à
          l'or physique et la SCPI. La vraie source de vérité, c'est l'historique des
          mouvements — chaque ligne en dérive.
        </p>
      </div>

      {/* Bar stack */}
      <div className="card" style={{marginBottom: 24}}>
        <div className="card-head">
          <div className="card-title">Répartition <em>par famille</em></div>
          <span className="card-sub">total {fmtEur(TOTAL_VALUE)}</span>
          <div className="card-right">
            <div className="segmented">
              <button className="active">Par famille</button>
              <button>Par devise</button>
              <button>Par liquidité</button>
            </div>
          </div>
        </div>
        <div className="bar-stack" style={{height:20, marginTop:6}}>
          {families.map((f, i) => {
            const v = f.ids.reduce((a,id)=>a+ENVELOPES.find(e=>e.id===id).value,0);
            const colors = ["#16A34A","#7C3AED","#CA8A04","#DC2626"];
            return <span key={i} style={{ width: `${(v/TOTAL_VALUE)*100}%`, background: colors[i] }}/>;
          })}
        </div>
        <div style={{display:"flex", gap:32, marginTop:14, fontSize:13}}>
          {families.map((f, i) => {
            const v = f.ids.reduce((a,id)=>a+ENVELOPES.find(e=>e.id===id).value,0);
            const colors = ["#16A34A","#7C3AED","#CA8A04","#DC2626"];
            return (
              <div key={i} className="row gap-12">
                <span style={{width:10, height:10, borderRadius:3, background: colors[i]}}/>
                <span style={{fontWeight:500}}>{f.label}</span>
                <span className="num bold">{fmtEur(v, 0)}</span>
                <span className="num muted">{fmtPctRaw(v/TOTAL_VALUE*100,1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {families.map((f, fi) => {
        const familyColors = ["#16A34A","#7C3AED","#CA8A04","#DC2626"];
        const v = f.ids.reduce((a,id)=>a+ENVELOPES.find(e=>e.id===id).value,0);
        const inv = f.ids.reduce((a,id)=>a+ENVELOPES.find(e=>e.id===id).invested,0);
        const pnlF = v - inv;
        const pnlFPct = (pnlF/inv)*100;
        return (
        <div key={f.label}>
          <div className="family-head">
            <span style={{width:10, height:38, borderRadius:5, background: familyColors[fi], display:"inline-block"}}/>
            <div>
              <h3>{f.label}</h3>
              <div className="muted small" style={{marginTop:6}}>
                <span className="count-chip">{f.ids.length}</span> compte{f.ids.length>1?"s":""} · {fmtPctRaw(v/TOTAL_VALUE*100,1)} du patrimoine
              </div>
            </div>
            <div className="stats">
              <div className="stat-block">
                <div className="k">Valeur</div>
                <div className="v">{fmtEur(v, 0)}</div>
              </div>
              <div className="stat-block">
                <div className="k">Plus-value</div>
                <div className={"v " + (pnlF>=0?"pos":"neg")}>{pnlF>=0?"+":""}{fmtEur(pnlF, 0)}</div>
              </div>
              <div className="stat-block">
                <div className="k">Performance</div>
                <div className="v"><Delta value={pnlFPct} digits={1}/></div>
              </div>
              <div>
                <button className="btn sm">+ Ajouter</button>
              </div>
            </div>
          </div>
          <div className="grid cols-3">
            {f.ids.map(id => {
              const e = ENVELOPES.find(x => x.id === id);
              const pnl = e.value - e.invested;
              const pnlPct = (pnl / e.invested) * 100;
              const capPct = e.plafond ? (e.value / e.plafond) * 100 : null;
              return (
                <div key={e.id} className="card" style={{padding:18}}>
                  <div className="row" style={{marginBottom: 14}}>
                    <EnvGlyph env={e} size={36}/>
                    <div className="grow">
                      <div className="serif" style={{fontSize:16, lineHeight:1.1, letterSpacing:"-0.02em", fontWeight:600}}>{e.label}</div>
                      <div className="muted small">{e.broker}</div>
                    </div>
                    <Delta value={pnlPct}/>
                  </div>
                  <div className="display-num" style={{fontSize:32, marginBottom:6, letterSpacing:"-0.04em"}}>
                    {fmtEur(e.value, 0).replace("€","")}<small> €</small>
                  </div>
                  <div className="row" style={{gap:6, fontSize:12, color:"var(--ink-3)"}}>
                    <span className="num">{fmtEur(pnl, 0)}</span>
                    <span>plus-value</span>
                    {e.cash > 0 && e.cash < e.value && (
                      <>
                        <span style={{marginLeft:"auto"}}>·</span>
                        <span className="num">{fmtEur(e.cash, 0)} cash</span>
                      </>
                    )}
                  </div>
                  {capPct !== null && (
                    <>
                      <div className="bar olive" style={{marginTop:14, height:4}}>
                        <span style={{ width: Math.min(100, capPct) + "%" }}/>
                      </div>
                      <div className="row small muted" style={{marginTop:6}}>
                        <span>Plafond {fmtEur(e.plafond, 0)}</span>
                        <span className="num" style={{marginLeft:"auto"}}>{fmtPctRaw(capPct, 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { ScreenDashboard, ScreenWealth, PerfChart });
