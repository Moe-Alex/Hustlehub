import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncomePage from './IncomePage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({ api: { transactions: { income: vi.fn() } } }));

const income = (overrides = {}) => ({
  success: true,
  data: { currency: 'ZAR', totalIncome: 1000, transactionCount: 2, estimatedTaxRate: 0.15, estimatedTax: 150, netIncome: 850, byGig: [{ gigId: 'g1', title: 'Logo design', income: 1000, bookings: 2 }], note: 'Estimated tax uses a simple flat rate for illustration. It is not tax advice.', ...overrides },
});

describe('IncomePage', () => {
  beforeEach(() => {
    api.transactions.income.mockReset();
  });

  it('shows income, estimated tax and income after tax', async () => {
    api.transactions.income.mockResolvedValue(income());
    render(<MemoryRouter><IncomePage /></MemoryRouter>);

    const totalIncome = (await screen.findByText('Total income')).closest('div');
    expect(within(totalIncome).getByText(/1.?000/)).toBeInTheDocument();
    expect(within(totalIncome).getByText('2 bookings')).toBeInTheDocument();

    expect(within(screen.getByText('Estimated tax').closest('div')).getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText('At a flat 15%')).toBeInTheDocument();
    expect(within(screen.getByText('Income after tax').closest('div')).getByText(/850/)).toBeInTheDocument();
    expect(screen.getByText(/not tax advice/i)).toBeInTheDocument();
  });

  it('lists income per gig', async () => {
    api.transactions.income.mockResolvedValue(income());
    render(<MemoryRouter><IncomePage /></MemoryRouter>);

    const row = (await screen.findByRole('cell', { name: 'Logo design' })).closest('tr');
    expect(within(row).getByText('2')).toBeInTheDocument();
  });

  it('invites a new freelancer to create their first gig when there is no income', async () => {
    api.transactions.income.mockResolvedValue(income({ totalIncome: 0, transactionCount: 0, estimatedTax: 0, netIncome: 0, byGig: [] }));
    render(<MemoryRouter><IncomePage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'No income yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my gigs' })).toHaveAttribute('href', '/my-gigs');
  });
});
