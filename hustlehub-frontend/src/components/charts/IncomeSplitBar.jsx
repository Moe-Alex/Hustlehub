// One stacked bar showing where earned income goes: take-home pay, estimated tax and business expenses.
// The legend states every amount and percentage, so the chart never relies on colour alone.

import { formatPercent, formatZAR } from '../../utils/format';

export default function IncomeSplitBar({ totalIncome, tax, expenses }) {
  const takeHome = Math.max(0, totalIncome - tax - expenses);
  const segments = [
    { key: 'takehome', label: 'Take-home after tax', amount: takeHome },
    { key: 'tax', label: 'Estimated tax', amount: tax },
    { key: 'expenses', label: 'Business expenses', amount: expenses },
  ];
  const share = (amount) => (totalIncome > 0 ? amount / totalIncome : 0);
  let offset = 0;

  return (
    <figure className="chart" data-testid="income-split-chart">
      <figcaption className="chart-title">Where your income goes</figcaption>
      {totalIncome > 0 ? (
        <svg viewBox="0 0 100 10" preserveAspectRatio="none" role="img" className="split-svg"
          aria-label={segments.map((s) => `${s.label} ${formatPercent(share(s.amount))}`).join(', ')}>
          {segments.map((s) => {
            const width = share(s.amount) * 100;
            const rect = width > 0 && <rect key={s.key} className={`seg seg-${s.key}`} x={offset} y="0" width={width} height="10" />;
            offset += width;
            return rect;
          })}
        </svg>
      ) : (
        <p className="state-note">Nothing to split yet. Complete a booking to see this chart.</p>
      )}
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`swatch seg-${s.key}`} aria-hidden="true" />
            <span className="legend-label">{s.label}</span>
            <span className="legend-value">{formatZAR(s.amount)} <small>({formatPercent(share(s.amount))})</small></span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
