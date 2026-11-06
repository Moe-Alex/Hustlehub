import { api } from '../api/client';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatDate, formatZAR } from '../utils/format';

export default function AdminPage() {
  const summary = useApi(() => api.admin.summary(), []);
  const users = useApi(() => api.admin.users({ limit: 100 }), []);
  const stats = summary.data ? summary.data.data : null;

  return (
    <>
      <PageHeader title="Administration" intro="Platform overview. To remove a gig, open it from Browse gigs." />

      <DataState loading={summary.loading} error={summary.error} loadingLabel="Loading overview...">
        {stats && (
          <dl className="figures">
            <div><dt>Clients</dt><dd>{stats.users.clients}</dd></div>
            <div><dt>Freelancers</dt><dd>{stats.users.freelancers}</dd></div>
            <div><dt>Gigs listed</dt><dd>{stats.gigs}</dd></div>
            <div><dt>Bookings</dt><dd>{stats.bookings}</dd></div>
            <div><dt>Completed value</dt><dd>{formatZAR(stats.transactions.totalValue)}</dd></div>
          </dl>
        )}
      </DataState>

      <h2 className="section-title">Users</h2>
      <DataState loading={users.loading} error={users.error} loadingLabel="Loading users...">
        {users.data && (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">All users</caption>
              <thead><tr><th scope="col">Username</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Joined</th></tr></thead>
              <tbody>
                {users.data.data.map((person) => (
                  <tr key={person.id}><td>{person.username}</td><td>{person.email}</td><td>{person.role}</td><td>{formatDate(person.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </>
  );
}
