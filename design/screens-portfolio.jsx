/* global React, EnvGlyph, Delta, Sparkline, Bar, Donut */
const {
  ENVELOPES: ENVS_P, ETFS: ETFS_P, TARGETS: T_P,
  etfValue: eV, etfCost: eC, etfPnl: eP, etfPnlPct: ePP, etfDayPct: eD,
  fmtEur: $e, fmtNum: $n, fmtPct: $p, fmtPctRaw: $pr,
  SPARKS: SP, EXPOSURE_GEO, EXPOSURE_SECTOR, EXPOSURE_CURR,
} = window;

/* ============================================
   PORTFOLIO — positions table
   ============================================ */

function ScreenPortfolio() {
  const total = ETFS_P.reduce((a,e)=>a+eV(e),0);
  const totalCost = ETFS_P.reduce((a,e)=>a+eC(e),0);
  const totalPnl = total - totalCost;
  const totalDay = ETFS_P.reduce((a,e)=>a+(e.price - e.prev) * e.qty, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Toutes enveloppes confondues</div>
        <h1 className="page-title">Portefeuille <em>boursier</em></h1>
        <p className="page-sub">
          {ETFS_P.length} lignes, {$e(total, 0)} valorisés. PRU et plus-values
          calculés à partir de tes mouvements — aucune saisie manuelle de position.
        </p>
      </div>

      {/* Stats */}
      <div className="card" style={{padding:0, marginBottom: 24}}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)"}}>
          <Stat label="Valeur portefeuille" value={$e(total, 2)} sub={<><Delta value={totalDay/total*100}/> aujourd'hui</>}/>
          <Stat label="Coût total (PRU)"    value={$e(totalCost, 2)} sub="prix de revient"/>
          <Stat label="PV latente"          value={$e(totalPnl, 2)} sub={<><span className="pos">{$p((totalPnl/totalCost)*100)}</span></>}/>
          <Stat label="PV réalisée YTD"     value={$e(542.10, 2)} sub="ventes 2026"/>
          <Stat label="Dividendes 12M"      value={$e(184.66, 2)} sub="14 paiements"/>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Positions</h2>
        <span className="section-sub">8 lignes</span>
        <div className="section-right">
          <div className="tabs">
            <button className="active">Toutes</button>
            <button>Core</button>
            <button>Satellite</button>
            <button>Obligations</button>
          </div>
          <button className="btn sm">Exporter</button>
        </div>
      </div>

      <div className="card" style={{padding: "4px 12px"}}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ETF</th>
              <th>Allocation</th>
              <th>Enveloppes</th>
              <th className="r">Qté</th>
              <th className="r">PRU</th>
              <th className="r">Cours</th>
              <th className="r">Jour</th>
              <th className="r">Valeur</th>
              <th className="r">PV latente</th>
              <th>Tendance 1A</th>
              <th>Poids</th>
            </tr>
          </thead>
          <tbody>
            {ETFS_P.map(e => {
              const v = eV(e);
              const pnl = eP(e);
              const pnlP = ePP(e) * 100;
              const dayP = eD(e) * 100;
              const weight = v / total * 100;
              return (
                <tr key={e.isin}>
                  <td>
                    <div>
                      <div className="row gap-12">
                        <span className="pill solid" style={{minWidth: 48, justifyContent:"center"}}>{e.ticker}</span>
                        <span className="serif-italic" style={{fontSize:15}}>{e.name}</span>
                      </div>
                      <div className="muted tiny" style={{marginTop:3}}>
                        {e.isin} · {e.issuer} · TER {$n(e.ter*100,2).replace(",",",")} %
                      </div>
                    </div>
                  </td>
                  <td><span className={"pill " + (e.alloc==="Core"?"olive":e.alloc==="Obligations"?"soft":"")}>{e.alloc}</span></td>
                  <td>
                    <div className="row">
                      {e.pea && <span className="pill soft" style={{fontSize:10}}>PEA</span>}
                      {!e.pea && <span className="pill soft" style={{fontSize:10}}>CTO</span>}
                    </div>
                  </td>
                  <td className="r num">{$n(e.qty, 0)}</td>
                  <td className="r num">{$n(e.pru, 2)} €</td>
                  <td className="r num">{$n(e.price, 2)} €</td>
                  <td className="r"><Delta value={dayP}/></td>
                  <td className="r num">{$n(v, 0)} €</td>
                  <td className="r">
                    <div className="num">{pnl >= 0 ? "+" : ""}{$n(pnl, 0)} €</div>
                    <div className="num tiny" style={{color: pnlP >= 0 ? "var(--gain)" : "var(--loss)"}}>{$p(pnlP)}</div>
                  </td>
                  <td><Sparkline data={SP[e.ticker]} fill /></td>
                  <td style={{minWidth: 100}}>
                    <div className="row gap-12">
                      <Bar pct={weight} max={40} className="thin olive"/>
                      <span className="num tiny" style={{minWidth: 36}}>{$n(weight, 1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Exposition */}
      <div className="section-head">
        <h2 className="section-title">Exposition <em>réelle</em></h2>
        <span className="section-sub">au-delà des noms d'indice</span>
      </div>
      <div className="grid cols-3">
        <ExposureCard title="Géographique" data={EXPOSURE_GEO}/>
        <ExposureCard title="Sectorielle" data={EXPOSURE_SECTOR}/>
        <ExposureCard title="Devises"      data={EXPOSURE_CURR}/>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

function ExposureCard({ title, data }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        <span className="card-sub">{data.length} catégories</span>
      </div>
      <div>
        {data.map((d, i) => (
          <div key={d.key} style={{marginBottom: 9}}>
            <div className="row" style={{marginBottom:4}}>
              <span style={{fontSize:13}}>{d.key}</span>
              <span className="num tiny" style={{marginLeft:"auto", color:"var(--ink-3)"}}>{$pr(d.pct, 1)}</span>
            </div>
            <Bar pct={d.pct} max={Math.max(...data.map(x=>x.pct))} className={i===0?"olive thin":"thin"}/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   ALLOCATION
   ============================================ */

function ScreenAllocation() {
  const total = ETFS_P.reduce((a,e)=>a+eV(e),0);
  // Real weights per ETF
  const realPct = {};
  ETFS_P.forEach(e => { realPct[e.ticker] = eV(e) / total * 100; });

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Stratégie</div>
        <h1 className="page-title">Allocation <em>cible</em> vs réel</h1>
        <p className="page-sub">
          Trois niveaux : la décision Actions/Obligations (stratégique), la décomposition
          Core/Satellite (tactique), puis le poids cible par ETF. Les écarts sont
          chiffrés et colorés — vert ≤ 2 pts, orange ≤ 5 pts, rouge au-delà.
        </p>
      </div>

      <div className="grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        {/* Strategic */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Stratégique <em>— Actions / Obligations</em></div>
            <span className="card-sub">Σ = 100%</span>
          </div>
          <div className="row" style={{gap:24}}>
            <Donut size={160} thickness={22} data={[
              { value: T_P.strategic.stocks, color: "var(--brand)" },
              { value: T_P.strategic.bonds, color: "var(--ink-3)" },
            ]}/>
            <div style={{flex:1}}>
              <AllocRow label="Actions" target={90} real={92.6}/>
              <AllocRow label="Obligations" target={10} real={7.4}/>
              <div className="divider-soft"/>
              <div className="kv"><dt>Drift max</dt><dd>+2,6 pts</dd></div>
              <div className="kv"><dt>Statut</dt><dd><span className="pill gain"><span className="dot"/>Aligné</span></dd></div>
            </div>
          </div>
        </div>

        {/* Tactic */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Tactique <em>— Core / Satellite / Oblig</em></div>
            <span className="card-sub">Σ = 100%</span>
          </div>
          <div className="row" style={{gap:24}}>
            <Donut size={160} thickness={22} data={[
              { value: T_P.tactic.core, color: "var(--brand)" },
              { value: T_P.tactic.satellite, color: "#8C6E2A" },
              { value: T_P.tactic.bonds, color: "var(--ink-3)" },
            ]}/>
            <div style={{flex:1}}>
              <AllocRow label="Core" target={72} real={71.2}/>
              <AllocRow label="Satellite" target={18} real={21.4}/>
              <AllocRow label="Obligations" target={10} real={7.4}/>
              <div className="divider-soft"/>
              <div className="kv"><dt>Drift max</dt><dd>+3,4 pts</dd></div>
              <div className="kv"><dt>Statut</dt><dd><span className="pill warn"><span className="dot"/>Drift léger</span></dd></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Par <em>ETF</em></h2>
        <span className="section-sub">poids cible dans le portefeuille global</span>
        <div className="section-right">
          <button className="btn sm">Modifier la cible</button>
          <button className="btn sm primary">Plan de rebalancing</button>
        </div>
      </div>

      <div className="card" style={{padding:"4px 12px"}}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ETF</th>
              <th className="r">Cible</th>
              <th className="r">Réel</th>
              <th className="r">Drift</th>
              <th style={{width:"40%"}}>Visualisation</th>
              <th className="r">Action suggérée</th>
            </tr>
          </thead>
          <tbody>
            {ETFS_P.filter(e=>T_P.etf[e.ticker]).map(e => {
              const tgt = T_P.etf[e.ticker];
              const real = realPct[e.ticker];
              const drift = real - tgt;
              const sev = Math.abs(drift) <= 2 ? "gain" : Math.abs(drift) <= 5 ? "warn" : "loss";
              const action = drift > 5 ? "Vendre" : drift < -3 ? "Acheter" : "Tenir";
              const actionAmount = Math.abs(drift) / 100 * total;
              return (
                <tr key={e.isin}>
                  <td>
                    <div className="row gap-12">
                      <span className="pill solid">{e.ticker}</span>
                      <span className="muted small">{e.alloc}</span>
                    </div>
                  </td>
                  <td className="r num">{$n(tgt, 0)} %</td>
                  <td className="r num">{$n(real, 1)} %</td>
                  <td className="r">
                    <span className={"num " + (drift > 0 ? "pos" : drift < 0 ? "neg" : "")}>
                      {drift >= 0 ? "+" : ""}{$n(drift, 1)} pts
                    </span>
                  </td>
                  <td>
                    <DriftBar target={tgt} real={real}/>
                  </td>
                  <td className="r">
                    <span className={"pill " + sev}>{action}</span>
                    {action !== "Tenir" && (
                      <div className="num tiny muted" style={{marginTop:3}}>
                        ≈ {$e(actionAmount, 0)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid" style={{gridTemplateColumns:"1fr 1fr", marginTop:24}}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Versions <em>de stratégie</em></div>
            <span className="card-sub">historique</span>
          </div>
          <div>
            <VersionRow date="14 mars 2026" v="v3" current desc="Core 72% / Satellite 18% / Oblig 10%"/>
            <VersionRow date="02 janv. 2025" v="v2" desc="Core 70% / Satellite 20% / Oblig 10%"/>
            <VersionRow date="20 août 2024" v="v1" desc="Core 60% / Satellite 30% / Oblig 10%"/>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Cohérence</div>
            <span className="card-sub">vérifications auto</span>
          </div>
          <div>
            <CheckRow ok label="Somme stratégique = 100 %" detail="90 + 10"/>
            <CheckRow ok label="Somme tactique = 100 %" detail="72 + 18 + 10"/>
            <CheckRow ok label="Somme ETF = 100 %" detail="32 + 18 + 12 + 10 + 10 + 10 + 8"/>
            <CheckRow warn label="Drift S&P 500 modéré" detail="+6,1 pts (seuil 5 pts)"/>
            <CheckRow ok label="Tous les ETF PEA sont éligibles" detail="6 / 6"/>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllocRow({ label, target, real }) {
  const drift = real - target;
  return (
    <div style={{marginBottom: 8}}>
      <div className="row" style={{marginBottom: 4}}>
        <span style={{fontSize: 13.5}}>{label}</span>
        <span className="num small" style={{marginLeft:"auto"}}>{$n(real, 1)} %</span>
        <span className="muted tiny">cible {$n(target, 0)} %</span>
        <Delta value={drift} suffix=" pts" digits={1}/>
      </div>
      <DriftBar target={target} real={real}/>
    </div>
  );
}

function DriftBar({ target, real }) {
  const max = Math.max(target, real, 30);
  return (
    <div style={{position:"relative", height: 6}}>
      <div className="bar" style={{height:6}}>
        <span style={{width: (real/max)*100 + "%", background:"var(--brand)"}}/>
      </div>
      <span style={{
        position:"absolute", top:-3, height:12, width:1,
        left: (target/max)*100 + "%",
        background:"var(--ink)",
      }}/>
    </div>
  );
}

function VersionRow({ date, v, desc, current }) {
  return (
    <div className="row" style={{padding:"10px 0", borderBottom:"1px solid var(--rule-soft)"}}>
      <span className="serif-italic" style={{fontSize:16, minWidth:30}}>{v}</span>
      <div className="grow">
        <div style={{fontSize:13}}>{desc}</div>
        <div className="muted tiny">{date}</div>
      </div>
      {current ? <span className="pill olive">Active</span> : <button className="btn sm ghost">Voir</button>}
    </div>
  );
}

function CheckRow({ ok, warn, label, detail }) {
  return (
    <div className="row" style={{padding:"9px 0", borderBottom:"1px solid var(--rule-soft)"}}>
      <span className={"pill " + (ok ? "gain" : warn ? "warn" : "loss")} style={{minWidth:20, justifyContent:"center"}}>
        {ok ? "✓" : warn ? "!" : "✗"}
      </span>
      <div className="grow">
        <div style={{fontSize:13}}>{label}</div>
        <div className="muted tiny num">{detail}</div>
      </div>
    </div>
  );
}

/* ============================================
   PERFORMANCE
   ============================================ */

function ScreenPerf() {
  const periods = [
    { p:"1J",  port:+0.62,  bench:+0.41 },
    { p:"1S",  port:+1.84,  bench:+1.62 },
    { p:"1M",  port:+3.42,  bench:+2.91 },
    { p:"3M",  port:+6.18,  bench:+5.42 },
    { p:"6M",  port:+11.4,  bench:+9.81 },
    { p:"YTD", port:+8.42,  bench:+7.34 },
    { p:"1A",  port:+19.6,  bench:+17.2 },
    { p:"3A",  port:+12.4,  bench:+11.1, ann:true },
    { p:"5A",  port:+10.8,  bench:+9.6,  ann:true },
    { p:"MAX", port:+9.42,  bench:+8.41, ann:true },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-eyebrow">Performance</div>
        <h1 className="page-title">Tu fais <em>+2,4 pts</em> mieux<br/>que le MSCI World cette année.</h1>
        <p className="page-sub">
          Performances nettes de frais, brutes de fiscalité. Le benchmark est calculé
          pondéré selon ta cible (90 % MSCI World + 10 % Bloomberg Euro Govt).
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Évolution <em>de la valeur</em></div>
          <span className="card-sub">12 mois glissants</span>
          <div className="card-right">
            <div className="tabs">
              {["1M","3M","6M","YTD","1A","3A","5A","MAX"].map(p => (
                <button key={p} className={p==="1A"?"active":""}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <window.PerfChart />
      </div>

      <div className="section-head">
        <h2 className="section-title">Multi-périodes</h2>
        <span className="section-sub">portefeuille vs benchmark</span>
      </div>

      <div className="card" style={{padding:"4px 12px"}}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Période</th>
              <th className="r">Portefeuille</th>
              <th className="r">Benchmark</th>
              <th className="r">Alpha</th>
              <th>Battue</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {periods.map(r => {
              const alpha = r.port - r.bench;
              return (
                <tr key={r.p}>
                  <td>
                    <span className="serif-italic" style={{fontSize:16}}>{r.p}</span>
                    {r.ann && <span className="muted tiny" style={{marginLeft:6}}>annualisé</span>}
                  </td>
                  <td className="r"><span className="num" style={{color:"var(--gain)"}}>{$p(r.port, 2)}</span></td>
                  <td className="r"><span className="num muted">{$p(r.bench, 2)}</span></td>
                  <td className="r"><Delta value={alpha}/></td>
                  <td>
                    <Bar pct={Math.max(0, alpha)} max={3} className="thin olive"/>
                  </td>
                  <td className="r"><button className="btn sm ghost">Détails</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid cols-3" style={{marginTop:24}}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Tracking <em>difference</em></div>
            <span className="card-sub">par ETF, sur 1 an</span>
          </div>
          <div>
            {[
              { t:"ESE",  td:-0.02, te:0.08 },
              { t:"CW8",  td:-0.18, te:0.21 },
              { t:"PCEU", td:+0.04, te:0.06 },
              { t:"PAEEM",td:-0.32, te:0.34 },
              { t:"RS2K", td:-0.22, te:0.41 },
            ].map(r => (
              <div key={r.t} className="row" style={{padding:"7px 0", borderBottom:"1px solid var(--rule-soft)"}}>
                <span className="pill solid" style={{minWidth: 48, justifyContent:"center"}}>{r.t}</span>
                <span style={{marginLeft:"auto"}} className="num small">{$p(r.td, 2)}</span>
                <span className="muted tiny num">±{$n(r.te, 2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Frais <em>cumulés</em></div>
            <span className="card-sub">2025</span>
          </div>
          <div className="display-num" style={{fontSize:34, marginBottom: 8}}>
            68,42 <small>€</small>
          </div>
          <div className="kv"><dt>Courtage</dt><dd>11,88 €</dd></div>
          <div className="kv"><dt>Gestion (TER)</dt><dd>52,18 €</dd></div>
          <div className="kv"><dt>Change</dt><dd>4,36 €</dd></div>
          <div className="divider-soft"/>
          <div className="kv"><dt>Coût annuel moy.</dt><dd>0,17 % du capital</dd></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Drawdowns</div>
            <span className="card-sub">depuis création</span>
          </div>
          <div>
            <DDRow date="oct. 2022" pct={-18.2} dur="47 j" recov="92 j"/>
            <DDRow date="août 2023" pct={-6.4} dur="12 j" recov="22 j"/>
            <DDRow date="avr. 2024" pct={-4.1} dur="9 j" recov="14 j"/>
          </div>
        </div>
      </div>
    </div>
  );
}

function DDRow({ date, pct, dur, recov }) {
  return (
    <div style={{padding:"9px 0", borderBottom:"1px solid var(--rule-soft)"}}>
      <div className="row">
        <span style={{fontSize:13}}>{date}</span>
        <span className="num neg" style={{marginLeft:"auto"}}>{$p(pct,1)}</span>
      </div>
      <div className="muted tiny num" style={{marginTop:2}}>chute {dur} · récupéré en {recov}</div>
    </div>
  );
}

Object.assign(window, { ScreenPortfolio, ScreenAllocation, ScreenPerf });
