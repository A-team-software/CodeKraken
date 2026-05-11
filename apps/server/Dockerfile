# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the server
WORKDIR /app/apps/server
RUN pnpm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    bash \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy pnpm
RUN npm install -g pnpm

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/apps/server/.next ./apps/server/.next

WORKDIR /app/apps/server

# Install OpenCode properly
RUN curl -fsSL https://opencode.ai/install | bash

# Ensure binary is available
ENV PATH="/root/.opencode/bin:$PATH"

CMD ["sh"]
