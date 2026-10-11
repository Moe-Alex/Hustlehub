import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GigForm from './GigForm';

describe('GigForm', () => {
  it('shows an error for every invalid field and does not submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<GigForm submitLabel="Publish gig" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Publish gig' }));

    expect(screen.getByText('Title must be 3 to 100 characters.')).toBeInTheDocument();
    expect(screen.getByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText(/price must be between/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits clean values with numbers converted', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<GigForm submitLabel="Publish gig" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), '  Logo design  ');
    await user.type(screen.getByLabelText('Description'), 'A clean, modern logo for your business.');
    await user.selectOptions(screen.getByLabelText('Category'), 'Design');
    await user.type(screen.getByLabelText('Price (rand)'), '450');
    await user.type(screen.getByLabelText('Delivery time (days)'), '3');
    await user.click(screen.getByRole('button', { name: 'Publish gig' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Logo design',
      description: 'A clean, modern logo for your business.',
      category: 'Design',
      price: 450,
      deliveryDays: 3,
      isActive: true,
    });
  });

  it('shows errors returned by the server next to the right field', () => {
    render(<GigForm submitLabel="Save" onSubmit={() => {}} serverErrors={{ price: 'Price is too high.' }} />);
    expect(screen.getByText('Price is too high.')).toBeInTheDocument();
  });
});
