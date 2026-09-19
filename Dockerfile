# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first for cache efficiency
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma client (no engine — runtime engine provided by DATABASE_URL at start)
RUN npx prisma generate --no-engine

RUN npm run build

# ---- production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./
COPY --from=builder /app/socket-server.js ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "server.js"]
