import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GigsPage from './GigsPage';
import { ApiError, api } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, api: { gigs: { list: vi.fn() } } };
});

const gig = (id, title, price) => ({ id, title, price, description: 'A description long enough.', category: 'Design', deliveryDays: 2, freelancer: { id: 'f1', username: 'fiona_f' } });
const page = (gigs, pages = 1) => ({ success: true, data: gigs, pagination: { page: 1, limit: 9, total: gigs.length, pages } });
const renderPage = () => render(<MemoryRouter><GigsPage /></MemoryRouter>);

describe('GigsPage', () => {
  beforeEach(() => {
    api.gigs.list.mockReset();
  });

  it('shows a loading note and then the gigs', async () => {
    api.gigs.list.mockResolvedValue(page([gig('1', 'Logo design', 450), gig('2', 'Maths tutoring', 200)]));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(/loading gigs/i);
    expect(await screen.findByRole('heading', { name: 'Logo design' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maths tutoring' })).toBeInTheDocument();
  });

  it('searches when the form is submitted', async () => {
    api.gigs.list.mockResolvedValue(page([gig('1', 'Logo design', 450)]));
    renderPage();
    await screen.findByRole('heading', { name: 'Logo design' });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Search'), 'logo');
    await user.selectOptions(screen.getByLabelText('Category'), 'Design');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(api.gigs.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'logo', category: 'Design', page: 1 }));
  });

  it('explains when nothing matches and lets people clear the filters', async () => {
    api.gigs.list.mockResolvedValueOnce(page([gig('1', 'Logo design', 450)])).mockResolvedValue(page([]));
    renderPage();
    await screen.findByRole('heading', { name: 'Logo design' });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Search'), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: /no gigs match your search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('shows a friendly error if the server cannot be reached', async () => {
    api.gigs.list.mockImplementation(() => Promise.reject(new ApiError('Cannot reach the server. Check your connection and try again.')));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i);
  });

  it('moves between pages', async () => {
    api.gigs.list.mockResolvedValue(page([gig('1', 'Logo design', 450)], 3));
    renderPage();
    await screen.findByRole('heading', { name: 'Logo design' });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));
    expect(api.gigs.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });
});
