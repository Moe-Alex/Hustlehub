import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import { formatZAR } from '../utils/format';

export default function MyGigsPage() {
  const { data, error, loading, reload } = useApi(() => api.gigs.mine(), []);
  const [confirmingId, setConfirmingId] = useState(null);
  const [actionError, setActionError] = useState('');

  async function handleDelete(id) {
    setActionError('');
    try {
      await api.gigs.remove(id);
      setConfirmingId(null);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  const gigs = data ? data.data : [];

  return (
    <>
      <PageHeader title="My gigs" intro="Create and manage the services you offer." actions={<Link className="btn btn-primary" to="/my-gigs/new">Create a gig</Link>} />
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <DataState loading={loading} error={error} loadingLabel="Loading your gigs...">
        {gigs.length === 0 ? (
          <section className="empty-state">
            <h2>You have not created a gig yet</h2>
            <p>List your first service so clients can find and book you.</p>
            <Link className="btn btn-primary" to="/my-gigs/new">Create your first gig</Link>
          </section>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Your gigs</caption>
              <thead>
                <tr><th scope="col">Gig</th><th scope="col">Category</th><th scope="col" className="num">Price</th><th scope="col">Status</th><th scope="col">Actions</th></tr>
              </thead>
              <tbody>
                {gigs.map((gig) => (
                  <tr key={gig.id}>
                    <td><Link to={`/gigs/${gig.id}`}>{gig.title}</Link></td>
                    <td>{gig.category}</td>
                    <td className="num">{formatZAR(gig.price)}</td>
                    <td><StatusBadge status={gig.isActive ? 'active' : 'inactive'} /></td>
                    <td>
                      {confirmingId === gig.id ? (
                        <span className="inline-actions">
                          <button type="button" className="btn btn-danger" onClick={() => handleDelete(gig.id)}>Yes, delete</button>
                          <button type="button" className="btn btn-outline" onClick={() => setConfirmingId(null)}>Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-actions">
                          <Link className="btn btn-outline" to={`/my-gigs/${gig.id}/edit`}>Edit</Link>
                          <button type="button" className="btn btn-outline" onClick={() => setConfirmingId(gig.id)} aria-label={`Delete ${gig.title}`}>Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </>
  );
}
