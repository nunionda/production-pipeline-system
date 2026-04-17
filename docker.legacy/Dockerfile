FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build
RUN bun run build

# Production
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src/generated ./src/generated

# Upload directory
RUN mkdir -p /data/uploads && chown nextjs /data/uploads

USER nextjs
EXPOSE 3000

CMD ["bun", "server.js"]
