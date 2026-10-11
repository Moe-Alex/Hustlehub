import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setUnauthorizedHandler, tokenStore } from './client';

const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends the JWT in the Authorization header', async () => {
    tokenStore.set('abc.def.ghi');
    fetch.mockResolvedValue(jsonResponse(200, { success: true, data: [] }));

    await api.gigs.list({ q: 'logo', page: 2 });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/gigs?q=logo&page=2');
    expect(options.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('turns validation errors into a field map', async () => {
    fetch.mockResolvedValue(jsonResponse(400, { success: false, message: 'Validation failed.', errors: [{ field: 'price', message: 'Price must be positive.' }] }));

    await expect(api.gigs.create({})).rejects.toMatchObject({ status: 400, fieldErrors: { price: 'Price must be positive.' } });
  });

  it('explains rate limiting and how long to wait', async () => {
    fetch.mockResolvedValue(jsonResponse(429, { success: false, message: 'You are booking too quickly.', retryAfterSeconds: 600 }));

    await expect(api.bookings.create({ gigId: 'x' })).rejects.toThrow('You are booking too quickly. Try again in 10 minutes.');
  });

  it('never shows raw server errors to the user', async () => {
    fetch.mockResolvedValue(jsonResponse(500, { success: false, message: 'MongoServerError: secret internal detail' }));

    const error = await api.gigs.list().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).not.toContain('Mongo');
    expect(error.message).toMatch(/something went wrong/i);
  });

  it('reports a network failure in plain language', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.gigs.list()).rejects.toThrow(/cannot reach the server/i);
  });

  it('signals an expired session when a logged-in request gets 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    tokenStore.set('old.token.value');
    fetch.mockResolvedValue(jsonResponse(401, { success: false, message: 'Not authorised.' }));

    await expect(api.auth.profile()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not treat a failed login as an expired session', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetch.mockResolvedValue(jsonResponse(401, { success: false, message: 'Invalid email or password.' }));

    await expect(api.auth.login({ email: 'a@b.co', password: 'x' })).rejects.toThrow('Invalid email or password.');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
