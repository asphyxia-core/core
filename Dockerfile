# Build stage
FROM oven/bun:1.4.2 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY plugins/ ./plugins/

RUN bun run build --target=bun-linux-x64 --no-zip --outfile=/app/asphyxia-core

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/asphyxia-core ./
COPY --from=builder /app/assets ./assets/
COPY --from=builder /app/plugins ./plugins/

RUN mkdir -p savedata

EXPOSE 8083
EXPOSE 5700

# Use tini as entrypoint so SIGINT/SIGTERM are forwarded to the server
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./asphyxia-core", "-b", "0.0.0.0"]
