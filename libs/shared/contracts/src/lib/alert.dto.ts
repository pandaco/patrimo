export type AlertSeverity = 'info' | 'warn' | 'gain';

export type AlertType =
  | 'CASH_IDLE'
  | 'PLAFOND_NEAR'
  | 'DIVIDEND_RECENT'
  | 'PEA_AGE_NEAR'
  | 'USD_CONCENTRATION';

export interface AlertDto {
  id: string;                    // stable, derived from rule + entity ids
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  cta: string;
  date: string;                  // human label e.g. "il y a 3 j"
}
