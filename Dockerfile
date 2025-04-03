# Dockerfile (Node.js + pnpm + Bun)

# Start with the Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally (using npm that comes with Node)
RUN npm install -g pnpm

# --- Install dependencies needed for Bun installer AND BASH ---
# Add 'bash' to this list
RUN apk add --no-cache curl unzip ca-certificates bash

# Download and install Bun using the official script
# This will now work because 'bash' is available
RUN curl -fsSL https://bun.sh/install | bash

# --- IMPORTANT: Add Bun to the PATH ---
# Make the 'bun' command available globally in subsequent commands/shell
ENV PATH="/root/.bun/bin:${PATH}"

# [Optional] Install other base OS dependencies if needed by your packages
# RUN apk add --no-cache build-base python3 git

# Copy only package manifests first for cache efficiency
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install project dependencies using pnpm (as before)
RUN pnpm install --frozen-lockfile

# Source code will be mounted via docker-compose

# Expose ports your applications might use
EXPOSE 3000 3001 5000

# Default command to keep container running idly
CMD ["tail", "-f", "/dev/null"]
