FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/agent/package*.json ./packages/agent/
COPY packages/temporal-worker/package*.json ./packages/temporal-worker/
COPY packages/bff/package*.json ./packages/bff/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/agent ./packages/agent
COPY packages/temporal-worker ./packages/temporal-worker
COPY packages/bff ./packages/bff

# Build all packages
RUN npm run build:shared
RUN npm run build:agent
RUN npm run build:temporal
RUN npm run build:bff

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Expose port
EXPOSE 3000

# Start BFF service
CMD ["node", "packages/bff/dist/index.js"]
