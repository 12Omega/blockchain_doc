# Multi-stage Docker build for blockchain document verification system

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Stage 3: Build smart contracts
FROM node:18-alpine AS contracts-builder

WORKDIR /app/contracts

# Copy contracts package files
COPY contracts/package*.json ./
RUN npm ci

# Copy contracts source
COPY contracts/ ./

# Compile contracts
RUN npm run compile

# Stage 4: Production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built backend
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend ./backend

# Copy built frontend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/build ./frontend/build

# Copy compiled contracts
COPY --from=contracts-builder --chown=nodejs:nodejs /app/contracts/artifacts ./backend/contracts
COPY --from=contracts-builder --chown=nodejs:nodejs /app/contracts/deployments ./backend/deployments

# Copy production scripts
COPY --chown=nodejs:nodejs scripts/ ./scripts/
COPY --chown=nodejs:nodejs docker-compose.yml ./
COPY --chown=nodejs:nodejs .env.example ./.env.example

# Set permissions
RUN chmod +x scripts/*.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/backups && \
    chown -R nodejs:nodejs /app/logs /app/uploads /app/backups

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]