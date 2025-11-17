FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/agent/package*.json ./packages/agent/
COPY packages/temporal-worker/package*.json ./packages/temporal-worker/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/agent ./packages/agent
COPY packages/temporal-worker ./packages/temporal-worker

# Build all packages
RUN npm run build:shared
RUN npm run build:agent
RUN npm run build:temporal

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Start worker
CMD ["node", "packages/temporal-worker/dist/index.js"]
