/* global React, EnvGlyph */
const { useState: useS } = React;

function TxModal({ onClose }) {
  const [type, setType] = useS("BUY");
  const [envelope, setEnvelope] = useS("pea");
  const [etfTicker, setEtfTicker] = useS("ESE");
  const [qty, setQty] = useS(17);
  const [price, setPrice] = useS(39.42);
  const [date, setDate] = useS("2026-05-16");
  const [fees, setFees] = useS(0.99);

  // Focus first interactive element + restore on close
  React.useEffect(() => {
    const prev = document.activeElement;
    const firstBtn = document.querySelector('.type-picker button.active');
    firstBtn?.focus();
    return () => prev?.focus?.();
  }, []);

  const env = window.ENVELOPES.find(e => e.id === envelope);
  const etf = window.ETFS.find(e => e.ticker === etfTicker);

  const showAsset = ["BUY","SELL","DIVIDEND"].includes(type);
  const showQtyPrice = ["BUY","SELL"].includes(type);
  const amount = showQtyPrice ? qty * price : 0;
  const total = type === "BUY" ? amount + fees : amount - fees;

  // Allocation impact preview (only meaningful for BUY)
  const target = window.TARGETS.etf[etfTicker] || 0;
  const totalValue = window.ETFS.reduce((a,e)=>a+window.etfValue(e),0);
  const curWeight = etf ? window.etfValue(etf) / totalValue * 100 : 0;
  const newWeight = etf ? (window.etfValue(etf) + amount) / (totalValue + amount) * 100 : 0;

  const types = [
    { id:"BUY",      label:"Achat",     sym:"+" },
    { id:"SELL",     label:"Vente",     sym:"−" },
    { id:"DEPOSIT",  label:"Dépôt",     sym:"↘" },
    { id:"WITHDRAWAL",label:"Retrait",  sym:"↗" },
    { id:"DIVIDEND", label:"Dividende", sym:"◆" },
    { id:"INTEREST", label:"Intérêts",  sym:"◆" },
  ];

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        onClick={e=>e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <div style={{fontSize:11.5, fontWeight:500, color:"var(--ink-3)", marginBottom:4}}>
              Nouveau mouvement
            </div>
            <div className="modal-title" id="tx-modal-title">Saisis ton <em style={{fontStyle:"italic"}}>opération</em></div>
          </div>
          <button className="btn ghost sm" onClick={onClose} style={{marginLeft:"auto"}} aria-label="Fermer le dialogue">✕</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Type de mouvement</label>
            <div className="type-picker">
              {types.map(t => (
                <button key={t.id} className={type===t.id?"active":""} onClick={()=>setType(t.id)}>
                  <span className="sym">{t.sym}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Enveloppe</label>
              <select value={envelope} onChange={e=>setEnvelope(e.target.value)}>
                {window.ENVELOPES.map(e => (
                  <option key={e.id} value={e.id}>{e.label} — {e.broker}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>

          {showAsset && (
            <div className="field">
              <label>ETF / Actif</label>
              <select value={etfTicker} onChange={e=>setEtfTicker(e.target.value)}>
                {window.ETFS.map(e => (
                  <option key={e.isin} value={e.ticker}>
                    {e.ticker} — {e.name}{!e.pea && envelope==="pea" ? "  · ⚠ non éligible PEA":""}
                  </option>
                ))}
              </select>
              {etf && envelope==="pea" && !etf.pea && (
                <div className="field-help" style={{color:"var(--loss)"}}>
                  ⚠ {etf.ticker} n'est pas éligible PEA. Choisis CTO ou un ETF de substitution.
                </div>
              )}
              {etf && (
                <div className="field-help">
                  Dernier cours {window.fmtEur(etf.price, 2)} · TER {window.fmtPctRaw(etf.ter*100, 2)} · {etf.distrib}
                </div>
              )}
            </div>
          )}

          {showQtyPrice && (
            <div className="field-row">
              <div className="field">
                <label>Quantité</label>
                <input type="number" className="num-input" value={qty} onChange={e=>setQty(+e.target.value)}/>
              </div>
              <div className="field">
                <label>Prix unitaire (€)</label>
                <input type="number" step="0.01" className="num-input" value={price} onChange={e=>setPrice(+e.target.value)}/>
                <div className="field-help">Prix live à l'instant : {etf && window.fmtEur(etf.price, 2)}</div>
              </div>
            </div>
          )}

          {!showQtyPrice && (
            <div className="field">
              <label>Montant (€)</label>
              <input type="number" step="0.01" className="num-input" defaultValue="500"/>
            </div>
          )}

          {showQtyPrice && (
            <div className="field">
              <label>Frais courtage (€)</label>
              <input type="number" step="0.01" className="num-input" value={fees} onChange={e=>setFees(+e.target.value)}/>
              <div className="field-help">Auto-calculé · Fortuneo : 0,99 € ≤ 500 €, 0,35 % au-delà</div>
            </div>
          )}

          {/* Recap */}
          <div className="recap" style={{marginTop: 18}}>
            <div style={{fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-3)", marginBottom: 8}}>
              Récapitulatif
            </div>
            {showQtyPrice ? (
              <>
                <div style={{fontSize: 14, marginBottom: 8}}>
                  {type==="BUY"?"Achat":"Vente"} de <b>{qty} × {etfTicker}</b> à <b>{window.fmtEur(price,2)}</b> = <b>{window.fmtEur(amount, 2)}</b>
                  {type==="BUY" && <> + frais {window.fmtEur(fees,2)} = <b>{window.fmtEur(total, 2)}</b></>}
                </div>
                <div className="recap-line">
                  <span>Cash {env.code} après</span>
                  <b>{window.fmtEur(env.cash + (type==="BUY"?-total:total), 2)}</b>
                </div>
                <div className="recap-line">
                  <span>Poids {etfTicker} après</span>
                  <span>
                    <b>{window.fmtNum(newWeight, 1)} %</b>
                    <span className="muted" style={{marginLeft:6}}>(cible {window.fmtNum(target, 0)} %)</span>
                    <span className={"delta " + (Math.abs(newWeight - target) <= 2 ? "up" : "flat")} style={{marginLeft: 8}}>
                      {newWeight >= target ? "+" : ""}{window.fmtNum(newWeight - target, 1)} pts
                    </span>
                  </span>
                </div>
                <div className="recap-line total">
                  <span><b>Cohérence</b></span>
                  <span className="pill gain"><span className="dot"/>Cash suffisant · Drift acceptable</span>
                </div>
              </>
            ) : (
              <div className="recap-line">
                <span>{type==="DEPOSIT"?"Dépôt":"Mouvement"} sur {env.label}</span>
                <b>500,00 €</b>
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn">Enregistrer + saisir un autre</button>
          <button className="btn primary" onClick={onClose}>Enregistrer →</button>
        </div>
      </div>
    </div>
  );
}

window.TxModal = TxModal;
