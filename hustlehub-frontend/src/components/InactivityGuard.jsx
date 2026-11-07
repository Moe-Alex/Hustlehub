// Signs the person out after a period of inactivity (extra security feature).
// - Any mouse, key, touch or scroll activity restarts the clock.
// - One minute before the end, a dialog asks if they are still there. Only a deliberate click keeps the session,
//   so a stray mouse movement cannot hide the warning.
// - The deadline is a clock time that is checked every second, so it is still correct after a laptop sleeps.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ACTIVITY_EVENTS, INACTIVITY_LIMIT_MS, INACTIVITY_MESSAGE, WARNING_MS } from '../utils/session';

export default function InactivityGuard({ limitMs = INACTIVITY_LIMIT_MS, warningMs = WARNING_MS }) {
  const { expireSession, logout } = useAuth();
  const deadline = useRef(0); // set when the effect starts (Date.now() must not be called while rendering)
  const warningShown = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(null); // null = no warning showing

  const reset = useCallback(() => {
    deadline.current = Date.now() + limitMs;
    warningShown.current = false;
    setSecondsLeft(null);
  }, [limitMs]);

  useEffect(() => {
    deadline.current = Date.now() + limitMs;
    const onActivity = () => {
      if (!warningShown.current) deadline.current = Date.now() + limitMs;
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const tick = setInterval(() => {
      const remaining = deadline.current - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        expireSession(INACTIVITY_MESSAGE);
      } else if (remaining <= warningMs) {
        warningShown.current = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      clearInterval(tick);
    };
  }, [limitMs, warningMs, expireSession]);

  if (secondsLeft === null) return null;

  return (
    <div className="timeout-overlay">
      <div className="timeout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="timeout-title" aria-describedby="timeout-text">
        <h2 id="timeout-title">Are you still there?</h2>
        <p id="timeout-text">
          For your security you will be signed out in <strong>{secondsLeft} second{secondsLeft === 1 ? '' : 's'}</strong> because
          there has been no activity.
        </p>
        <div className="timeout-actions">
          <button type="button" className="btn btn-primary" onClick={reset} autoFocus>Stay signed in</button>
          <button type="button" className="btn btn-outline" onClick={logout}>Log out now</button>
        </div>
      </div>
    </div>
  );
}
