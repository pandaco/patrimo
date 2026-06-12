import {
  Alert, Broker, Dividend, Envelope, Etf, Exposure,
  GlossaryEntry, Targets, Transaction, TransactionLabel, TransactionType, User,
} from './models';

export const MOCK_USER: User = {
  firstName: 'Antoine',
  lastName: 'Huet',
  initials: 'AH',
  riskProfile: 'Équilibré dynamique',
  horizonYears: 25,
  monthlyTarget: 800,
  displayCurrency: 'EUR',
};

export const MOCK_ENVELOPES: Envelope[] = [
  { id:'pea',     code:'PEA',      glyph:'pea',    label:'PEA',             broker:'Fortuneo',          value:22145.40, invested:19200.00, cash: 1145.78, openedAt:'2021-08-12', plafond:150000 },
  { id:'peapme',  code:'PEA-PME',  glyph:'peapme', label:'PEA-PME',         broker:'Fortuneo',          value: 3210.00, invested: 3000.00, cash:    0.00, openedAt:'2023-03-04', plafond:225000 },
  { id:'cto',     code:'CTO',      glyph:'cto',    label:'CTO',             broker:'Boursorama',        value: 6320.18, invested: 5800.00, cash:  180.42, openedAt:'2022-01-20', plafond:null   },
  { id:'av',      code:'AV',       glyph:'av',     label:'Assurance-Vie',   broker:'Linxea Spirit 2',   value: 8543.10, invested: 8000.00, cash:    0.00, openedAt:'2020-06-01', plafond:null   },
  { id:'per',     code:'PER',      glyph:'per',    label:'PER',             broker:'Linxea PER',        value: 4210.00, invested: 4000.00, cash:    0.00, openedAt:'2023-09-12', plafond:null   },
  { id:'pee',     code:'PEE',      glyph:'pee',    label:'PEE',             broker:'Amundi ESR',        value: 2580.00, invested: 2400.00, cash:    0.00, openedAt:'2022-11-01', plafond:null   },
  { id:'livreta', code:'Livret A', glyph:'livret', label:'Livret A',        broker:'Boursorama',        value:22950.00, invested:21800.00, cash:22950.00, openedAt:'2014-04-15', plafond: 22950 },
  { id:'ldds',    code:'LDDS',     glyph:'livret', label:'LDDS',            broker:'Boursorama',        value: 5400.00, invested: 5200.00, cash: 5400.00, openedAt:'2018-09-08', plafond: 12000 },
  { id:'crypto',  code:'Crypto',   glyph:'crypto', label:'Wallet crypto',   broker:'Coinbase + Ledger', value: 4218.32, invested: 3500.00, cash:    0.00, openedAt:'2021-11-30', plafond:null   },
  { id:'immo',    code:'SCPI',     glyph:'immo',   label:'SCPI Iroko Zen',  broker:'Direct',            value:12500.00, invested:12000.00, cash:    0.00, openedAt:'2023-05-10', plafond:null   },
  { id:'metal',   code:'Or',       glyph:'metal',  label:'Or physique',     broker:'Godot & Fils',      value: 3845.00, invested: 3100.00, cash:    0.00, openedAt:'2022-04-01', plafond:null   },
];

export const MOCK_ETFS: Etf[] = [
  { isin:'FR0010315770', ticker:'ESE',   name:'Amundi S&P 500 UCITS',         issuer:'Amundi',  index:'S&P 500',           ter:0.15, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true, watchOnly:false,  alloc:'Core',        qty:47,  pru: 32.18, price: 39.42, prev: 39.18, perf1y:22.4, perfYtd:14.2 },
  { isin:'FR0010261198', ticker:'CW8',   name:'Amundi MSCI World UCITS',      issuer:'Amundi',  index:'MSCI World',        ter:0.38, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true, watchOnly:false,  alloc:'Core',        qty:22,  pru:412.50, price:498.20, prev:494.10, perf1y:18.1, perfYtd:11.8 },
  { isin:'LU1681043599', ticker:'PCEU',  name:'Amundi MSCI Europe UCITS',     issuer:'Amundi',  index:'MSCI Europe',       ter:0.18, currency:'EUR', repli:'Physique',    distrib:'Capitalisant', pea:true, watchOnly:false,  alloc:'Core',        qty:38,  pru: 22.10, price: 25.84, prev: 25.92, perf1y:11.2, perfYtd: 6.4 },
  { isin:'LU1681045370', ticker:'PAEEM', name:'Amundi MSCI Emerging Markets', issuer:'Amundi',  index:'MSCI EM',           ter:0.20, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true, watchOnly:false,  alloc:'Satellite',   qty:64,  pru:  5.42, price:  5.78, prev:  5.74, perf1y: 6.8, perfYtd: 3.1 },
  { isin:'IE00BJZ2DD79', ticker:'RS2K',  name:'SPDR Russell 2000 US Small',   issuer:'SPDR',    index:'Russell 2000',      ter:0.30, currency:'USD', repli:'Physique',    distrib:'Capitalisant', pea:false, watchOnly:false, alloc:'Satellite',   qty:14,  pru: 58.40, price: 62.10, prev: 61.80, perf1y: 9.2, perfYtd: 4.4 },
  { isin:'FR0011550185', ticker:'EWLD',  name:'Lyxor MSCI World UCITS',       issuer:'Lyxor',   index:'MSCI World',        ter:0.45, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true, watchOnly:false,  alloc:'Core',        qty:18,  pru:412.20, price:498.00, prev:494.20, perf1y:18.0, perfYtd:11.7 },
  { isin:'IE00B4L5Y983', ticker:'IWDA',  name:'iShares Core MSCI World',      issuer:'iShares', index:'MSCI World',        ter:0.20, currency:'USD', repli:'Physique',    distrib:'Capitalisant', pea:false, watchOnly:false, alloc:'Core',        qty: 8,  pru: 78.40, price: 89.20, prev: 89.05, perf1y:18.3, perfYtd:11.9 },
  { isin:'FR0013412020', ticker:'OBLI',  name:'Amundi Euro Govt Bond 7-10Y',  issuer:'Amundi',  index:'Bloomberg Euro Govt',ter:0.14, currency:'EUR', repli:'Physique',    distrib:'Capitalisant', pea:false, watchOnly:false, alloc:'Obligations', qty:32,  pru:135.10, price:138.40, prev:138.20, perf1y: 3.4, perfYtd: 1.8 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id:'tx-104', date:'2026-05-12', type:'BUY',      envelope:'pea',     etf:'ESE',  qty:12, price: 39.30, fees:0.99, taxes:0, amount: 472.59, transferId:null },
  { id:'tx-103', date:'2026-05-12', type:'DEPOSIT',  envelope:'pea',     etf:null,   qty: 1, price:  null, fees:0, taxes:0,    amount: 500.00, transferId:null },
  { id:'tx-102', date:'2026-05-05', type:'DIVIDEND', envelope:'cto',     etf:'IWDA', qty: 1, price:  null, fees:0, taxes:0,    amount:  18.42, transferId:null },
  { id:'tx-101', date:'2026-05-02', type:'INTEREST', envelope:'livreta', etf:null,   qty: 1, price:  null, fees:0, taxes:0,    amount:  57.38, transferId:null },
  { id:'tx-100', date:'2026-04-28', type:'BUY',      envelope:'pea',     etf:'PCEU', qty: 8, price: 25.51, fees:0.99, taxes:0, amount: 205.07, transferId:null },
  { id:'tx-099', date:'2026-04-28', type:'BUY',      envelope:'pea',     etf:'PAEEM',qty:14, price:  5.71, fees:0.99, taxes:0, amount:  80.93, transferId:null },
  { id:'tx-098', date:'2026-04-15', type:'DEPOSIT',  envelope:'pea',     etf:null,   qty: 1, price:  null, fees:0, taxes:0,    amount: 500.00, transferId:null },
  { id:'tx-097', date:'2026-04-12', type:'BUY',      envelope:'per',     etf:'CW8',  qty: 1, price:481.20, fees:1.50, taxes:0, amount: 482.70, transferId:null },
  { id:'tx-096', date:'2026-04-08', type:'SELL',     envelope:'cto',     etf:'IWDA', qty: 2, price: 86.20, fees:0.99, taxes:0, amount: 171.41, transferId:null },
  { id:'tx-095', date:'2026-03-30', type:'DIVIDEND', envelope:'cto',     etf:'IWDA', qty: 1, price:  null, fees:0, taxes:0,    amount:  16.84, transferId:null },
  { id:'tx-094', date:'2026-03-22', type:'BUY',      envelope:'pea',     etf:'ESE',  qty:10, price: 38.50, fees:0.99, taxes:0, amount: 385.99, transferId:null },
  { id:'tx-093', date:'2026-03-15', type:'DEPOSIT',  envelope:'av',      etf:null,   qty: 1, price:  null, fees:0, taxes:0,    amount: 300.00, transferId:null },
  { id:'tx-092', date:'2026-03-02', type:'INTEREST', envelope:'livreta', etf:null,   qty: 1, price:  null, fees:0, taxes:0,    amount:  54.21, transferId:null },
];

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

export const MOCK_ALERTS: Alert[] = [
  { id:'a1', type:'CASH_IDLE',     severity:'warn', title:'Cash dormant — PEA',        body:'1 145,78 € disponibles depuis 32 jours. Tu pourrais lancer un DCA et combler 3 sous-pondérations.', cta:'Lancer le DCA',        date:'il y a 2 j', read:false, dismissed:false },
  { id:'a2', type:'DRIFT_ETF',     severity:'info', title:'S&P 500 sur-pondéré',        body:'ESE pèse 38,1% du portefeuille (cible 32%). Drift +6,1pts — neutre pour l\'instant, surveille.',  cta:'Voir l\'allocation',    date:'il y a 4 j', read:false, dismissed:false },
  { id:'a3', type:'DIVIDEND',      severity:'gain', title:'Dividende reçu — IWDA',      body:'+18,42 € crédités sur CTO Boursorama. Pense à réinvestir pour conserver l\'effet boule de neige.',  cta:'Réinvestir',            date:'hier',        read:false, dismissed:false },
  { id:'a4', type:'PEA_AGE',       severity:'info', title:'PEA atteint 5 ans dans 84 j',body:'Au 12/08/2026, retraits possibles sans clôturer le plan. Garde-le si tu n\'en as pas besoin.',      cta:'En savoir plus',        date:'info',        read:false, dismissed:false },
  { id:'a5', type:'CONCENTRATION', severity:'warn', title:'Exposition USA élevée',      body:'68% de tes actifs sont exposés au marché américain. Au-delà de 70%, diversifie géographiquement.',  cta:'Voir la répartition',   date:'il y a 6 j', read:false, dismissed:false },
];

export const MOCK_DIVIDENDS: Dividend[] = [
  { date:'2026-06-15', etf:'IWDA', amount: 19.40, envelope:'cto', status:'prévu'   },
  { date:'2026-06-28', etf:'OBLI', amount: 14.20, envelope:'pea', status:'prévu'   },
  { date:'2026-07-02', etf:'IWDA', amount: 20.10, envelope:'cto', status:'estimé'  },
  { date:'2026-08-12', etf:null,   amount:  null,  envelope:'pea', status:'5 ans PEA', marker:true },
  { date:'2026-08-15', etf:'RS2K', amount:  4.20, envelope:'cto', status:'prévu'   },
  { date:'2026-09-30', etf:'IWDA', amount: 21.60, envelope:'cto', status:'estimé'  },
];

export const MOCK_GLOSSARY: GlossaryEntry[] = [
  { term:'Position',    title:'Position sur un actif',       body:'Ce que tu détiens d\'un ETF à l\'instant T : la quantité d\'unités et leur prix moyen d\'achat (PRU). Une position est dérivée automatiquement de l\'historique des transactions — jamais saisie à la main. Seuls les BUY/SELL la font bouger ; les DEPOSIT, DIVIDEND et INTEREST n\'affectent que le cash de l\'enveloppe.', example:'2 achats ESE (10 à 38,50 € puis 12 à 39,30 €) → position 22 unités, PRU 38,94 €.' },
  { term:'PRU',         title:'Prix de Revient Unitaire',    body:'Coût moyen pondéré d\'achat d\'un titre. Σ (quantité × prix d\'achat + frais) / quantité totale achetée.', example:'10 ESE à 32 € + 5 ESE à 38 € = (320 + 190) / 15 = 34 € de PRU.' },
  { term:'PV latente',  title:'Plus-value latente',          body:'Gain non réalisé : différence entre la valeur actuelle de la position et son PRU.',                         example:'47 ESE × (39,42 − 32,18) = +340,28 €.' },
  { term:'PnL',         title:'Profit and Loss',             body:'Anglais financier pour la plus-value (ou moins-value) latente d\'une position : value − invested. Positive = tu gagnerais en vendant maintenant. PnL % = (cours actuel / PRU − 1) × 100. Sur Patrimo, PnL et PV latente sont synonymes.', example:'PRU 32,18 €, cours actuel 39,42 €, qty 47 → PnL = +340,28 € (+22,5 %).' },
  { term:'TER',         title:'Total Expense Ratio',         body:'Frais de gestion annuels d\'un ETF, prélevés sur la performance.',                                           example:'TER 0,15% sur 10 000 € = 15 €/an, prélevés à la source.' },
  { term:'Drift',       title:'Écart d\'allocation',         body:'Différence entre la pondération réelle d\'une ligne et sa cible.',                                           example:'ESE cible 32%, réel 38,1% → drift +6,1 pts.' },
  { term:'DCA',         title:'Dollar Cost Averaging',       body:'Investissement régulier d\'un montant fixe, indépendant du cours. Lisse le prix d\'entrée.',                 example:'500 €/mois sur PEA répartis selon l\'allocation cible.' },
  { term:'Capitalisant',title:'Politique de distribution',   body:'Un ETF capitalisant réinvestit automatiquement les dividendes dans le fonds. Fiscalité reportée.',           example:'ESE est capitalisant : pas de dividende cash, valorisation accrue.' },
];

export const MOCK_BROKERS: Broker[] = [
  { id:'fortuneo', name:'Fortuneo',       pea:true,  cto:true,  av:true,  per:false },
  { id:'bourso',   name:'Boursorama',     pea:true,  cto:true,  av:true,  per:true  },
  { id:'tr',       name:'Trade Republic', pea:false, cto:true,  av:false, per:false },
  { id:'linxea',   name:'Linxea',         pea:false, cto:false, av:true,  per:true  },
  { id:'saxo',     name:'Saxo',           pea:false, cto:true,  av:false, per:false },
];

export const MOCK_PERF_SERIES = {
  portfolio: [100,100.4,100.2,100.7,101.4,101.0,101.6,102.1,102.4,102.0,102.6,103.1,103.8,104.2,103.9,104.6,105.2,105.8,106.4,106.1,106.8,107.4,108.0,108.6,108.2,108.9,109.6,110.2,110.7,111.3,111.0,111.8,112.4,112.9,112.5,113.2,114.0,114.6,114.2,114.9,115.7,116.3,116.0,116.8,117.5,118.1,118.7,119.4,118.9,119.6],
  benchmark: [100,100.2,100.5,100.4,100.9,101.2,101.5,101.8,102.0,102.4,102.6,103.0,103.4,103.8,104.0,104.4,104.8,105.0,105.4,105.8,106.0,106.4,106.8,107.0,107.4,107.6,108.0,108.4,108.6,109.0,109.2,109.6,109.8,110.0,110.4,110.8,111.0,111.4,111.6,112.0,112.4,112.6,113.0,113.4,113.6,114.0,114.2,114.6,115.0,115.4],
};

export const MOCK_SPARKS: Record<string, number[]> = {
  ESE:   [82,84,85,86,84,86,88,89,90,91,93,94,95,96,97,98,99,100,99,101,103,105,107,108,110,112,114,116,118,119,121,123,125,127],
  CW8:   [80,81,82,84,86,87,89,90,91,93,94,95,96,97,99,100,101,102,103,105,107,108,110,112,114,116,118,120,121,122,124,126,127,128],
  PCEU:  [88,89,90,91,90,91,92,93,94,95,94,95,96,97,98,99,100,101,102,103,104,103,104,105,106,107,108,109,110,111,112,113,114,115],
  PAEEM: [92,93,92,91,90,91,92,93,92,93,94,95,94,93,94,95,96,97,98,99,100,99,100,101,102,101,102,103,104,105,106,105,106,107],
  RS2K:  [85,86,84,83,84,85,86,87,86,87,88,89,90,89,90,91,92,93,94,95,96,95,96,97,98,99,100,101,102,103,104,105,106,107],
  EWLD:  [80,81,82,84,86,87,89,90,91,93,94,95,96,97,99,100,101,102,103,105,107,108,110,112,114,116,118,120,121,122,124,126,127,128],
  IWDA:  [80,81,82,84,86,87,89,90,91,93,94,95,96,97,99,100,101,102,103,105,107,108,110,112,114,116,118,120,121,122,124,126,127,128],
  OBLI:  [100,100,99,99,98,99,100,100,99,99,98,99,100,100,99,100,101,100,101,101,102,101,102,102,103,102,103,103,104,103,104,104,105,104],
};

export const MOCK_EXPOSURE_GEO: Exposure[] = [
  { key:'USA', pct:58.2 }, { key:'Europe', pct:22.4 }, { key:'Émergents', pct:9.8 },
  { key:'Japon', pct:5.1 }, { key:'Royaume-Uni', pct:3.0 }, { key:'Autres', pct:1.5 },
];

export const MOCK_EXPOSURE_SECTOR: Exposure[] = [
  { key:'Technologie', pct:28.4 }, { key:'Finance', pct:14.2 }, { key:'Santé', pct:11.8 },
  { key:'Conso. cycl.', pct:10.5 }, { key:'Industrie', pct:9.2 }, { key:'Communication', pct:7.8 },
  { key:'Conso. durable', pct:6.4 }, { key:'Énergie', pct:4.6 }, { key:'Autres', pct:7.1 },
];

export const MOCK_EXPOSURE_CURR: Exposure[] = [
  { key:'USD', pct:58.2 }, { key:'EUR', pct:32.4 }, { key:'JPY', pct:5.1 },
  { key:'GBP', pct:3.0 }, { key:'Autres', pct:1.3 },
];
