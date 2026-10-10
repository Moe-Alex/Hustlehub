// Small coloured label for a booking or gig status.

const LABELS = { confirmed: 'Confirmed', completed: 'Completed', active: 'Visible', inactive: 'Hidden' };

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>;
}
