import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import GigCard from './GigCard';

const gig = {
  id: 'g1',
  title: 'Logo design',
  description: 'A clean, modern logo for your business.',
  category: 'Design',
  price: 450,
  deliveryDays: 3,
  freelancer: { id: 'f1', username: 'fiona_f' },
};

describe('GigCard', () => {
  it('shows the gig details', () => {
    render(<MemoryRouter><GigCard gig={gig} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Logo design' })).toBeInTheDocument();
    expect(screen.getByText(/450/)).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText(/delivered in 3 days/i)).toBeInTheDocument();
    expect(screen.getByText(/by fiona_f/i)).toBeInTheDocument();
  });

  it('links to the gig page', () => {
    render(<MemoryRouter><GigCard gig={gig} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Logo design' })).toHaveAttribute('href', '/gigs/g1');
  });

  it('renders text from the server as plain text, never as HTML', () => {
    const hostile = { ...gig, title: '<img src=x onerror=alert(1)>', description: '<script>alert(1)</script>' };
    const { container } = render(<MemoryRouter><GigCard gig={hostile} /></MemoryRouter>);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
