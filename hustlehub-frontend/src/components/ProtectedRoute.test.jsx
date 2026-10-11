import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function renderAt(roles) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/secret" element={<ProtectedRoute roles={roles}><p>Secret content</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('sends logged-out visitors to the login page', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt(['admin']);

    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('blocks users whose role is not allowed', () => {
    useAuth.mockReturnValue({ user: { role: 'client' }, loading: false });
    renderAt(['admin']);

    expect(screen.getByRole('heading', { name: /cannot open this page/i })).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('lets users with an allowed role through', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    renderAt(['admin']);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('lets any logged-in user through when no roles are required', () => {
    useAuth.mockReturnValue({ user: { role: 'client' }, loading: false });
    renderAt(undefined);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('waits while the session is being checked', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt(['admin']);

    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});
