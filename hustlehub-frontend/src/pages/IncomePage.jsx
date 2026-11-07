import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import IncomeSplitBar from '../components/charts/IncomeSplitBar';
import MonthlyIncomeChart from '../components/charts/MonthlyIncomeChart';
import { useApi } from '../hooks/useApi';
import { formatPercent, formatRand, formatZAR } from '../utils/format';

const AGE_GROUPS = [
  { value: 'under65', label: 'Under 65' },
  { value: '65to74', label: '65 to 74' },
  { value: '75plus', label: '75 and older' },
];

export default function IncomePage() {
  const [taxYear, setTaxYear] = useState('');
  const [ageGroup, setAgeGroup] = useState('under65');
  const [expensesText, setExpensesText] = useState('');
  const [expenses, setExpenses] = useState(0); // the value last applied, so typing does not call the API on every key
  const [expensesError, setExpensesError] = useState('');

  const { data, error, loading } = useApi(
    () => api.transactions.income({ taxYear: taxYear || undefined, ageGroup, expenses: expenses || undefined }),
    [taxYear, ageGroup, expenses]
  );
  const income = data ? data.data : null;

  function applyExpenses(event) {
    event.preventDefault();
    const value = expensesText.trim() === '' ? 0 : Number(expensesText);
    if (!Number.isFinite(value) || value < 0) {
      setExpensesError('Enter an amount of zero or more.');
      return;
    }
    setExpensesError('');
    setExpenses(value);
  }

  return (
    <>
      <PageHeader title="Your income" intro="Your earnings, an estimate of the income tax you may owe and where your money goes." />

      <form className="income-controls" onSubmit={applyExpenses} noValidate>
        <div className="field">
          <label htmlFor="tax-year">Tax year</label>
          <select id="tax-year" value={taxYear || (income ? String(income.taxYear.endYear) : '')} onChange={(e) => setTaxYear(e.target.value)}>
            {income ? income.availableTaxYears.map((year) => <option key={year.endYear} value={year.endYear}>{year.label}</option>) : <option value="">Current</option>}
          </select>
          <p className="field-hint">1 March to the end of February.</p>
        </div>
        <div className="field">
          <label htmlFor="age-group">Age group</label>
          <select id="age-group" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
            {AGE_GROUPS.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
          <p className="field-hint">Decides which tax rebates apply.</p>
        </div>
        <div className={`field${expensesError ? ' field-invalid' : ''}`}>
          <label htmlFor="expenses">Business expenses (R)</label>
          <input id="expenses" type="number" inputMode="decimal" min="0" step="0.01" value={expensesText}
            onChange={(e) => setExpensesText(e.target.value)} placeholder="0" aria-describedby="expenses-hint" aria-invalid={Boolean(expensesError)} />
          <p className="field-hint" id="expenses-hint">Costs of earning this income reduce the income you are taxed on.</p>
          {expensesError && <p className="field-error" role="alert">{expensesError}</p>}
        </div>
        <button type="submit" className="btn btn-outline">Update estimate</button>
      </form>

      <DataState loading={loading} error={error} loadingLabel="Loading your income...">
        {income && (
          <>
            <dl className="figures">
              <div>
                <dt>Income earned</dt>
                <dd>{formatZAR(income.totalIncome)}</dd>
                <p>{income.transactionCount} completed {income.transactionCount === 1 ? 'booking' : 'bookings'}</p>
              </div>
              <div>
                <dt>Taxable income</dt>
                <dd>{formatZAR(income.taxableIncome)}</dd>
                <p>{income.assumptions.expenses > 0 ? `After ${formatZAR(income.assumptions.expenses)} of expenses` : 'No expenses deducted'}</p>
              </div>
              <div>
                <dt>Estimated tax</dt>
                <dd>{formatZAR(income.estimatedTax)}</dd>
                <p>{income.estimatedTax > 0 ? `${formatPercent(income.tax.effectiveRate)} of taxable income` : `Nothing due below ${formatRand(income.tax.threshold)}`}</p>
              </div>
              <div>
                <dt>Take-home after tax</dt>
                <dd>{formatZAR(income.netIncome)}</dd>
                <p>Taxable income minus estimated tax</p>
              </div>
            </dl>

            {income.pending.bookings > 0 && (
              <p className="state-note">
                {formatZAR(income.pending.amount)} from {income.pending.bookings} {income.pending.bookings === 1 ? 'booking is' : 'bookings are'} still pending.
                It only counts as income once you mark the work completed.
              </p>
            )}

            <div className="chart-grid">
              <MonthlyIncomeChart months={income.months} taxYearLabel={income.taxYear.label} />
              <IncomeSplitBar totalIncome={income.totalIncome} tax={income.estimatedTax} expenses={income.assumptions.expenses} />
            </div>

            <h2 className="section-title">How your tax was worked out</h2>
            <p>
              South Africa taxes income in slices. Each slice of your taxable income is taxed at the rate of the bracket it falls in,
              then a rebate for your age group is subtracted. Rates and rebates are the SARS tables for the {income.taxYear.label} tax year.
            </p>
            {income.tax.breakdown.length === 0 ? (
              <p className="state-note">There is no taxable income in this tax year yet, so no tax is estimated.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Tax worked out bracket by bracket</caption>
                  <thead>
                    <tr><th scope="col">Bracket</th><th scope="col" className="num">Rate</th><th scope="col" className="num">Your income in it</th><th scope="col" className="num">Tax</th></tr>
                  </thead>
                  <tbody>
                    {income.tax.breakdown.map((row) => (
                      <tr key={row.from}>
                        <td>{row.to === null ? `Above ${formatRand(row.from)}` : `${formatRand(row.from)} to ${formatRand(row.to)}`}</td>
                        <td className="num">{formatPercent(row.rate, 0)}</td>
                        <td className="num">{formatZAR(row.amountInBracket)}</td>
                        <td className="num">{formatZAR(row.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row" colSpan="3">Tax before rebates</th><td className="num">{formatZAR(income.tax.taxBeforeRebates)}</td></tr>
                    <tr><th scope="row" colSpan="3">Rebate for your age group</th><td className="num">- {formatZAR(income.tax.rebate)}</td></tr>
                    <tr className="total-row"><th scope="row" colSpan="3">Estimated tax</th><td className="num">{formatZAR(income.estimatedTax)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}
            <p className="state-note">{income.note} Freelancers who earn outside a salary are usually provisional taxpayers and pay in two instalments a year. Check with SARS or a registered tax practitioner.</p>

            <h2 className="section-title">Income by gig</h2>
            {income.byGig.length === 0 ? (
              <section className="empty-state">
                <h2>No income yet</h2>
                <p>Once a client books one of your gigs and you complete the work, it shows up here.</p>
                <Link className="btn btn-outline" to="/my-gigs">Go to my gigs</Link>
              </section>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Income by gig</caption>
                  <thead><tr><th scope="col">Gig</th><th scope="col" className="num">Bookings</th><th scope="col" className="num">Income</th></tr></thead>
                  <tbody>
                    {income.byGig.map((row) => (
                      <tr key={row.gigId}>
                        <td>
                          {row.title}
                          <svg className="inline-bar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
                            <rect className="bar" width={(row.income / income.byGig[0].income) * 100} height="6" rx="3" />
                          </svg>
                        </td>
                        <td className="num">{row.bookings}</td>
                        <td className="num">{formatZAR(row.income)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p><Link to="/payments">See every payment</Link></p>
          </>
        )}
      </DataState>
    </>
  );
}
