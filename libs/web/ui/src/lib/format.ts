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

export const formatEuro = (n: number, d = 2) => normalizeSpaces(frenchEuroFormat(d).format(n));
export const formatNumber = (n: number, d = 2) => normalizeSpaces(frenchNumberFormat(d).format(n));
export const formatQuantity = (n: number) => normalizeSpaces(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n));
export const formatPercent = (n: number, d = 2) =>
  (n >= 0 ? '+' : '') + normalizeSpaces(frenchNumberFormat(d).format(n)) + ' %';
export const formatPercentRaw = (n: number, d = 1) => normalizeSpaces(frenchNumberFormat(d).format(n)) + ' %';
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
