# HustleHub+ web image: React is built once, then served by nginx over HTTPS with security headers,
# and /api requests are forwarded to the API container. Build:  docker build -t hustlehub-web ./hustlehub-frontend

# ---- Stage 1: build the React app ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: serve it (this image runs nginx as an unprivileged user) ----
# Current stable nginx on the current Alpine release. The old 1.27 image (Alpine 3.21) had dozens of known OS vulnerabilities.
FROM nginxinc/nginx-unprivileged:1.30-alpine3.24

USER root
# apk upgrade installs any security fixes released since the base image was built.
RUN apk upgrade --no-cache && apk add --no-cache openssl
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker/20-generate-cert.sh /docker-entrypoint.d/20-generate-cert.sh
COPY --from=build /app/dist /usr/share/nginx/html
USER 101

# Where /api requests are sent. Compose uses the "api" service; change it with -e API_UPSTREAM=...
ENV API_UPSTREAM=https://api:5000 \
    NGINX_ENVSUBST_FILTER=API_ \
    SSL_DIR=/tmp/certs

EXPOSE 8443
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --no-check-certificate -q -O /dev/null https://127.0.0.1:8443/ || exit 1
