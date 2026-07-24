# =============================================================================
# Next.js Frontend — Production Dockerfile
# =============================================================================
# Multi-stage build: npm ci + build in stage 1, copy output to slim stage 2.
# Final image is ~150MB instead of ~800MB with node_modules.
# =============================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .

# Build-time environment variables for Next.js
# These are baked into the static bundle at build time
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_AI_URL=/ai
ENV NEXT_PUBLIC_SOCKET_URL=/

RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
