import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { api, tokenStore } from '../api/client';

let handleUnauthorized;
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { auth: { login: vi.fn(), register: vi.fn(), profile: vi.fn(), logout: vi.fn() } },
    setUnauthorizedHandler: (fn) => { handleUnauthorized = fn; },
  };
});

function Probe() {
  const { user, sessionMessage, login, logout, expireSession } = useAuth();
  return (
    <div>
      <p data-testid="who">{user ? user.username : 'nobody'}</p>
      <p data-testid="message">{sessionMessage}</p>
      <button onClick={() => login('a@b.co', 'pw')}>login</button>
      <button onClick={logout}>logout</button>
      <button onClick={() => expireSession('Timed out')}>expire</button>
    </div>
  );
}

async function loggedIn() {
  api.auth.login.mockResolvedValue({ data: { token: 'tok-1', user: { id: '1', username: 'cara', role: 'client' } } });
  render(<AuthProvider><Probe /></AuthProvider>);
  await userEvent.click(screen.getByText('login'));
  await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('cara'));
}

describe('AuthContext sessions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    api.auth.logout.mockResolvedValue({ success: true });
  });

  it('logging out also ends the session on the server', async () => {
    await loggedIn();
    await userEvent.click(screen.getByText('logout'));
    expect(api.auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('who')).toHaveTextContent('nobody');
    expect(tokenStore.get()).toBeFalsy();
  });

  it('still logs out in the browser when the server cannot be reached', async () => {
    api.auth.logout.mockRejectedValue(new Error('offline'));
    await loggedIn();
    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('who')).toHaveTextContent('nobody');
    expect(tokenStore.get()).toBeFalsy();
  });

  it('an inactivity sign-out revokes the session and explains why', async () => {
    await loggedIn();
    await userEvent.click(screen.getByText('expire'));
    expect(api.auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('message')).toHaveTextContent('Timed out');
  });

  it('a 401 from the server logs out locally without trying to revoke again', async () => {
    await loggedIn();
    act(() => handleUnauthorized());
    expect(api.auth.logout).not.toHaveBeenCalled();
    expect(screen.getByTestId('who')).toHaveTextContent('nobody');
    expect(screen.getByTestId('message')).toHaveTextContent(/session has expired/i);
  });

  it('does not call the server when nobody is logged in', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await userEvent.click(screen.getByText('logout'));
    expect(api.auth.logout).not.toHaveBeenCalled();
  });
});
