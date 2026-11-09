// End-to-end tests: a real browser uses the real site, which talks to the real API and database.
// They follow the journeys from the brief: register, log in, create a gig, book it, complete it, record the
// transaction, see the income and tax summary, plus the Part 3 security features.

const crypto = require('crypto');
const { test, expect } = require('@playwright/test');

const RUN = Date.now().toString(36);
const PASSWORD = `Aa1!${crypto.randomBytes(8).toString('hex')}`; // random for every run, so no password is written in the code
const freelancer = { username: `e2e_free_${RUN}`, email: `e2e_free_${RUN}@hustlehub.test`, role: 'freelancer' };
const client = { username: `e2e_client_${RUN}`, email: `e2e_client_${RUN}@hustlehub.test`, role: 'client' };
const GIG_TITLE = `E2E logo design ${RUN}`;
const GIG_PRICE = '2500';

async function register(page, person) {
  await page.goto('/register');
  await page.getByLabel('Username').fill(person.username);
  await page.getByLabel('Email address').fill(person.email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('I want to').selectOption(person.role);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Account created. Log in to continue.')).toBeVisible();
}

// By default waits until the person is really signed in (the Log out button appears), so later page loads keep the session.
async function login(page, email, password = PASSWORD, { expectSuccess = true } = {}) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  if (expectSuccess) await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('the site is served over HTTPS with security headers and a strict CSP', async ({ page }) => {
  const response = await page.goto('/login');
  expect(page.url()).toMatch(/^https:/);
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

test('the API refuses anonymous access to protected data', async ({ request }) => {
  const response = await request.get('/api/transactions/income');
  expect(response.status()).toBe(401);
});

test('a freelancer registers, logs in and publishes a gig', async ({ page }) => {
  await register(page, freelancer);
  await login(page, freelancer.email);
  await expect(page).toHaveURL(/\/my-gigs$/);

  await page.goto('/my-gigs/new');
  await page.getByLabel('Title').fill(GIG_TITLE);
  await page.getByLabel('Description').fill('A complete logo pack with three concepts, two rounds of changes and all source files.');
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Price (rand)').fill(GIG_PRICE);
  await page.getByLabel('Delivery time (days)').fill('5');
  await page.getByRole('button', { name: 'Publish gig' }).click();
  await expect(page).toHaveURL(/\/my-gigs$/);
  await expect(page.getByText(GIG_TITLE)).toBeVisible();
  await logout(page);
});

test('a client finds the gig and books it, which creates a pending transaction', async ({ page }) => {
  await register(page, client);
  await login(page, client.email);
  await expect(page).toHaveURL(/\/gigs$/);

  await page.getByRole('link', { name: GIG_TITLE }).first().click();
  await page.getByLabel(/Notes for the freelancer/).fill('Please use blue and gold.');
  await page.getByRole('button', { name: 'Send booking request' }).click();
  await expect(page.getByRole('heading', { name: 'Booking request sent' })).toBeVisible();

  await page.goto('/payments');
  const row = page.getByRole('row').filter({ hasText: GIG_TITLE });
  await expect(row).toContainText(/pending/i);
  await logout(page);
});

test('the freelancer accepts and completes the booking, and the income page shows income and tax', async ({ page }) => {
  await login(page, freelancer.email);
  await page.goto('/bookings');
  await page.getByRole('button', { name: `Accept booking for ${GIG_TITLE}` }).click();
  await page.getByRole('button', { name: `Mark ${GIG_TITLE} as completed` }).click();
  await expect(page.getByRole('button', { name: `Mark ${GIG_TITLE} as completed` })).toHaveCount(0);

  await page.goto('/income');
  await expect(page.getByRole('heading', { name: /income/i }).first()).toBeVisible();
  await expect(page.getByTestId('monthly-income-chart')).toBeVisible();
  await expect(page.getByTestId('income-split-chart')).toBeVisible();
  // R 2 500 earned is far below the tax threshold, so the estimated tax is R 0 and all of it is take-home.
  await expect(page.getByText(/2[\s ,]?500/).first()).toBeVisible();
  await expect(page.getByText('How your tax was worked out')).toBeVisible();
  await expect(page.getByText(GIG_TITLE)).toBeVisible();

  // Changing the assumptions recalculates the estimate.
  await page.getByRole('spinbutton', { name: /Business expenses/ }).fill('1000');
  await page.getByRole('button', { name: 'Update estimate' }).click();
  await expect(page.getByText(/1[\s ,]?500/).first()).toBeVisible(); // taxable income = 2 500 - 1 000
  await logout(page);
});

test('role-based access: a client cannot open freelancer pages', async ({ page }) => {
  await login(page, client.email);
  await page.goto('/income');
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible();
  await logout(page);
});

test('extra security feature: logging out ends the session on the server, so a copied token stops working', async ({ page, request }) => {
  await login(page, client.email);
  await expect(page).toHaveURL(/\/gigs$/);
  const token = await page.evaluate(() => sessionStorage.getItem('hustlehub_token'));
  expect(token).toBeTruthy();

  const before = await request.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
  expect(before.status()).toBe(200);

  await logout(page);

  const after = await request.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
  expect(after.status()).toBe(401);
});

test('extra security feature: too many wrong passwords lock the account, even for the right password', async ({ page }) => {
  const target = { username: `e2e_lock_${RUN}`, email: `e2e_lock_${RUN}@hustlehub.test`, role: 'client' };
  await register(page, target);

  const attempts = Number(process.env.E2E_LOCKOUT_ATTEMPTS || 5);
  for (let i = 0; i < attempts; i += 1) {
    await login(page, target.email, `Bb2!${crypto.randomBytes(6).toString('hex')}`, { expectSuccess: false });
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  }

  await login(page, target.email, PASSWORD, { expectSuccess: false }); // the correct password is now refused too
  await expect(page.getByText(/locked/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('admin can sign in and see the user list', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the admin check.');
  await login(page, email, password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('cell', { name: freelancer.username, exact: true })).toBeVisible();
});
