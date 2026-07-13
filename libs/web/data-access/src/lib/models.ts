export interface User {
  firstName: string;
  lastName: string;
  initials: string;
  riskProfile: string;
  horizonYears: number;
  monthlyTarget: number;
  displayCurrency: string;
}

export interface Envelope {
  id: string;
  code: string;
  glyph: string;
  label: string;
  broker: string;
  value: number;
  invested: number;
  cash: number;
  contributed: number;
  openedAt: string;
  plafond: number | null;
}

export type LiabilityKind = 'mortgage' | 'consumer_loan' | 'other';

export interface Liability {
  id: string;
  label: string;
  kind: LiabilityKind;
  initialAmount: number;
  currentBalance: number;
  ratePct: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string | null;
}

export interface EtfExposureBreakdown {
  geography: Record<string, number>;
  sector: Record<string, number>;
  currency: Record<string, number>;
}

export interface Etf {
  isin: string;
  ticker: string;
  name: string;
  issuer: string;
  index: string;
  ter: number;
  currency: string;
  repli: string;
  distrib: string;
  pea: boolean;
  alloc: 'Core' | 'Satellite' | 'Obligations' | 'Matières premières';
  /** Followed without a position — excluded from portfolio analytics. */
  watchOnly: boolean;
  /** Geography/sector/currency breakdown, cached from Yahoo. Absent until first computed. */
  exposure?: EtfExposureBreakdown;
  qty: number;
  pru: number;
  price: number;
  prev: number;
  perf1y: number;
  perfYtd: number;
}

export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'INTEREST';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  envelope: string;
  etf: string | null;
  qty: number;
  price: number | null;
  fees: number;
  /** Taxes withheld (PFU, social levies) — separate from broker fees. */
  taxes: number;
  amount: number;
  /** Set on both legs of an inter-envelope transfer; null otherwise. */
  transferId: string | null;
}

export interface TransactionLabel {
  label: string;
  sym: string;
  dir: '+' | '−';
}

export interface Targets {
  strategic: { stocks: number; bonds: number };
  tactic: { core: number; satellite: number; bonds: number };
  etf: Record<string, number>;
  envelope: Record<string, number>;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'warn' | 'info' | 'gain';
  title: string;
  body: string;
  cta: string;
  date: string;
  read: boolean;
  dismissed: boolean;
}

export interface Dividend {
  date: string;
  etf: string | null;
  amount: number | null;
  envelope: string;
  status: string;
  marker?: boolean;
}

export interface GlossaryEntry {
  term: string;
  title: string;
  body: string;
  example: string;
}

export interface Broker {
  id: string;
  name: string;
  pea: boolean;
  cto: boolean;
  av: boolean;
  per: boolean;
}

export interface Exposure {
  key: string;
  pct: number;
}
