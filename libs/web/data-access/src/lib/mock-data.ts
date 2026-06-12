import {
  Broker, GlossaryEntry, Targets, TransactionLabel, TransactionType,
} from './models';

export const TRANSACTION_LABELS: Record<TransactionType, TransactionLabel> = {
  BUY:        { label:'Achat',    sym:'+', dir:'+' },
  SELL:       { label:'Vente',    sym:'−', dir:'−' },
  DEPOSIT:    { label:'Dépôt',    sym:'↘', dir:'+' },
  WITHDRAWAL: { label:'Retrait',  sym:'↗', dir:'−' },
  DIVIDEND:   { label:'Dividende',sym:'€', dir:'+' },
  INTEREST:   { label:'Intérêts', sym:'%', dir:'+' },
};

export const MOCK_TARGETS: Targets = {
  strategic: { stocks: 90, bonds: 10 },
  tactic:    { core: 72, satellite: 18, bonds: 10 },
  etf:       { ESE:32, CW8:18, PCEU:12, EWLD:10, IWDA:10, PAEEM:10, RS2K:8 },
  envelope:  { pea:60, peapme:5, cto:12, av:12, per:8, pee:3 },
};

export const MOCK_GLOSSARY: GlossaryEntry[] = [
  { term:'Position',    title:'Position sur un actif',       body:'Ce que tu détiens d\'un ETF à l\'instant T : la quantité d\'unités et leur prix moyen d\'achat (PRU). Une position est dérivée automatiquement de l\'historique des transactions — jamais saisie à la main. Seuls les BUY/SELL la font bouger ; les DEPOSIT, DIVIDEND et INTEREST n\'affectent que le cash de l\'enveloppe.', example:'2 achats ESE (10 à 38,50 € puis 12 à 39,30 €) → position 22 unités, PRU 38,94 €.' },
  { term:'PRU',         title:'Prix de Revient Unitaire',    body:'Coût moyen pondéré d\'achat d\'un titre. Σ (quantité × prix d\'achat + frais) / quantité totale achetée.', example:'10 ESE à 32 € + 5 ESE à 38 € = (320 + 190) / 15 = 34 € de PRU.' },
  { term:'PV latente',  title:'Plus-value latente',          body:'Gain non réalisé : différence entre la valeur actuelle de la position et son PRU.',                         example:'47 ESE × (39,42 − 32,18) = +340,28 €.' },
  { term:'PnL',         title:'Profit and Loss',             body:'Anglais financier pour la plus-value (ou moins-value) latente d\'une position : value − invested. Positive = tu gagnerais en vendant maintenant. PnL % = (cours actuel / PRU − 1) × 100. Sur Patrimo, PnL et PV latente sont synonymes.', example:'PRU 32,18 €, cours actuel 39,42 €, qty 47 → PnL = +340,28 € (+22,5 %).' },
  { term:'TER',         title:'Total Expense Ratio',         body:'Frais de gestion annuels d\'un ETF, prélevés sur la performance.',                                           example:'TER 0,15% sur 10 000 € = 15 €/an, prélevés à la source.' },
  { term:'Drift',       title:'Écart d\'allocation',         body:'Différence entre la pondération réelle d\'une ligne et sa cible.',                                           example:'ESE cible 32%, réel 38,1% → drift +6,1 pts.' },
  { term:'DCA',         title:'Dollar Cost Averaging',       body:'Investissement régulier d\'un montant fixe, indépendant du cours. Lisse le prix d\'entrée.',                 example:'500 €/mois sur PEA répartis selon l\'allocation cible.' },
  { term:'Capitalisant',title:'Politique de distribution',   body:'Un ETF capitalisant réinvestit automatiquement les dividendes dans le fonds. Fiscalité reportée.',           example:'ESE est capitalisant : pas de dividende cash, valorisation accrue.' },
  { term:'YTD',         title:'Year To Date — depuis le 1ᵉʳ janvier', body:'Tout indicateur « YTD » se mesure du 1ᵉʳ janvier à aujourd\'hui, et repart de zéro chaque année. Utile pour la fiscalité (les plus-values se déclarent par année civile) et pour suivre l\'année en cours sans le bruit des années passées.', example:'PV réalisée YTD au 13 juin = uniquement les ventes passées entre janvier et juin de cette année.' },
  { term:'CAGR',        title:'Taux de croissance annuel composé', body:'Le rendement annuel moyen « lissé » : le taux unique qui, appliqué chaque année, aurait produit la même performance totale. Gomme les hauts et les bas pour comparer des placements sur des durées différentes.', example:'De 10 000 € à 14 000 € en 3 ans → CAGR ≈ 11,9 %/an, même si une des trois années était négative.' },
  { term:'TRI',         title:'Taux de Rentabilité Interne (XIRR)', body:'Rendement annualisé qui tient compte du moment où chaque euro a été versé. Plus fidèle que le CAGR quand tu investis progressivement (DCA) : un bon mois sur un gros encours pèse plus qu\'un bon mois sur un petit. Même méthode que la fonction XIRR d\'Excel.', example:'500 €/mois pendant 2 ans avec une forte hausse à la fin → TRI supérieur au CAGR, car ton argent récent a bien travaillé.' },
  { term:'Drawdown',    title:'Repli depuis le plus haut',    body:'La baisse entre un sommet du portefeuille et le creux qui suit, en %. Le « max drawdown » est la pire chute jamais subie — un bon indicateur de ce que tu dois être capable d\'encaisser psychologiquement sans vendre.', example:'Portefeuille à 50 000 € qui descend à 40 000 € avant de remonter → drawdown de −20 %.' },
  { term:'TD / TE',     title:'Tracking difference / error',  body:'Deux mesures de la qualité de réplication d\'un ETF. TD (tracking difference) : l\'écart de performance entre l\'ETF et son indice sur 1 an — idéalement proche de 0. TE (tracking error) : la régularité de cet écart au fil du temps — plus c\'est bas, plus l\'ETF colle à son indice de façon prévisible.', example:'TD −0,1 % = l\'ETF fait même légèrement mieux que son indice (prêt de titres, optimisations fiscales).' },
  { term:'Benchmark',   title:'Indice de référence',          body:'L\'indice auquel ta performance est comparée — par défaut le MSCI World (CW8), modifiable dans les préférences. Si ta courbe est au-dessus du benchmark, tu fais mieux qu\'un simple investissement passif monde entier ; en dessous, moins bien.', example:'Portefeuille +9 % vs MSCI World +12 % sur 1 an → tu sous-performes de 3 points.' },
];

export const MOCK_BROKERS: Broker[] = [
  { id:'fortuneo', name:'Fortuneo',       pea:true,  cto:true,  av:true,  per:false },
  { id:'bourso',   name:'Boursorama',     pea:true,  cto:true,  av:true,  per:true  },
  { id:'tr',       name:'Trade Republic', pea:false, cto:true,  av:false, per:false },
  { id:'linxea',   name:'Linxea',         pea:false, cto:false, av:true,  per:true  },
  { id:'saxo',     name:'Saxo',           pea:false, cto:true,  av:false, per:false },
];
