// Display helpers for money and dates.

const rand = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormat = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatZAR(amount) {
  return rand.format(Number(amount) || 0).replace(/\s/g, ' ');
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
