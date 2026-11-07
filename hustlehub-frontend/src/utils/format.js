// Display helpers for money and dates.

const rand = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormat = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatZAR(amount) {
  return rand.format(Number(amount) || 0).replace(/\s/g, ' ');
}

// Whole rands with no cents, for tax brackets and chart labels (R 245 100).
export function formatRand(amount) {
  return `R ${Math.round(Number(amount) || 0).toLocaleString('en-ZA').replace(/\s/g, ' ')}`;
}

// 0.1809 -> "18.1%", 0.18 -> "18%"
export function formatPercent(rate, digits = 1) {
  const value = (Number(rate) || 0) * 100;
  return `${Number(value.toFixed(digits))}%`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export function formatWait(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 1} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
