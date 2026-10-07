// Creates the first administrator. Admins cannot register through the API, so this is the only way one is made.
// Usage: set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env, then run: npm run seed:admin

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{10,72}$/;

// Expects an open Mongoose connection. Returns 'created' or 'exists'.
async function seedAdmin({ username, email, password }) {
  if (!username || !email || !password) throw new Error('username, email and password are all required.');
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) throw new Error('Admin username must be 3-30 letters, numbers or underscores.');
  if (!STRONG_PASSWORD.test(password)) {
    throw new Error('Admin password must be 10-72 characters with upper, lower, number and special character.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return 'exists';

  await User.create({
    username,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 12),
    role: ROLES.ADMIN,
  });
  return 'created';
}

async function main() {
  require('dotenv').config();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from .env');

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined });
  const result = await seedAdmin({
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  console.log(result === 'created' ? `Admin created: ${process.env.ADMIN_EMAIL}` : `Admin already exists: ${process.env.ADMIN_EMAIL}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { seedAdmin };
