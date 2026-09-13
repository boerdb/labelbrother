FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY web/package.json ./web/
RUN npm ci --workspace=web

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY web ./web
WORKDIR /app/web
RUN node scripts/generate-icons.mjs
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8443
ENV HOSTNAME=0.0.0.0
ENV PRINTER_HOST=192.168.1.215
ENV PRINTER_PORT=9100
ENV DEFAULT_LABEL=85x62

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/web /app/web
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8443
WORKDIR /app/web
ENTRYPOINT ["/entrypoint.sh"]
