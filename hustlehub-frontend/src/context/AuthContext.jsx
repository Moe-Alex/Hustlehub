// Holds the logged-in user for the whole app. The JWT lives in sessionStorage (see api/client.js).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const [sessionMessage, setSessionMessage] = useState('');

  // revoke: also tell the server to end the session, so a copied token stops working. This is best effort -
  // if the server cannot be reached the person is still logged out in this browser.
  const endSession = useCallback((message = '', revoke = false) => {
    if (revoke && tokenStore.get()) api.auth.logout().catch(() => {});
    tokenStore.clear();
    setUser(null);
    setSessionMessage(message);
  }, []);

  // If any request comes back 401 while logged in, the session has expired.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('Your session has expired. Please log in again.'));
  }, [endSession]);

  // On first load, check a stored token is still valid.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.auth
      .profile()
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.auth.login({ email, password });
    tokenStore.set(res.data.token);
    setUser(res.data.user);
    setSessionMessage('');
    return res.data.user;
  }, []);

  const register = useCallback((details) => api.auth.register(details), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionMessage,
      login,
      register,
      // Log out button: ends the session on the server as well.
      logout: () => endSession('', true),
      // Used by the inactivity timer: same, but explains why the person was signed out.
      expireSession: (message) => endSession(message, true),
    }),
    [user, loading, sessionMessage, login, register, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
