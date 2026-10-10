import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1>We could not find that page</h1>
      <p>The link may be wrong or the page may have moved.</p>
      <Link className="btn btn-primary" to="/gigs">Go to gigs</Link>
    </section>
  );
}
