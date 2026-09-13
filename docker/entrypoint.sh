#!/bin/sh
set -e
CERT_DIR="${SSL_CERT%/*}"
mkdir -p "$CERT_DIR"
if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
  echo "TLS-certificaat aanmaken (self-signed)…"
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout "$SSL_KEY" -out "$SSL_CERT" \
    -subj "/CN=brotherdruk.local/O=BrotherDruk"
fi
cd /app/web
exec node server.mjs
