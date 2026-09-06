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
ENV WEB_DATABASE_URL=mysql://build:build@localhost/build
RUN bun run build

# Run server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma/web ./prisma/web
COPY package.json ./
COPY tsconfig.json ./

# Expose the API port
EXPOSE 3000

# Run the Elysia server
CMD ["sh", "-c", "bun run db:migrate && exec bun src/server/index.ts"]
