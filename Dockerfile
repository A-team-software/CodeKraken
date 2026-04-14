FROM node:22-bookworm-slim

WORKDIR /app

# Install specific pnpm version
RUN npm install -g pnpm@10.33.0

# Configure pnpm to work better with registries
RUN pnpm config set fetch-retry-mintimeout 20000

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates bash && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------------

# COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yam* ./

# Install project dependencies using pnpm (as before)
RUN pnpm install --frozen-lockfile

# Expose ports your applications might use
EXPOSE 3002  5000

# Default command to keep container running idly
CMD ["tail", "-f", "/dev/null"]
