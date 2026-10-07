// Connects Mongoose to MongoDB Atlas.

const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

// Treats any filter value containing $-operators as a literal, which blocks NoSQL operator injection.
// Our own queries opt in to operators explicitly with mongoose.trusted().
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName,
    serverSelectionTimeoutMS: 10000,
  });
  logger.info(`MongoDB connected (database: ${mongoose.connection.name})`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
