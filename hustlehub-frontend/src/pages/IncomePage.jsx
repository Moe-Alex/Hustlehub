import { Link } from 'react-router-dom';
import { api } from '../api/client';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatZAR } from '../utils/format';

export default function IncomePage() {
  const { data, error, loading } = useApi(() => api.transactions.income(), []);
  const income = data ? data.data : null;

  return (
    <>
      <PageHeader title="Your income" intro="What your bookings have earned, with an estimate of the tax you may owe." />
      <DataState loading={loading} error={error} loadingLabel="Loading your income...">
        {income && (
          <>
            <dl className="figures">
              <div>
                <dt>Total income</dt>
                <dd>{formatZAR(income.totalIncome)}</dd>
                <p>{income.transactionCount} {income.transactionCount === 1 ? 'booking' : 'bookings'}</p>
              </div>
              <div>
                <dt>Estimated tax</dt>
                <dd>{formatZAR(income.estimatedTax)}</dd>
                <p>At a flat {Math.round(income.estimatedTaxRate * 100)}%</p>
              </div>
              <div>
                <dt>Income after tax</dt>
                <dd>{formatZAR(income.netIncome)}</dd>
                <p>Total income minus estimated tax</p>
              </div>
            </dl>

            <p className="state-note">{income.note}</p>

            <h2 className="section-title">Income by gig</h2>
            {income.byGig.length === 0 ? (
              <section className="empty-state">
                <h2>No income yet</h2>
                <p>Once a client books one of your gigs, it shows up here.</p>
                <Link className="btn btn-outline" to="/my-gigs">Go to my gigs</Link>
              </section>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Income by gig</caption>
                  <thead><tr><th scope="col">Gig</th><th scope="col" className="num">Bookings</th><th scope="col" className="num">Income</th></tr></thead>
                  <tbody>
                    {income.byGig.map((row) => (
                      <tr key={row.gigId}><td>{row.title}</td><td className="num">{row.bookings}</td><td className="num">{formatZAR(row.income)}</td></tr>
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
