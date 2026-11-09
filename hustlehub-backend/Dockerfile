# HustleHub+ API image. Build:  docker build -t hustlehub-api ./hustlehub-backend
# Runs as the unprivileged "node" user, installs production dependencies only, and checks its own health.
FROM node:22-alpine

# openssl is only used to create a self-signed certificate on first start (see docker-entrypoint.sh).
RUN apk add --no-cache openssl

ENV NODE_ENV=production \
    PORT=5000 \
    LOG_TO_FILE=false \
    LOG_FORMAT=json

WORKDIR /app

# Dependencies first, so this layer is cached until package files change.
COPY --chown=node:node package.json package-lock.json ./
# npm is only needed to install the dependencies. It is removed afterwards so the final image is smaller and does not
# carry the vulnerable packages that npm bundles inside itself (Trivy reports those against the image).
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Only the application code is copied (not everything in the folder), so nothing else can end up in the image.
COPY --chown=node:node app.js server.js docker-entrypoint.sh ./
COPY --chown=node:node config ./config
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node models ./models
COPY --chown=node:node routes ./routes
COPY --chown=node:node utils ./utils
COPY --chown=node:node scripts ./scripts
RUN mkdir -p certs logs && chown node:node certs logs && chmod +x docker-entrypoint.sh

USER node
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('https').get({host:'localhost',port:process.env.PORT,path:'/api/health',rejectUnauthorized:false},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
