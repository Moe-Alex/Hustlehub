import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataState from '../components/DataState';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { formatDate, formatZAR } from '../utils/format';

const COPY = {
  client: { title: 'My bookings', intro: 'Booking requests you have sent. A freelancer must accept a request before work starts.', empty: 'You have not booked anything yet.', who: 'Freelancer' },
  freelancer: { title: 'Bookings received', intro: 'Accept or reject booking requests, then mark accepted work as completed.', empty: 'No one has booked your gigs yet.', who: 'Client' },
  admin: { title: 'All bookings', intro: 'Every booking on the platform.', empty: 'There are no bookings yet.', who: 'Client' },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useApi(() => api.bookings.list({ page, limit: 10 }), [page]);
  const copy = COPY[user.role];
  const bookings = data ? data.data : [];

  // One handler for all three freelancer actions: accept, reject and complete.
  async function handleAction(action, id) {
    setActionError('');
    try {
      // action is 'accept', 'reject' or 'complete', written in this file next to the buttons.
      // eslint-disable-next-line security/detect-object-injection -- fixed action names
      await api.bookings[action](id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <PageHeader title={copy.title} intro={copy.intro} />
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <DataState loading={loading} error={error} loadingLabel="Loading bookings...">
        {bookings.length === 0 ? (
          <section className="empty-state">
            <h2>{copy.empty}</h2>
            {user.role === 'client' && <Link className="btn btn-primary" to="/gigs">Browse gigs</Link>}
          </section>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">{copy.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Gig</th>
                    <th scope="col">{user.role === 'client' ? 'Freelancer' : 'Client'}</th>
                    <th scope="col">Booked</th>
                    <th scope="col" className="num">Price</th>
                    <th scope="col">Status</th>
                    {user.role === 'freelancer' && <th scope="col">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        {booking.gigTitle}
                        {booking.notes && <p className="cell-note">Note: {booking.notes}</p>}
                      </td>
                      <td>{user.role === 'client' ? booking.freelancer?.username : booking.client?.username}</td>
                      <td>{formatDate(booking.createdAt)}</td>
                      <td className="num">{formatZAR(booking.price)}</td>
                      <td><StatusBadge status={booking.status} /></td>
                      {user.role === 'freelancer' && (
                        <td className="actions">
                          {booking.status === 'pending' && (
                            <div className="row-actions">
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAction('accept', booking.id)} aria-label={`Accept booking for ${booking.gigTitle}`}>
                                Accept
                              </button>
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleAction('reject', booking.id)} aria-label={`Reject booking for ${booking.gigTitle}`}>
                                Reject
                              </button>
                            </div>
                          )}
                          {booking.status === 'accepted' && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleAction('complete', booking.id)} aria-label={`Mark ${booking.gigTitle} as completed`}>
                              Mark completed
                            </button>
                          )}
                        </td>
                      )}
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
