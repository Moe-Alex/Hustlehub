// Small coloured label for a booking, transaction or gig status.

const LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  active: 'Visible',
  inactive: 'Hidden',
};

export default function StatusBadge({ status }) {
  // Object.hasOwn stops odd values such as "constructor" from picking up built-in object properties.
  // eslint-disable-next-line security/detect-object-injection -- guarded by Object.hasOwn
  const label = Object.hasOwn(LABELS, status) ? LABELS[status] : status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}
