import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const renderNavbar = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

describe('Navbar', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('offers log in and register when logged out', () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My gigs' })).not.toBeInTheDocument();
  });

  it('shows client links only to clients', () => {
    useAuth.mockReturnValue({ user: { username: 'cara', role: 'client' }, logout: vi.fn() });
    renderNavbar();

    expect(screen.getByRole('link', { name: 'My bookings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My gigs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows freelancer links only to freelancers', () => {
    useAuth.mockReturnValue({ user: { username: 'fiona', role: 'freelancer' }, logout: vi.fn() });
    renderNavbar();

    expect(screen.getByRole('link', { name: 'My gigs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Income' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My bookings' })).not.toBeInTheDocument();
  });

  it('shows the admin link only to admins', () => {
    useAuth.mockReturnValue({ user: { username: 'root', role: 'admin' }, logout: vi.fn() });
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('logs the user out when Log out is clicked', async () => {
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { username: 'cara', role: 'client' }, logout });
    renderNavbar();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
