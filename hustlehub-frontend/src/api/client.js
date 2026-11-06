// Every call to the backend goes through here. It adds the JWT, turns failures into friendly messages,
// and never exposes raw server output to the user interface.

import { formatWait } from '../utils/format';

const TOKEN_KEY = 'hustlehub_token';

// sessionStorage is cleared when the tab closes, so a token never outlives the browsing session.
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, retryAfterSeconds } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function toFieldErrors(errors) {
  const map = {};
  (Array.isArray(errors) ? errors : []).forEach((e) => {
    if (e && e.field && !map[e.field]) map[e.field] = e.message;
  });
  return map;
}

function friendlyMessage(status, payload) {
  if (status === 429) {
    const wait = payload && payload.retryAfterSeconds ? ` Try again in ${formatWait(payload.retryAfterSeconds)}.` : '';
    return `${(payload && payload.message) || 'Too many requests.'}${wait}`;
  }
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return (payload && payload.message) || 'Something went wrong. Please try again.';
}

function buildQuery(query) {
  const clean = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
}

async function request(method, path, { body, query } = {}) {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // A 401 while holding a token means the session expired or was revoked.
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(friendlyMessage(response.status, payload), {
      status: response.status,
      fieldErrors: toFieldErrors(payload && payload.errors),
      retryAfterSeconds: payload && payload.retryAfterSeconds,
    });
  }
  return payload;
}

export const api = {
  auth: {
    register: (data) => request('POST', '/auth/register', { body: data }),
    login: (data) => request('POST', '/auth/login', { body: data }),
    profile: () => request('GET', '/auth/profile'),
  },
  gigs: {
    list: (query) => request('GET', '/gigs', { query }),
    mine: () => request('GET', '/gigs/mine'),
    get: (id) => request('GET', `/gigs/${id}`),
    create: (data) => request('POST', '/gigs', { body: data }),
    update: (id, data) => request('PUT', `/gigs/${id}`, { body: data }),
    remove: (id) => request('DELETE', `/gigs/${id}`),
  },
  bookings: {
    create: (data) => request('POST', '/bookings', { body: data }),
    list: (query) => request('GET', '/bookings', { query }),
    accept: (id) => request('PATCH', `/bookings/${id}/accept`),
    reject: (id) => request('PATCH', `/bookings/${id}/reject`),
    complete: (id) => request('PATCH', `/bookings/${id}/complete`),
  },
  transactions: {
    list: (query) => request('GET', '/transactions', { query }),
    income: () => request('GET', '/transactions/income'),
  },
  admin: {
    users: (query) => request('GET', '/admin/users', { query }),
    summary: () => request('GET', '/admin/summary'),
  },
};
