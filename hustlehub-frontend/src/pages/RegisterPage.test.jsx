import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  let register;

  beforeEach(() => {
    register = vi.fn();
    useAuth.mockReturnValue({ user: null, register });
  });

  it('only offers the client and freelancer roles', () => {
    renderPage();
    const options = screen.getAllByRole('option').map((option) => option.value);
    expect(options).toEqual(['client', 'freelancer']);
    expect(options).not.toContain('admin');
  });

  it('explains a weak password and does not submit', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'moe_alex');
    await user.type(screen.getByLabelText('Email address'), 'moe@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText(/include an uppercase letter/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers and then sends the person to log in', async () => {
    register.mockResolvedValue({ success: true });
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'moe_alex');
    await user.type(screen.getByLabelText('Email address'), 'moe@example.com');
    await user.type(screen.getByLabelText('Password'), 'Strong_Pass1!');
    await user.selectOptions(screen.getByLabelText('I want to'), 'freelancer');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({ username: 'moe_alex', email: 'moe@example.com', password: 'Strong_Pass1!', role: 'freelancer' });
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });
});
