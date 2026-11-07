// Column chart of income per month for one tax year (March to February), drawn as plain SVG so it needs no
// chart library and works under the strict Content Security Policy. A hidden table repeats the numbers for screen readers.

import { formatRand, formatZAR } from '../../utils/format';

const WIDTH = 640;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 12, bottom: 34, left: 64 };

// Rounds the top of the scale up to a tidy number (1, 2, 5 x 10^n) so the grid lines are easy to read.
function niceMax(value) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return step * power;
}

export default function MonthlyIncomeChart({ months, taxYearLabel }) {
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const top = niceMax(Math.max(0, ...months.map((m) => m.income)));
  const slot = innerWidth / months.length;
  const barWidth = slot * 0.62;
  const y = (value) => MARGIN.top + innerHeight - (value / top) * innerHeight;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => top * fraction);
  const total = months.reduce((sum, m) => sum + m.income, 0);

  return (
    <figure className="chart" data-testid="monthly-income-chart">
      <figcaption className="chart-title">Income by month, {taxYearLabel} tax year</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Bar chart of monthly income for the ${taxYearLabel} tax year. Total ${formatZAR(total)}.`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="gridline" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className="axis-text" x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end">{formatRand(tick)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const x = MARGIN.left + i * slot + (slot - barWidth) / 2;
          const barHeight = (m.income / top) * innerHeight;
          return (
            <g key={m.month}>
              {m.income > 0 && (
                <rect className="bar" x={x} y={y(m.income)} width={barWidth} height={barHeight} rx="3">
                  <title>{`${m.label}: ${formatZAR(m.income)}`}</title>
                </rect>
              )}
              <text className="axis-text" x={x + barWidth / 2} y={HEIGHT - 12} textAnchor="middle">{m.label}</text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Monthly income for the {taxYearLabel} tax year</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Income</th></tr></thead>
        <tbody>
          {months.map((m) => <tr key={m.month}><th scope="row">{m.label}</th><td>{formatZAR(m.income)}</td></tr>)}
        </tbody>
      </table>
    </figure>
  );
}
