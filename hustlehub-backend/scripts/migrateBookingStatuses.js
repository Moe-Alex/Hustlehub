// One-off clean-up for data created before the booking approval workflow existed.
// Old bookings had the status "confirmed" and their transaction was "completed" straight away.
//   - "confirmed" bookings become "accepted" (so the freelancer can still mark them completed)
//   - the transaction of each of those bookings becomes "pending" until the work is completed
// Bookings that were already "completed" are left alone. Safe to run more than once.
// Usage: npm run migrate:bookings

const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');

// Expects an open Mongoose connection. Returns how many bookings were changed.
async function migrateBookingStatuses() {
  // The model no longer allows "confirmed", so the raw collection is used to find the old records.
  const legacy = await Booking.collection.find({ status: 'confirmed' }, { projection: { _id: 1 } }).toArray();
  const ids = legacy.map((doc) => doc._id);
  if (ids.length === 0) return 0;

  await Booking.collection.updateMany({ _id: { $in: ids } }, { $set: { status: 'accepted' } });
  await Transaction.collection.updateMany({ booking: { $in: ids } }, { $set: { status: 'pending' } });
  return ids.length;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from .env');
  await mongoose.connect(process.env.MONGODB_URI, process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {});
  const changed = await migrateBookingStatuses();
  console.log(`[migrate] ${changed} old "confirmed" booking(s) moved to "accepted".`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[migrate] ${err.message}`);
    process.exit(1);
  });
}

module.exports = { migrateBookingStatuses };
