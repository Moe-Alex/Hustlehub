import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage', () => {
  let login;

  beforeEach(() => {
    login = vi.fn();
    useAuth.mockReturnValue({ user: null, login, sessionMessage: '' });
  });

  it('renders the form', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('asks for missing details without calling the server', async () => {
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects a badly formed email before sending it', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'something');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in with the typed details', async () => {
    login.mockResolvedValue({ role: 'client' });
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email address'), '  moe@example.com ');
    await user.type(screen.getByLabelText('Password'), 'Secret_Pass1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(login).toHaveBeenCalledWith('moe@example.com', 'Secret_Pass1!');
  });

  it('shows a clear message when the server rejects the login', async () => {
    login.mockRejectedValue(new ApiError('Invalid email or password.', { status: 401 }));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email address'), 'moe@example.com');
    await user.type(screen.getByLabelText('Password'), 'Wrong_Pass1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  // Every role starts on its own home page, even if the previous person left a different page open.
  it.each([
    ['client', '/gigs'],
    ['freelancer', '/my-gigs'],
    ['admin', '/admin'],
  ])('sends a logged-in %s to %s, ignoring the page that was open before', (role, home) => {
    useAuth.mockReturnValue({ user: { role }, login, sessionMessage: '' });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/income' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path={home} element={<p data-testid="landing">{home}</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('landing')).toHaveTextContent(home);
  });
});
