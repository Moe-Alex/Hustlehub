import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import DataState from '../components/DataState';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { formatZAR } from '../utils/format';

export default function GigDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useApi(() => api.gigs.get(id), [id]);

  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const gig = data ? data.data : null;

  async function handleBook(event) {
    event.preventDefault();
    setActionError('');
    if (notes.length > 500) {
      setNotesError('Notes must be 500 characters or fewer.');
      return;
    }
    setNotesError('');
    setSubmitting(true);
    try {
      const res = await api.bookings.create({ gigId: gig.id, notes: notes.trim() || undefined });
      setConfirmation(res.data);
    } catch (err) {
      setActionError(err.message);
      setNotesError(err.fieldErrors?.notes || '');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    setActionError('');
    try {
      await api.gigs.remove(gig.id);
      navigate('/gigs');
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <DataState loading={loading} error={error} loadingLabel="Loading gig...">
      {gig && (
        <article className="gig-detail">
          <Link to="/gigs" className="back-link">Back to all gigs</Link>

          <header className="gig-detail-head">
            <div>
              <p className="gig-tag-meta"><span className="chip">{gig.category}</span><span>Delivered in {gig.deliveryDays} {gig.deliveryDays === 1 ? 'day' : 'days'}</span></p>
              <h1>{gig.title}</h1>
              <p className="gig-tag-by">by {gig.freelancer ? gig.freelancer.username : 'a freelancer'}</p>
            </div>
            <p className="gig-detail-price">{formatZAR(gig.price)}</p>
          </header>

          <p className="gig-detail-desc">{gig.description}</p>

          {actionError && <Alert variant="error">{actionError}</Alert>}

          {user.role === 'client' && !confirmation && (
            <form className="booking-box" onSubmit={handleBook} noValidate>
              <h2>Book this gig</h2>
              <FormField as="textarea" id="notes" label="Notes for the freelancer (optional)" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} error={notesError} hint={`${notes.length} of 500 characters`} />
              <p className="booking-total">Total: <strong>{formatZAR(gig.price)}</strong>.</p>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Booking...' : 'Confirm booking'}
              </button>
            </form>
          )}

          {confirmation && (
            <section className="booking-box booking-done" role="status">
              <h2>Booking confirmed</h2>
              <p>
                Your payment of <strong>{formatZAR(confirmation.transaction.amount)}</strong> was recorded. Your reference is{' '}
                <strong>{confirmation.transaction.reference}</strong>.
              </p>
              <Link className="btn btn-primary" to="/bookings">View my bookings</Link>
            </section>
          )}

          {user.role === 'freelancer' && (
            <p className="state-note">
              Only clients can book gigs.{' '}
              {gig.freelancer && gig.freelancer.id === user.id && <Link to={`/my-gigs/${gig.id}/edit`}>Edit this gig</Link>}
            </p>
          )}

          {user.role === 'admin' && (
            <section className="booking-box">
              <h2>Moderation</h2>
              {confirmingRemoval ? (
                <div className="inline-actions">
                  <span>Remove this gig for everyone?</span>
                  <button type="button" className="btn btn-danger" onClick={handleRemove}>Yes, remove gig</button>
                  <button type="button" className="btn btn-outline" onClick={() => setConfirmingRemoval(false)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="btn btn-danger" onClick={() => setConfirmingRemoval(true)}>Remove gig</button>
              )}
            </section>
          )}
        </article>
      )}
    </DataState>
  );
}
