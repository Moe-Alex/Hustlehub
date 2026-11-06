import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingsPage from './BookingsPage';
import { ApiError, api } from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { bookings: { list: vi.fn(), accept: vi.fn(), reject: vi.fn(), complete: vi.fn() } } };
});
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const booking = (id, status, title) => ({
  id,
  gigTitle: title,
  status,
  price: 450,
  notes: '',
  createdAt: '2026-11-01T10:00:00.000Z',
  client: { username: 'cara_c' },
  freelancer: { username: 'fiona_f' },
});

const list = (...bookings) => ({ success: true, data: bookings, pagination: { page: 1, pages: 1, total: bookings.length } });

function renderPage() {
  return render(<MemoryRouter><BookingsPage /></MemoryRouter>);
}

describe('BookingsPage', () => {
  beforeEach(() => {
    Object.values(api.bookings).forEach((fn) => fn.mockReset());
  });

  it('gives a freelancer Accept and Reject for pending requests and Mark completed for accepted work', async () => {
    useAuth.mockReturnValue({ user: { id: 'f1', role: 'freelancer' } });
    api.bookings.list.mockResolvedValue(list(booking('b1', 'pending', 'Logo design'), booking('b2', 'accepted', 'Poster'), booking('b3', 'rejected', 'Flyer')));
    renderPage();

    await screen.findByText('Logo design');
    expect(screen.getByRole('button', { name: 'Accept booking for Logo design' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject booking for Logo design' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark Logo design as completed' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Mark Poster as completed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept booking for Poster' })).not.toBeInTheDocument();

    const rejectedRow = screen.getByText('Flyer').closest('tr');
    expect(within(rejectedRow).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rejectedRow).getByText('Rejected')).toBeInTheDocument();
  });

  it('accepts a pending booking and reloads the list', async () => {
    useAuth.mockReturnValue({ user: { id: 'f1', role: 'freelancer' } });
    api.bookings.list.mockResolvedValue(list(booking('b1', 'pending', 'Logo design')));
    api.bookings.accept.mockResolvedValue({ success: true });
    renderPage();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Accept booking for Logo design' }));

    expect(api.bookings.accept).toHaveBeenCalledWith('b1');
    expect(api.bookings.list).toHaveBeenCalledTimes(2);
  });

  it('rejects a pending booking', async () => {
    useAuth.mockReturnValue({ user: { id: 'f1', role: 'freelancer' } });
    api.bookings.list.mockResolvedValue(list(booking('b1', 'pending', 'Logo design')));
    api.bookings.reject.mockResolvedValue({ success: true });
    renderPage();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reject booking for Logo design' }));

    expect(api.bookings.reject).toHaveBeenCalledWith('b1');
  });

  it('shows the server message when an action is refused', async () => {
    useAuth.mockReturnValue({ user: { id: 'f1', role: 'freelancer' } });
    api.bookings.list.mockResolvedValue(list(booking('b1', 'pending', 'Logo design')));
    api.bookings.accept.mockRejectedValue(new ApiError('Only pending bookings can be accepted.', { status: 409 }));
    renderPage();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Accept booking for Logo design' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only pending bookings can be accepted.');
  });

  it('never offers a client any way to confirm their own booking', async () => {
    useAuth.mockReturnValue({ user: { id: 'c1', role: 'client' } });
    api.bookings.list.mockResolvedValue(list(booking('b1', 'pending', 'Logo design'), booking('b2', 'accepted', 'Poster')));
    renderPage();

    await screen.findByText('Logo design');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
