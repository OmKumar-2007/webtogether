# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm for monorepo ergonomics
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy workspace manifest
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install dependencies (frozen lockfile)
RUN pnpm install --frozen-lockfile

# Copy source
COPY shared ./shared
COPY backend ./backend

# Build shared then backend
RUN pnpm --filter @webtogether/shared build \
 && pnpm --filter @webtogether/backend build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/shared/node_modules ./shared/node_modules

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
