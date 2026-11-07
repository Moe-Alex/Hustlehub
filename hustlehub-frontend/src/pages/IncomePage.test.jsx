import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncomePage from './IncomePage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({ api: { transactions: { income: vi.fn() } } }));

const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'].map((label, i) => ({
  month: `m${i}`, label, income: label === 'Oct' ? 300000 : label === 'Nov' ? 200000 : 0,
}));

// 500 000 of income worked out by hand: 245 100 x 18% + 138 000 x 26% + 116 900 x 31% = 116 237, minus the R17 820 rebate = 98 417.
const income = (overrides = {}) => ({
  success: true,
  data: {
    currency: 'ZAR',
    taxYear: { endYear: 2027, label: '2026/27' },
    availableTaxYears: [{ endYear: 2027, label: '2026/27' }, { endYear: 2026, label: '2025/26' }],
    assumptions: { ageGroup: 'under65', expenses: 0 },
    totalIncome: 500000,
    transactionCount: 4,
    pending: { amount: 0, bookings: 0 },
    taxableIncome: 500000,
    tax: {
      taxBeforeRebates: 116237, rebate: 17820, estimatedTax: 98417, marginalRate: 0.31, effectiveRate: 0.1968, threshold: 99000,
      breakdown: [
        { from: 0, to: 245100, rate: 0.18, amountInBracket: 245100, tax: 44118 },
        { from: 245100, to: 383100, rate: 0.26, amountInBracket: 138000, tax: 35880 },
        { from: 383100, to: 530200, rate: 0.31, amountInBracket: 116900, tax: 36239 },
      ],
    },
    estimatedTax: 98417,
    netIncome: 401583,
    months,
    byGig: [{ gigId: 'g1', title: 'Logo design', income: 500000, bookings: 4 }],
    note: 'This is an estimate for illustration based on SARS tax tables. It assumes your gig income is your only income and is not tax advice.',
    ...overrides,
  },
});

const renderPage = () => render(<MemoryRouter><IncomePage /></MemoryRouter>);

describe('IncomePage', () => {
  beforeEach(() => {
    api.transactions.income.mockReset();
  });

  it('shows income, taxable income, estimated tax and take-home pay', async () => {
    api.transactions.income.mockResolvedValue(income());
    renderPage();

    const earned = (await screen.findByText('Income earned')).closest('div');
    expect(within(earned).getByText(/500.?000/)).toBeInTheDocument();
    expect(within(earned).getByText('4 completed bookings')).toBeInTheDocument();

    const tax = screen.getByText('Estimated tax', { selector: 'dt' }).closest('div');
    expect(within(tax).getByText(/98.?417/)).toBeInTheDocument();
    expect(within(tax).getByText('19.7% of taxable income')).toBeInTheDocument();
    expect(within(screen.getByText('Take-home after tax', { selector: 'dt' }).closest('div')).getByText(/401.?583/)).toBeInTheDocument();
    expect(screen.getByText(/not tax advice/i)).toBeInTheDocument();
  });

  it('explains the calculation bracket by bracket, then rebate, then total', async () => {
    api.transactions.income.mockResolvedValue(income());
    renderPage();

    const table = await screen.findByRole('table', { name: 'Tax worked out bracket by bracket' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('18%')).toBeInTheDocument();
    expect(within(rows[1]).getByText(/44.?118/)).toBeInTheDocument();
    expect(within(rows[3]).getByText('31%')).toBeInTheDocument();
    expect(within(table).getByText('Tax before rebates').closest('tr')).toHaveTextContent(/116.?237/);
    expect(within(table).getByText('Rebate for your age group').closest('tr')).toHaveTextContent(/17.?820/);
    expect(within(table).getByText('Estimated tax').closest('tr')).toHaveTextContent(/98.?417/);
  });

  it('draws the monthly chart with a data table for screen readers', async () => {
    api.transactions.income.mockResolvedValue(income());
    renderPage();

    const chart = await screen.findByTestId('monthly-income-chart');
    expect(within(chart).getByRole('img')).toHaveAccessibleName(/Bar chart of monthly income for the 2026\/27 tax year/);
    expect(within(chart).getAllByRole('row')).toHaveLength(13); // header plus 12 months
    expect(within(chart).getByRole('row', { name: /Oct/ })).toHaveTextContent(/300.?000/);
  });

  it('shows where the income goes with every amount and percentage written out', async () => {
    api.transactions.income.mockResolvedValue(income({ assumptions: { ageGroup: 'under65', expenses: 100000 }, taxableIncome: 400000, estimatedTax: 70000, netIncome: 330000 }));
    renderPage();

    const chart = await screen.findByTestId('income-split-chart');
    expect(within(chart).getByText('Estimated tax').closest('li')).toHaveTextContent('(14%)');
    expect(within(chart).getByText('Business expenses').closest('li')).toHaveTextContent('(20%)');
    expect(within(chart).getByText('Take-home after tax').closest('li')).toHaveTextContent('(66%)');
  });

  it('says nothing is due when income is below the tax threshold', async () => {
    api.transactions.income.mockResolvedValue(income({ totalIncome: 50000, taxableIncome: 50000, estimatedTax: 0, netIncome: 50000, tax: { taxBeforeRebates: 9000, rebate: 17820, estimatedTax: 0, marginalRate: 0, effectiveRate: 0, threshold: 99000, breakdown: [{ from: 0, to: 245100, rate: 0.18, amountInBracket: 50000, tax: 9000 }] } }));
    renderPage();

    expect(await screen.findByText(/Nothing due below R 99.?000/)).toBeInTheDocument();
  });

  it('reports pending bookings without counting them as income', async () => {
    api.transactions.income.mockResolvedValue(income({ pending: { amount: 750, bookings: 2 } }));
    renderPage();

    expect(await screen.findByText(/from 2 bookings are still pending/i)).toBeInTheDocument();
    expect(screen.getByText(/only counts as income once you mark the work completed/i)).toBeInTheDocument();
  });

  it('asks the API again when the tax year, age group or expenses change', async () => {
    api.transactions.income.mockResolvedValue(income());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Income earned');
    expect(api.transactions.income).toHaveBeenLastCalledWith({ taxYear: undefined, ageGroup: 'under65', expenses: undefined });

    await user.selectOptions(screen.getByLabelText('Tax year'), '2026');
    expect(api.transactions.income).toHaveBeenLastCalledWith({ taxYear: '2026', ageGroup: 'under65', expenses: undefined });

    await user.selectOptions(screen.getByLabelText('Age group'), '65to74');
    expect(api.transactions.income).toHaveBeenLastCalledWith({ taxYear: '2026', ageGroup: '65to74', expenses: undefined });

    await user.type(screen.getByLabelText('Business expenses (R)'), '1500');
    await user.click(screen.getByRole('button', { name: 'Update estimate' }));
    expect(api.transactions.income).toHaveBeenLastCalledWith({ taxYear: '2026', ageGroup: '65to74', expenses: 1500 });
  });

  it('refuses negative expenses without calling the API', async () => {
    api.transactions.income.mockResolvedValue(income());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Income earned');
    const calls = api.transactions.income.mock.calls.length;

    await user.type(screen.getByLabelText('Business expenses (R)'), '-20');
    await user.click(screen.getByRole('button', { name: 'Update estimate' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount of zero or more.');
    expect(api.transactions.income).toHaveBeenCalledTimes(calls);
  });

  it('lists income per gig', async () => {
    api.transactions.income.mockResolvedValue(income());
    renderPage();

    const row = (await screen.findByRole('cell', { name: /Logo design/ })).closest('tr');
    expect(within(row).getByText('4')).toBeInTheDocument();
  });

  it('invites a new freelancer to complete a booking when there is no income', async () => {
    api.transactions.income.mockResolvedValue(income({
      totalIncome: 0, transactionCount: 0, taxableIncome: 0, estimatedTax: 0, netIncome: 0, byGig: [],
      tax: { taxBeforeRebates: 0, rebate: 17820, estimatedTax: 0, marginalRate: 0, effectiveRate: 0, threshold: 99000, breakdown: [] },
    }));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No income yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my gigs' })).toHaveAttribute('href', '/my-gigs');
    expect(screen.getByText(/no taxable income in this tax year yet/i)).toBeInTheDocument();
  });
});
