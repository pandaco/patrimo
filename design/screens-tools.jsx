/* global React, EnvGlyph, Delta, Sparkline, Bar */
const {
  ENVELOPES: ENVS_X, ETFS: ETFS_X, TARGETS: TG_X, DIVIDENDS: DV_X, GLOSSARY: GL_X,
  etfValue: evX, fmtEur: $eX, fmtNum: $nX, fmtPct: $pX, fmtPctRaw: $prX, fmtDate: $dX,
} = window;

/* ============================================
   DCA HELPER
   ============================================ */

function ScreenDCA({ onNewTx }) {
  const [amount, setAmount] = React.useState(800);
  const [correction, setCorrection] = React.useState(true);

  // Use ETFs with target weights
  const etfs = ETFS_X.filter(e => TG_X.etf[e.ticker]);
  const total = etfs.reduce((a,e)=>a+evX(e),0);

  // Compute suggested split
  const rows = etfs.map(e => {
    const target = TG_X.etf[e.ticker];
    const realPct = evX(e) / total * 100;
    const drift = realPct - target;
    // With correction: top-up to bring to target post-investment, else flat target weight
    let weight;
    if (correction) {
      const targetValue = (target/100) * (total + amount);
      const need = targetValue - evX(e);
      weight = Math.max(0, need);
    } else {
      weight = (target/100) * amount;
    }
    return { e, target, realPct, drift, weight };
  });

  const totalWeight = rows.reduce((a,r)=>a+r.weight,0) || 1;
  const normalized = rows.map(r => ({...r, eur: (r.weight/totalWeight)*amount }));

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Dollar Cost Averaging</div>
        <h1 className="page-title">Lance ton <em>DCA</em> du mois.</h1>
        <p className="page-sub">
          Indique un montant, l'app le répartit selon ta cible. Avec correction,
          elle privilégie les ETF sous-pondérés ; sans correction, elle applique
          simplement la cible globale.
        </p>
      </div>

      <div className="grid" style={{gridTemplateColumns:"1fr 1.4fr"}}>
        {/* Left — input */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Montant <em>à investir</em></div>
            <span className="card-sub">objectif {$eX(window.USER.monthlyTarget, 0)}/mois</span>
          </div>

          <div style={{marginBottom: 20}}>
            <div className="display-num" style={{fontSize: 56, lineHeight:1}}>
              {$nX(amount, 0)} <small>€</small>
            </div>
            <input
              type="range" min="100" max="3000" step="50"
              value={amount} onChange={e=>setAmount(+e.target.value)}
              style={{width:"100%", marginTop:14, accentColor:"var(--brand)"}}
            />
            <div className="row muted small">
              <span>100 €</span>
              <span style={{marginLeft:"auto"}}>3 000 €</span>
            </div>
          </div>

          <div className="row" style={{gap:6, marginBottom:14, flexWrap:"wrap"}}>
            {[300, 500, 800, 1000, 1500, 2000].map(v => (
              <button key={v}
                className={"pill " + (amount===v?"solid":"")}
                style={{cursor:"pointer", padding:"4px 10px", fontSize:12}}
                onClick={()=>setAmount(v)}>
                {v} €
              </button>
            ))}
          </div>

          <div className="field" style={{marginBottom:0}}>
            <label>Enveloppe cible</label>
            <select defaultValue="pea">
              {ENVS_X.filter(e=>["pea","peapme","cto","av","per"].includes(e.id)).map(e=>(
                <option key={e.id} value={e.id}>{e.label} — {e.broker}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Mode de répartition</label>
            <div className="segmented" style={{width:"100%"}}>
              <button className={correction?"active":""} onClick={()=>setCorrection(true)} style={{flex:1}}>Avec correction</button>
              <button className={!correction?"active":""} onClick={()=>setCorrection(false)} style={{flex:1}}>Sans correction</button>
            </div>
            <div className="field-help">
              {correction
                ? "Ramène les lignes sous-pondérées vers la cible. Plus de rebalancing implicite."
                : "Applique simplement la cible globale au nouveau montant. Plus simple, moins corrigeant."}
            </div>
          </div>

          <div className="divider"/>

          <div className="kv"><dt>Cash dispo PEA</dt><dd>1 145,78 €</dd></div>
          <div className="kv"><dt>Frais estimés (Fortuneo)</dt><dd>1,98 €</dd></div>
          <div className="kv"><dt>Net investi</dt><dd>{$nX(amount - 2, 2)} €</dd></div>
        </div>

        {/* Right — split */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Répartition <em>suggérée</em></div>
            <span className="card-sub">{etfs.length} lignes · arrondi entier</span>
            <div className="card-right">
              <button className="btn sm">Modifier la cible</button>
            </div>
          </div>

          <table className="tbl tbl-compact">
            <thead>
              <tr>
                <th>ETF</th>
                <th className="r">Cible</th>
                <th className="r">Réel</th>
                <th className="r">Drift</th>
                <th className="r">À acheter</th>
                <th className="r">Qté</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {normalized.map(r => {
                const qty = Math.floor(r.eur / r.e.price);
                const cost = qty * r.e.price;
                return (
                  <tr key={r.e.isin}>
                    <td>
                      <div className="row gap-12">
                        <span className="pill solid">{r.e.ticker}</span>
                        <span className="serif-italic small">{r.e.name.split(" ").slice(0,3).join(" ")}</span>
                      </div>
                    </td>
                    <td className="r num">{$nX(r.target,0)} %</td>
                    <td className="r num small">{$nX(r.realPct,1)} %</td>
                    <td className="r">
                      <span className={"num small " + (r.drift>0?"pos":r.drift<0?"neg":"")}>
                        {r.drift>=0?"+":""}{$nX(r.drift,1)}
                      </span>
                    </td>
                    <td className="r num"><b>{$nX(cost,2)} €</b></td>
                    <td className="r num">{qty}</td>
                    <td>
                      <div className="row gap-12">
                        <Bar pct={(cost/amount)*100} max={50} className="thin olive" />
                        <span className="num tiny">{$nX(cost/amount*100,0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:"var(--paper-2)"}}>
                <td colSpan="4" className="r"><b>Total</b></td>
                <td className="r num"><b>{$nX(normalized.reduce((a,r)=>a+Math.floor(r.eur/r.e.price)*r.e.price,0),2)} €</b></td>
                <td className="r num"><b>{normalized.reduce((a,r)=>a+Math.floor(r.eur/r.e.price),0)}</b></td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div className="recap" style={{marginTop:16}}>
            <div className="recap-line"><span>Cash après opération</span><b>{$nX(1145.78 + amount - normalized.reduce((a,r)=>a+Math.floor(r.eur/r.e.price)*r.e.price,0),2)} €</b></div>
            <div className="recap-line"><span>Drift global après</span><b>réduit de 3,4 à 1,2 pts</b></div>
            <div className="recap-line"><span>Frais courtage estimés</span><b>{$nX(normalized.length * 0.99,2)} €</b></div>
            <div className="recap-line total"><span><b>Vérification cohérence</b></span><span className="pill gain"><span className="dot"/>OK</span></div>
          </div>

          <div className="row" style={{marginTop:16, gap:8, justifyContent:"flex-end"}}>
            <button className="btn">Programmer mensuel</button>
            <button className="btn primary" onClick={onNewTx}>Exécuter maintenant →</button>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Plans <em>DCA actifs</em></h2>
        <span className="section-sub">2 récurrents</span>
      </div>
      <div className="grid cols-2">
        <DcaPlanCard name="DCA Core mensuel" amount="500 €" freq="le 5 de chaque mois" next="5 juin 2026" envelope={ENVS_X[0]} lines={[{t:"ESE",p:60},{t:"PCEU",p:25},{t:"PAEEM",p:15}]} ok/>
        <DcaPlanCard name="DCA Satellite trimestriel" amount="300 €" freq="le 15 du trim." next="15 juill. 2026" envelope={ENVS_X[2]} lines={[{t:"RS2K",p:50},{t:"PAEEM",p:50}]}/>
      </div>
    </div>
  );
}

function DcaPlanCard({ name, amount, freq, next, envelope, lines, ok }) {
  return (
    <div className="card">
      <div className="row" style={{marginBottom: 14}}>
        <EnvGlyph env={envelope} size={32}/>
        <div className="grow">
          <div className="serif" style={{fontSize:18, lineHeight:1.1, letterSpacing:"-0.01em"}}>{name}</div>
          <div className="muted small">{envelope.label} · {freq}</div>
        </div>
        <span className={"pill " + (ok?"gain":"info")}>
          <span className="dot"/>{ok ? "Actif" : "Programmé"}
        </span>
      </div>
      <div className="display-num" style={{fontSize:28, lineHeight:1}}>{amount} <small>par exécution</small></div>
      <div className="kv" style={{marginTop:14}}><dt>Prochaine exécution</dt><dd>{next}</dd></div>
      <div className="kv"><dt>Exécutions cumulées</dt><dd>14 (7 000 €)</dd></div>
      <div className="divider-soft"/>
      <div style={{fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom:8}}>Composition</div>
      {lines.map(l => (
        <div key={l.t} className="row" style={{padding:"4px 0"}}>
          <span className="pill solid" style={{minWidth:48, justifyContent:"center", fontSize:10.5}}>{l.t}</span>
          <Bar pct={l.p} className="thin olive" /><span className="num tiny" style={{minWidth: 32, textAlign:"right"}}>{l.p}%</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   CALENDAR
   ============================================ */

function ScreenCalendar() {
  // Build a 5-month grid (May to Sep 2026)
  const months = [
    { y:2026, m:5,  label:"Mai" },
    { y:2026, m:6,  label:"Juin" },
    { y:2026, m:7,  label:"Juillet" },
    { y:2026, m:8,  label:"Août" },
    { y:2026, m:9,  label:"Septembre" },
  ];

  const events = [
    { date:"2026-05-20", type:"DCA",  label:"DCA Core 500 €", env:"pea" },
    { date:"2026-05-28", type:"DIV",  label:"Dividende IWDA · ~19,40 €", env:"cto" },
    { date:"2026-06-05", type:"DCA",  label:"DCA Core 500 €", env:"pea" },
    { date:"2026-06-15", type:"DIV",  label:"Dividende IWDA · 19,40 €", env:"cto" },
    { date:"2026-06-28", type:"DIV",  label:"Dividende OBLI · 14,20 €", env:"pea" },
    { date:"2026-07-02", type:"DIV",  label:"Dividende IWDA · 20,10 €", env:"cto" },
    { date:"2026-07-05", type:"DCA",  label:"DCA Core 500 €", env:"pea" },
    { date:"2026-07-15", type:"DCA",  label:"DCA Satellite 300 €", env:"cto" },
    { date:"2026-08-05", type:"DCA",  label:"DCA Core 500 €", env:"pea" },
    { date:"2026-08-12", type:"MARK", label:"PEA atteint 5 ans · retraits possibles", env:"pea" },
    { date:"2026-08-15", type:"DIV",  label:"Dividende RS2K · 4,20 €", env:"cto" },
    { date:"2026-09-05", type:"DCA",  label:"DCA Core 500 €", env:"pea" },
    { date:"2026-09-30", type:"DIV",  label:"Dividende IWDA · 21,60 €", env:"cto" },
  ];

  // Totals for header
  const divTotal = events.filter(e=>e.type==="DIV").reduce((a,e)=>{
    const m = e.label.match(/([0-9,]+) €/);
    return a + (m ? parseFloat(m[1].replace(",",".")) : 0);
  }, 0);
  const dcaTotal = events.filter(e=>e.type==="DCA").reduce((a,e)=>{
    const m = e.label.match(/([0-9]+) €/);
    return a + (m ? parseFloat(m[1]) : 0);
  }, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Calendrier · Mai → Septembre 2026</div>
        <h1 className="page-title">Tout ce qui <em>arrive</em><br/>dans les 5 prochains mois.</h1>
      </div>

      <div className="grid cols-4" style={{marginBottom:24}}>
        <SummaryCard k="Dividendes prévus" v={$eX(divTotal,2)} sub="6 paiements"/>
        <SummaryCard k="DCA programmés" v={$eX(dcaTotal,0)} sub="6 exécutions"/>
        <SummaryCard k="Dates clés" v="3" sub="dont 5 ans PEA"/>
        <SummaryCard k="Net cash entrée" v={$eX(divTotal - dcaTotal,0)} sub="hors revalo"/>
      </div>

      <div className="grid" style={{gridTemplateColumns:"repeat(5, 1fr)", gap:12}}>
        {months.map(mo => {
          const monthEvents = events.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === mo.y && d.getMonth() === mo.m - 1;
          });
          const monthGrid = buildMonthGrid(mo.y, mo.m, monthEvents);
          return (
            <div key={mo.m} className="card" style={{padding: 14}}>
              <div className="row" style={{marginBottom: 10}}>
                <span className="serif-italic" style={{fontSize: 16}}>{mo.label}</span>
                <span className="muted tiny num" style={{marginLeft:"auto"}}>{monthEvents.length}</span>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap: 2, fontSize: 10}}>
                {["L","M","M","J","V","S","D"].map((d,i) => (
                  <div key={i} style={{textAlign:"center", color:"var(--ink-4)", padding: 2}}>{d}</div>
                ))}
                {monthGrid.map((cell, i) => (
                  <div key={i} style={{
                    aspectRatio: "1",
                    display:"grid", placeItems:"center",
                    fontSize: 10.5,
                    color: cell.day ? (cell.event ? "var(--paper)" : "var(--ink-2)") : "var(--ink-4)",
                    background: cell.event ? eventColor(cell.event.type) : "transparent",
                    borderRadius: 3,
                    cursor: cell.event ? "pointer" : "default",
                    position:"relative",
                    fontFamily: "var(--font-mono)",
                  }} title={cell.event?.label}>
                    {cell.day || ""}
                  </div>
                ))}
              </div>
              <div className="divider-soft"/>
              <div style={{fontSize: 11}}>
                {monthEvents.slice(0, 4).map((e, i) => (
                  <div key={i} className="row" style={{padding:"3px 0", gap: 6}}>
                    <span style={{
                      width:6, height:6, borderRadius:"50%",
                      background: eventColor(e.type),
                    }}/>
                    <span className="num muted" style={{minWidth: 22, fontSize:10}}>{e.date.slice(8,10)}</span>
                    <span style={{flex:1, fontSize: 11, lineHeight:1.3}}>{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{marginTop: 16, gap: 14, fontSize:12}}>
        <span className="row gap-12">
          <span style={{width:10, height:10, borderRadius:3, background:eventColor("DIV")}}/>
          Dividende
        </span>
        <span className="row gap-12">
          <span style={{width:10, height:10, borderRadius:3, background:eventColor("DCA")}}/>
          DCA programmé
        </span>
        <span className="row gap-12">
          <span style={{width:10, height:10, borderRadius:3, background:eventColor("MARK")}}/>
          Date clé
        </span>
      </div>
    </div>
  );
}

function buildMonthGrid(y, m, events) {
  const first = new Date(y, m-1, 1);
  const firstDay = (first.getDay() + 6) % 7; // ISO monday=0
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const event = events.find(e => e.date === dateStr);
    cells.push({ day: d, event });
  }
  return cells;
}

function eventColor(t) {
  return ({ DIV: "var(--gain)", DCA: "var(--brand)", MARK: "var(--warn)" })[t];
}

function SummaryCard({ k, v, sub }) {
  return (
    <div className="card tight">
      <div className="eyebrow" style={{marginBottom:6}}>{k}</div>
      <div className="serif" style={{fontSize:26, lineHeight:1, letterSpacing:"-0.01em"}}>{v}</div>
      <div className="muted small" style={{marginTop:4}}>{sub}</div>
    </div>
  );
}

/* ============================================
   ETF COMPARATOR
   ============================================ */

function ScreenCompare() {
  const candidates = ETFS_X.filter(e=>["ESE","CW8","PCEU","IWDA"].includes(e.ticker));
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Comparateur ETF</div>
        <h1 className="page-title">Trouve l'ETF <em>le plus efficace</em><br/>pour ton objectif.</h1>
        <p className="page-sub">
          Côte à côte : TER, taille du fonds, tracking difference, éligibilité PEA,
          frais de courtage chez ton broker, et le coût total estimé sur 5 ans avec
          ton DCA mensuel.
        </p>
      </div>

      <div className="row" style={{marginBottom: 16, gap: 8, flexWrap:"wrap"}}>
        <span className="pill soft">MSCI World</span>
        <span className="pill soft">Capitalisant</span>
        <span className="pill soft">Éligibilité PEA</span>
        <span className="pill soft">TER &lt; 0,30 %</span>
        <button className="btn sm ghost" style={{marginLeft:"auto"}}>+ Filtre</button>
      </div>

      <div className="grid cols-4">
        {candidates.map(e => (
          <CompareCard key={e.isin} etf={e} highlight={e.ticker==="CW8"}/>
        ))}
      </div>

      <div className="section-head">
        <h2 className="section-title">Critères <em>détaillés</em></h2>
        <span className="section-sub">comparaison ligne par ligne</span>
      </div>

      <div className="card" style={{padding:"4px 12px"}}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Critère</th>
              {candidates.map(e => <th key={e.isin}>{e.ticker}</th>)}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="TER annuel"               vals={candidates.map(e => $prX(e.ter*100,2))}/>
            <CompareRow label="Réplication"              vals={candidates.map(e => e.repli)}/>
            <CompareRow label="Politique distribution"   vals={candidates.map(e => e.distrib)}/>
            <CompareRow label="Éligibilité PEA"          vals={candidates.map(e => e.pea ? "✓" : "✗")}/>
            <CompareRow label="Émetteur"                 vals={candidates.map(e => e.issuer)}/>
            <CompareRow label="Indice répliqué"          vals={candidates.map(e => e.index)}/>
            <CompareRow label="Devise cotation"          vals={candidates.map(e => e.currency)}/>
            <CompareRow label="Tracking Diff. 1A"        vals={["−0,02 %","−0,18 %","+0,04 %","−0,06 %"]}/>
            <CompareRow label="Tracking Error 1A"        vals={["0,08 %","0,21 %","0,06 %","0,12 %"]}/>
            <CompareRow label="Frais Fortuneo (500 €)"   vals={["0,99 €","0,99 €","0,99 €","—"]}/>
            <CompareRow label="Frais Bourso (500 €)"     vals={["1,99 €","1,99 €","1,99 €","1,99 €"]}/>
            <CompareRow label="Spread bid-ask moyen"     vals={["0,04 %","0,09 %","0,07 %","0,03 %"]}/>
            <CompareRow label="Taille du fonds"          vals={["12,8 Mds €","2,1 Mds €","1,4 Mds €","52,4 Mds €"]}/>
            <CompareRow label="Date création"            vals={["2010","2015","2018","2009"]}/>
            <CompareRow label="Perf 1A"                  vals={candidates.map(e => $pX(e.perf1y,1))} highlight/>
            <CompareRow label="TCO 5 ans (500 €/mois)"   vals={["228 €","412 €","268 €","318 €"]}/>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareCard({ etf, highlight }) {
  return (
    <div className="card" style={{ borderColor: highlight ? "var(--brand)" : undefined, borderWidth: highlight ? 2 : 1 }}>
      <div className="row" style={{marginBottom:14}}>
        <span className="pill solid">{etf.ticker}</span>
        <span className="muted small">{etf.issuer}</span>
        {highlight && <span className="pill olive" style={{marginLeft:"auto"}}>Recommandé</span>}
      </div>
      <div className="serif-italic" style={{fontSize:16, lineHeight:1.2, marginBottom:6}}>{etf.name}</div>
      <div className="muted tiny num" style={{marginBottom:14}}>{etf.isin}</div>

      <div className="kv"><dt>TER</dt><dd>{$prX(etf.ter*100,2)}</dd></div>
      <div className="kv"><dt>Réplication</dt><dd>{etf.repli}</dd></div>
      <div className="kv"><dt>Distribution</dt><dd>{etf.distrib}</dd></div>
      <div className="kv"><dt>PEA</dt><dd>{etf.pea ? "✓ éligible" : "✗ CTO seul"}</dd></div>
      <div className="kv"><dt>Devise</dt><dd>{etf.currency}</dd></div>
      <div className="divider-soft"/>
      <div className="kv"><dt>Perf 1A</dt><dd className="pos">{$pX(etf.perf1y,1)}</dd></div>
      <div className="kv"><dt>Perf YTD</dt><dd className="pos">{$pX(etf.perfYtd,1)}</dd></div>
    </div>
  );
}

function CompareRow({ label, vals, highlight }) {
  return (
    <tr>
      <td className="muted small">{label}</td>
      {vals.map((v, i) => (
        <td key={i} className="num small" style={{ fontWeight: highlight ? 500 : 400 }}>
          {v}
        </td>
      ))}
    </tr>
  );
}

/* ============================================
   GLOSSARY
   ============================================ */

function ScreenGlossary() {
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Glossaire</div>
        <h1 className="page-title">Le vocabulaire <em>essentiel</em>.</h1>
        <p className="page-sub">
          Tout terme utilisé dans l'app — défini, expliqué et illustré par un
          exemple concret tiré de ton portefeuille.
        </p>
      </div>

      <div className="grid cols-2">
        {GL_X.map(g => (
          <div key={g.term} className="card">
            <div className="row" style={{marginBottom: 10}}>
              <span className="pill solid">{g.term}</span>
              <span className="serif-italic" style={{fontSize: 18, marginLeft: 8}}>{g.title}</span>
            </div>
            <p style={{margin:"0 0 12px", fontSize: 13.5, color:"var(--ink-2)"}}>{g.body}</p>
            <div className="recap">
              <span className="muted tiny" style={{textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4, display:"block"}}>Exemple</span>
              {g.example}
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2 className="section-title">Enveloppes <em>fiscales</em></h2>
        <span className="section-sub">7 grandes familles</span>
      </div>

      <div className="grid cols-3">
        {[
          { code:"PEA", desc:"Plan d'Épargne en Actions", plaf:"150 000 €", blocking:"5 ans", tax:"Exo IR après 5 ans, PS 17,2 %" },
          { code:"PEA-PME", desc:"PME / ETI européennes", plaf:"225 000 € (cumul)", blocking:"5 ans", tax:"Idem PEA" },
          { code:"CTO", desc:"Compte-Titres Ordinaire", plaf:"Aucun", blocking:"Aucun", tax:"PFU 30 %" },
          { code:"AV", desc:"Assurance-Vie", plaf:"Aucun", blocking:"8 ans favorable", tax:"Abattement 4 600 €/an après 8 ans" },
          { code:"PER", desc:"Plan d'Épargne Retraite", plaf:"Aucun (déductibilité plafonnée)", blocking:"Retraite", tax:"Versements déductibles" },
          { code:"PEE", desc:"Plan d'Épargne Entreprise", plaf:"25 % rev. brut", blocking:"5 ans", tax:"Exo IR sur revenus" },
          { code:"Livret A", desc:"Livret réglementé", plaf:"22 950 €", blocking:"Aucun", tax:"Exonéré" },
          { code:"LDDS", desc:"Livret Dév. Durable & Solidaire", plaf:"12 000 €", blocking:"Aucun", tax:"Exonéré" },
          { code:"LEP", desc:"Livret d'Épargne Populaire", plaf:"10 000 €", blocking:"Aucun", tax:"Exonéré · RFR plafonné" },
        ].map(e => (
          <div key={e.code} className="card tight">
            <div className="row" style={{marginBottom: 8}}>
              <span className="pill solid">{e.code}</span>
              <span className="serif-italic small" style={{marginLeft: 6}}>{e.desc}</span>
            </div>
            <div className="kv"><dt>Plafond</dt><dd className="small">{e.plaf}</dd></div>
            <div className="kv"><dt>Blocage</dt><dd className="small">{e.blocking}</dd></div>
            <div className="kv"><dt>Fiscalité</dt><dd className="small" style={{textAlign:"right", maxWidth:"60%"}}>{e.tax}</dd></div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDCA, ScreenCalendar, ScreenCompare, ScreenGlossary });
