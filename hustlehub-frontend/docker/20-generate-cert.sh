#!/bin/sh
# nginx start-up hook: creates a self-signed certificate for local HTTPS unless one is mounted at $SSL_DIR.
set -e
mkdir -p "$SSL_DIR"
if [ ! -f "$SSL_DIR/key.pem" ] || [ ! -f "$SSL_DIR/cert.pem" ]; then
  echo "20-generate-cert.sh: generating a self-signed certificate for local use."
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
    -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:web,IP:127.0.0.1" 2>/dev/null
fi
