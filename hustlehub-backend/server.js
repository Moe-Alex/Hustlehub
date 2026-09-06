// Entry point - wraps the Express app in a Node.js HTTPS server using a locally-generated SSL certificate (see README for the OpenSSL command).

const fs = require('fs');
const https = require('https');
const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');

function startServer() {
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

  const httpsOptions = {
    key: fs.readFileSync(config.sslKeyPath),
    cert: fs.readFileSync(config.sslCertPath),
  };

  https.createServer(httpsOptions, app).listen(config.port, () => {
    logger.info(`HustleHub+ backend listening securely on https://localhost:${config.port} (${config.nodeEnv})`);
  });
}

startServer();