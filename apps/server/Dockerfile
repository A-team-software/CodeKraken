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

#Install ngrok
RUN curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | tee /etc/apt/sources.list.d/ngrok.list \
  && apt update \
  && apt install ngrok

ARG NGROK_TOKEN
RUN ngrok config add-authtoken ${NGROK_TOKEN}

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/server/.dockerenvfile .

# Install all dependencies (devDependencies needed for Next.js TypeScript compilation)
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/apps/server/.next ./apps/server/.next

WORKDIR /app/apps/server


# Create entrypoint script to load .dockerenv
RUN echo '#!/bin/bash\n\
if [ -f /app/.dockerenvfile ]; then\n\
  set -a\n\
  source /app/.dockerenvfile\n\
  set +a\n\
fi\n\
exec "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh"]
