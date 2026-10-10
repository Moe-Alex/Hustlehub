import { useState } from 'react';
import { api } from '../api/client';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { formatDate, formatZAR } from '../utils/format';

const COPY = {
  client: { title: 'Payments', intro: 'Simulated payments for the gigs you booked.' },
  freelancer: { title: 'Earnings', intro: 'Simulated payments received for your gigs.' },
  admin: { title: 'All transactions', intro: 'Every simulated payment on the platform.' },
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi(() => api.transactions.list({ page, limit: 10 }), [page]);
  const copy = COPY[user.role];
  const transactions = data ? data.data : [];

  return (
    <>
      <PageHeader title={copy.title} intro={copy.intro} />
      <DataState loading={loading} error={error} loadingLabel="Loading transactions...">
        {transactions.length === 0 ? (
          <section className="empty-state"><h2>No transactions yet</h2><p>They appear here as soon as a booking is made.</p></section>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">{copy.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Gig</th>
                    {user.role !== 'client' && <th scope="col">Client</th>}
                    {user.role !== 'freelancer' && <th scope="col">Freelancer</th>}
                    <th scope="col" className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.createdAt)}</td>
                      <td className="mono">{transaction.reference}</td>
                      <td>{transaction.gigTitle}</td>
                      {user.role !== 'client' && <td>{transaction.client?.username}</td>}
                      {user.role !== 'freelancer' && <td>{transaction.freelancer?.username}</td>}
                      <td className="num">{formatZAR(transaction.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={data.pagination.pages} onChange={setPage} />
          </>
        )}
      </DataState>
    </>
  );
}
