// Runs an API call when the component mounts (or when `deps` change) and tracks loading and error state.

import { useCallback, useEffect, useState } from 'react';

export function useApi(call, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, error: null, loading: true }));
    call()
      .then((res) => !cancelled && setState({ data: res, error: null, loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: err, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
