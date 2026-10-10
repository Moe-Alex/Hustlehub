// Shows a loading note or a friendly error instead of the content while data is loading or has failed.

import Alert from './Alert';

export default function DataState({ loading, error, loadingLabel = 'Loading...', children }) {
  if (loading) return <p className="state-note" role="status">{loadingLabel}</p>;
  if (error) return <Alert variant="error">{error.message}</Alert>;
  return children;
}
