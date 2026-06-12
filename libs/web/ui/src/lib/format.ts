const normalizeSpaces = (s: string) => s.replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');

const frenchNumberFormat = (d: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const frenchEuroFormat = (d: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export const fmtEur = (n: number, d = 2) => normalizeSpaces(frenchEuroFormat(d).format(n));
export const fmtNum = (n: number, d = 2) => normalizeSpaces(frenchNumberFormat(d).format(n));
export const fmtPct = (n: number, d = 2) =>
  (n >= 0 ? '+' : '') + normalizeSpaces(frenchNumberFormat(d).format(n)) + ' %';
export const fmtPctRaw = (n: number, d = 1) => normalizeSpaces(frenchNumberFormat(d).format(n)) + ' %';
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
