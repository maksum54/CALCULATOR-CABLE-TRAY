// Number formatting shared by every table, stat row and export caption. Kept out of
// index.tsx so that file exports components only and React Fast Refresh keeps working.

export const fmt = (n: number, digits = 1): string =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '-';

export const pct = (n: number, digits = 2): string =>
  Number.isFinite(n) ? `${(n * 100).toFixed(digits)} %` : '-';
