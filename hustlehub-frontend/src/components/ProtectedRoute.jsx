// Only lets logged-in users through, and (optionally) only users with one of the allowed roles.
// This improves the experience - the API enforces the same rules on the server.

import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="state-note" role="status">Checking your session...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (roles && !roles.includes(user.role)) {
    return (
      <section className="empty-state">
        <h1>You cannot open this page</h1>
        <p>Your account type ({user.role}) does not have access to it.</p>
        <Link className="btn btn-primary" to="/gigs">Back to gigs</Link>
      </section>
    );
  }

  return children;
}
