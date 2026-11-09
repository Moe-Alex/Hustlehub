#!/bin/sh
# Creates a self-signed HTTPS certificate the first time the container starts (the API only serves HTTPS),
# then runs the command it was given. To use your own certificate, mount it at the SSL_KEY_PATH / SSL_CERT_PATH locations.
set -e

# Same defaults the API itself uses (config/config.js).
SSL_KEY_PATH="${SSL_KEY_PATH:-./certs/key.pem}"
SSL_CERT_PATH="${SSL_CERT_PATH:-./certs/cert.pem}"
export SSL_KEY_PATH SSL_CERT_PATH

if [ ! -f "$SSL_KEY_PATH" ] || [ ! -f "$SSL_CERT_PATH" ]; then
  echo "No certificate found - generating a self-signed one for local use."
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout "$SSL_KEY_PATH" -out "$SSL_CERT_PATH" \
    -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:api,IP:127.0.0.1" 2>/dev/null
  chmod 600 "$SSL_KEY_PATH"
fi

exec "$@"
