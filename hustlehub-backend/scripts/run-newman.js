// Runs the Postman collection with Newman against a throw-away copy of the API:
//   1. empties a separate TEST database (never your real one) and creates a test admin
//   2. starts the API on a test port
//   3. runs the collection with Newman and writes reports to newman/reports/
//   4. stops the API and exits with Newman's exit code
// Usage: npm test  (needs MONGODB_URI, JWT_SECRET etc. in .env)

const { spawn, spawnSync } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const ROOT = path.join(__dirname, '..');
const PORT = process.env.NEWMAN_PORT || '5055';
const TEST_DB = process.env.NEWMAN_DB_NAME || 'hustlehub_test';
const ADMIN = { username: 'newman_admin', email: 'newman_admin@hustlehub.test', password: 'Newman_Admin_Pass1!' };

function fail(message) {
  console.error(`\n[newman] ${message}`);
  process.exit(1);
}

// Safety checks: only ever wipe a database whose name contains "test" and that differs from the real one.
function checkEnvironment() {
  if (!process.env.MONGODB_URI) fail('MONGODB_URI is missing from .env');
  if (!/test/i.test(TEST_DB)) fail(`Refusing to wipe "${TEST_DB}". The test database name must contain "test".`);
  const realDb = (process.env.MONGODB_DB_NAME || new URL(process.env.MONGODB_URI).pathname.replace('/', '')).trim();
  if (realDb && realDb === TEST_DB) fail('The test database must be different from your real database.');
}

async function prepareDatabase() {
  const mongoose = require('mongoose');
  const { seedAdmin } = require('./seedAdmin');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: TEST_DB });
  await mongoose.connection.dropDatabase();
  await seedAdmin(ADMIN);
  await mongoose.disconnect();
}

function waitForApi(timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = https.get({ host: 'localhost', port: PORT, path: '/api/health', rejectUnauthorized: false }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        return retry();
      });
      req.on('error', retry);
    };
    const retry = () => (Date.now() - started > timeoutMs ? reject(new Error('API did not start in time')) : setTimeout(attempt, 500));
    attempt();
  });
}

function runNewman() {
  fs.mkdirSync(path.join(ROOT, 'newman', 'reports'), { recursive: true });
  // Relative paths and cwd keep this working on Windows folders that contain spaces.
  const args = [
    '--yes', '-p', 'newman@6.2.2', '-p', 'newman-reporter-htmlextra@1.23.1',
    'newman', 'run', 'postman/HustleHub.postman_collection.json',
    '-e', 'postman/HustleHub.postman_environment.json',
    '--env-var', `baseUrl=https://localhost:${PORT}`,
    '--env-var', `adminEmail=${ADMIN.email}`,
    '--env-var', `adminPassword=${ADMIN.password}`,
    '--insecure', // the API uses a self-signed certificate
    '-r', 'cli,htmlextra,json',
    '--reporter-htmlextra-export', 'newman/reports/newman-report.html',
    '--reporter-htmlextra-title', 'HustleHub+ API test report',
    '--reporter-json-export', 'newman/reports/newman-report.json',
  ];
  return spawnSync('npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
}

async function main() {
  checkEnvironment();
  console.log(`[newman] Preparing test database "${TEST_DB}"...`);
  await prepareDatabase();

  console.log(`[newman] Starting API on https://localhost:${PORT} ...`);
  const server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT, NODE_ENV: 'test', MONGODB_DB_NAME: TEST_DB },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  let exitCode = 1;
  try {
    await waitForApi();
    const result = runNewman();
    exitCode = result.status === null ? 1 : result.status;
  } catch (err) {
    console.error(`[newman] ${err.message}`);
  } finally {
    server.kill();
  }

  console.log(exitCode === 0 ? '\n[newman] All tests passed. Reports: newman/reports/' : '\n[newman] Some tests failed. See output above.');
  process.exit(exitCode);
}

main().catch((err) => fail(err.message));
