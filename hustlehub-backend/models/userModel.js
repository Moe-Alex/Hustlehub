// File-based storage for Part 1 (MongoDB Atlas will replace this in Part 2).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

// Creates the data file on first run so a fresh clone works out of the box.
function ensureStoreExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readAll() {
  ensureStoreExists();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw || '[]');
  } catch (err) {
    return []; // corrupt file should never crash the API
  }
}

function writeAll(users) {
  ensureStoreExists();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function findByEmail(email) {
  if (!email) return undefined;
  return readAll().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findByUsername(username) {
  if (!username) return undefined;
  return readAll().find((u) => u.username.toLowerCase() === String(username).toLowerCase());
}

function findById(id) {
  return readAll().find((u) => u.id === id);
}

// Expects the password to already be hashed - this file never touches bcrypt itself, that stays the controller's job.
function createUser({ username, email, hashedPassword, role }) {
  const users = readAll();

  const newUser = {
    id: crypto.randomUUID(),
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: role || 'client',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeAll(users);

  return newUser;
}

module.exports = { findByEmail, findByUsername, findById, createUser };