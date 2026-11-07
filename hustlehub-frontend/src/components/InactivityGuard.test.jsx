import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InactivityGuard from './InactivityGuard';
import { useAuth } from '../context/AuthContext';
import { INACTIVITY_MESSAGE } from '../utils/session';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

// Short limits keep the tests quick: 10 seconds of inactivity, warning for the last 4.
const LIMIT = 10000;
const WARNING = 4000;
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('InactivityGuard', () => {
  let expireSession;
  let logout;

  beforeEach(() => {
    vi.useFakeTimers();
    expireSession = vi.fn();
    logout = vi.fn();
    useAuth.mockReturnValue({ expireSession, logout });
    render(<InactivityGuard limitMs={LIMIT} warningMs={WARNING} />);
  });

  afterEach(() => vi.useRealTimers());

  it('stays quiet while there is recent activity', () => {
    advance(5000);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('warns shortly before signing out, with a countdown', () => {
    advance(7000);
    const dialog = screen.getByRole('alertdialog', { name: 'Are you still there?' });
    expect(dialog).toHaveTextContent(/3 seconds/);
    advance(1000);
    expect(dialog).toHaveTextContent(/2 seconds/);
  });

  it('signs the person out, with an explanation, when the time runs out', () => {
    advance(LIMIT + 1000);
    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(expireSession).toHaveBeenCalledWith(INACTIVITY_MESSAGE);
  });

  it('activity before the warning restarts the clock', () => {
    advance(5000);
    fireEvent.keyDown(window, { key: 'a' });
    advance(5000); // 10s since the start, but only 5s since the last key press
    expect(expireSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    advance(5000);
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('mouse movement does NOT hide the warning - only a deliberate click does', () => {
    advance(7000);
    fireEvent.pointerMove(window);
    fireEvent.keyDown(window, { key: 'a' });
    advance(1000);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    advance(3000);
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('"Stay signed in" dismisses the warning and starts a fresh countdown', () => {
    advance(7000);
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    advance(6000);
    expect(expireSession).not.toHaveBeenCalled();
    advance(5000);
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('"Log out now" logs out straight away', () => {
    advance(7000);
    fireEvent.click(screen.getByRole('button', { name: 'Log out now' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('is exact even if the browser was asleep and timers were skipped', () => {
    // Move the clock forward by a long time in a single jump, as happens when a laptop wakes up.
    act(() => { vi.setSystemTime(Date.now() + 60 * 60 * 1000); vi.advanceTimersByTime(1000); });
    expect(expireSession).toHaveBeenCalledTimes(1);
  });
});
