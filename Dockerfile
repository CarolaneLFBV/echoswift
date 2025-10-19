# Stage 1: Build
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Stage 2: Production
FROM oven/bun:1.1-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S botuser && \
    adduser -S -D -H -u 1001 -G botuser botuser

# Copy dependencies and source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Create data directory and set permissions
RUN mkdir -p /app/data && \
    chown -R botuser:botuser /app/data

# Volume for persistent data
VOLUME ["/app/data"]

# Switch to non-root user
USER botuser

# Health check (optional - bot has no HTTP endpoint)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD pgrep -f "bun run src/index.ts" || exit 1

# Start bot
CMD ["bun", "run", "src/index.ts"]
