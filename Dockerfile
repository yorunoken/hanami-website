FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build frontend
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Run server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/server ./src/server
COPY package.json ./

# Expose the API port
EXPOSE 3001

# Run the Elysia server
CMD ["bun", "src/server/index.ts"]