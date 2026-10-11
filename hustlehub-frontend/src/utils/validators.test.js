import { describe, expect, it } from 'vitest';
import { validateGig, validateLogin, validateRegister } from './validators';

describe('validateLogin', () => {
  it('requires an email and a password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Enter your email address.', password: 'Enter your password.' });
  });

  it('accepts valid details', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const good = { username: 'moe_alex', email: 'moe@example.com', password: 'Strong_Pass1!', role: 'client' };

  it('accepts valid details', () => {
    expect(validateRegister(good)).toEqual({});
  });

  it('rejects weak passwords and bad usernames', () => {
    expect(validateRegister({ ...good, password: 'password' }).password).toMatch(/uppercase/);
    expect(validateRegister({ ...good, username: 'no spaces!' }).username).toMatch(/letters, numbers/);
  });

  it('refuses the admin role', () => {
    expect(validateRegister({ ...good, role: 'admin' }).role).toBeDefined();
  });
});

describe('validateGig', () => {
  const good = { title: 'Logo design', description: 'A clean, modern logo for you.', category: 'Design', price: '450', deliveryDays: '3' };

  it('accepts a valid gig', () => {
    expect(validateGig(good)).toEqual({});
  });

  it('rejects out-of-range numbers', () => {
    expect(validateGig({ ...good, price: '-5' }).price).toBeDefined();
    expect(validateGig({ ...good, price: '999999' }).price).toBeDefined();
    expect(validateGig({ ...good, deliveryDays: '1.5' }).deliveryDays).toBeDefined();
  });
});
