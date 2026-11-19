FROM node:24.22.3-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY .npmrc package.json package-lock.json ./
RUN npm ci
COPY . .
# Build-time values are fixtures. Payload receives production credentials at startup.
RUN mkdir -p public && \
    PAYLOAD_SECRET=build-only-placeholder \
    DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    PUBLIC_SERVER_URL=https://cms.optidigi.nl \
    npm run build

FROM base AS production-dependencies
COPY .npmrc package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
LABEL org.opencontainers.image.source=https://github.com/optidigi/optidigi-cms
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads \
    PAYLOAD_CONFIG_PATH=/app/src/payload.config.ts

# Keep dependencies and TypeScript sources used by the Payload migration CLI.
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/src ./src
COPY --chmod=0755 deploy/start.sh /usr/local/bin/start-cms
RUN install -d -o node -g node /app/.next/cache /app/uploads

USER node
EXPOSE 3000
CMD ["start-cms"]
