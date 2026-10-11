import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GigDetailPage from './GigDetailPage';
import { ApiError, api } from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { gigs: { get: vi.fn(), remove: vi.fn() }, bookings: { create: vi.fn() } } };
});
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const gig = { id: 'g1', title: 'Logo design', description: 'A clean, modern logo.', category: 'Design', price: 450, deliveryDays: 3, freelancer: { id: 'f1', username: 'fiona_f' } };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/gigs/g1']}>
      <Routes>
        <Route path="/gigs/:id" element={<GigDetailPage />} />
        <Route path="/gigs" element={<p>All gigs</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GigDetailPage', () => {
  beforeEach(() => {
    api.gigs.get.mockResolvedValue({ success: true, data: gig });
    api.bookings.create.mockReset();
  });

  it('lets a client book, and confirms with the payment reference', async () => {
    useAuth.mockReturnValue({ user: { id: 'c1', role: 'client' } });
    api.bookings.create.mockResolvedValue({ success: true, data: { booking: { id: 'b1' }, transaction: { amount: 450, reference: 'TXN-ABC123DEF4' } } });
    renderPage();

    await screen.findByRole('heading', { name: 'Logo design' });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/notes for the freelancer/i), 'Please use blue.');
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(api.bookings.create).toHaveBeenCalledWith({ gigId: 'g1', notes: 'Please use blue.' });
    expect(await screen.findByRole('heading', { name: 'Booking confirmed' })).toBeInTheDocument();
    expect(screen.getByText('TXN-ABC123DEF4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument();
  });

  it('explains rate limiting when the client books too fast', async () => {
    useAuth.mockReturnValue({ user: { id: 'c1', role: 'client' } });
    api.bookings.create.mockRejectedValue(new ApiError('You are booking too quickly. Try again in 10 minutes.', { status: 429 }));
    renderPage();

    await screen.findByRole('heading', { name: 'Logo design' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/booking too quickly/i);
  });

  it('does not offer booking to freelancers', async () => {
    useAuth.mockReturnValue({ user: { id: 'f2', role: 'freelancer' } });
    renderPage();

    await screen.findByRole('heading', { name: 'Logo design' });
    expect(screen.queryByRole('button', { name: 'Confirm booking' })).not.toBeInTheDocument();
    expect(screen.getByText(/only clients can book gigs/i)).toBeInTheDocument();
  });

  it('lets the owning freelancer jump to the editor', async () => {
    useAuth.mockReturnValue({ user: { id: 'f1', role: 'freelancer' } });
    renderPage();

    await screen.findByRole('heading', { name: 'Logo design' });
    expect(screen.getByRole('link', { name: 'Edit this gig' })).toHaveAttribute('href', '/my-gigs/g1/edit');
  });

  it('asks an admin to confirm before removing a gig', async () => {
    useAuth.mockReturnValue({ user: { id: 'a1', role: 'admin' } });
    api.gigs.remove.mockResolvedValue({ success: true });
    renderPage();

    await screen.findByRole('heading', { name: 'Logo design' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Remove gig' }));
    expect(api.gigs.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, remove gig' }));
    expect(api.gigs.remove).toHaveBeenCalledWith('g1');
    expect(await screen.findByText('All gigs')).toBeInTheDocument();
  });
});
