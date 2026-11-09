// Entry point - connects to MongoDB, then serves the Express app over HTTPS using a locally-generated SSL certificate (see README for the OpenSSL command).

const fs = require('fs');
const https = require('https');
const app = require('./app');
const config = require('./config/config');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utils/logger');

async function startServer() {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- certificate paths come from the server's own configuration (.env), not from requests
  const certsExist = fs.existsSync(config.sslKeyPath) && fs.existsSync(config.sslCertPath);

  if (!certsExist) {
    console.error(
      '\n[STARTUP ERROR] SSL certificate/key not found at:\n' +
        `  ${config.sslKeyPath}\n  ${config.sslCertPath}\n\n` +
        'Generate one first:\n' +
        '  mkdir certs\n' +
        '  openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -days 365\n'
    );
    process.exit(1);
  }

  await connectDB();

  const httpsOptions = {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- certificate paths come from the server's own configuration (.env), not from requests
    key: fs.readFileSync(config.sslKeyPath),
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- certificate paths come from the server's own configuration (.env), not from requests
    cert: fs.readFileSync(config.sslCertPath),
  };

  const server = https.createServer(httpsOptions, app).listen(config.port, () => {
    logger.info('system.startup', { port: config.port, environment: config.nodeEnv, cloudLogging: logger.cloudEnabled });
    console.log(`HustleHub+ backend listening securely on https://localhost:${config.port} (${config.nodeEnv})`);
  });

  // Close the server and database cleanly on Ctrl+C or a stop signal.
  const shutdown = (signal) => {
    logger.info('system.shutdown', { signal });
    server.close(async () => {
      await disconnectDB();
      await logger.close(); // send any log lines still waiting for the cloud
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  logger.error('system.startup.failed', { errorName: err.name, message: err.message });
  void logger.close().finally(() => process.exit(1)); // void: nothing waits for this, the process exits when it settles
});
