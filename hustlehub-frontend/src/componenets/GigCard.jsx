// A gig shown as a hanging price tag.

import { Link } from 'react-router-dom';
import { formatZAR } from '../utils/format';

export default function GigCard({ gig }) {
  const days = gig.deliveryDays === 1 ? '1 day' : `${gig.deliveryDays} days`;

  return (
    <article className="gig-tag">
      <div className="gig-tag-price">
        <span className="gig-tag-hole" aria-hidden="true" />
        <span className="gig-tag-amount">{formatZAR(gig.price)}</span>
      </div>
      <div className="gig-tag-body">
        <p className="gig-tag-meta">
          <span className="chip">{gig.category}</span>
          <span>Delivered in {days}</span>
        </p>
        <h3><Link to={`/gigs/${gig.id}`}>{gig.title}</Link></h3>
        <p className="gig-tag-desc">{gig.description}</p>
        <p className="gig-tag-by">by {gig.freelancer ? gig.freelancer.username : 'a freelancer'}</p>
      </div>
    </article>
  );
}
