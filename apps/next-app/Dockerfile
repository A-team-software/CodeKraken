# Use the official Bun image (Debian-based, similar to node:slim)
FROM node:20-slim AS base

# System deps
# Note: oven/bun is based on Debian, so apt-get commands work
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (needed because package.json scripts use bun/bunx)
ENV BUN_INSTALL=/opt/bun
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash

ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app

# Install OpenCode using Bun
# 'bun add --global' replaces 'npm install -g'
RUN bun add --global opencode-ai

# Add Bun's global bin folder to PATH
# Bun installs global binaries to ~/.bun/bin
ENV PATH="/root/.bun/bin:${PATH}"

# Verify installation
# We can call 'opencode' directly now that it's in the PATH
RUN opencode --version

# Optional: copy template config
COPY docker/opencode.template.json /workspace/opencode.json

EXPOSE 3000

CMD ["bunx", "next", "start"]
