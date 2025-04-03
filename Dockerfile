# Dockerfile (or Dockerfile.dev)

# Choose a specific Node.js LTS version for consistency
# Alpine is smaller, but sometimes has compatibility issues with native modules.
# Use node:20 or node:18 if you encounter problems.
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# [Optional but recommended] Install Turborepo CLI globally if you execute turbo commands directly often
# RUN pnpm add -g turbo

# Install base OS dependencies IF needed by your packages (e.g., build-essential, python3, git)
# RUN apk add --no-cache build-base python3 git

# Copy only package manifests first to leverage Docker cache for dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies using pnpm.
# This step *might* seem redundant if using host node_modules via volumes,
# BUT it's good practice to ensure the image *can* build dependencies,
# especially if native modules are involved or if you want a fallback.
# For pure dev speed with host modules, you *could* comment this out,
# but having it provides a more complete container environment.
# We use --shamefully-hoist or --public-hoist if needed by tools that don't handle pnpm's structure well.
# Adjust hoisting strategy based on your project needs.
RUN pnpm install --frozen-lockfile # Or potentially: pnpm install --frozen-lockfile --shamefully-hoist

# The rest of the source code will be mounted via docker-compose,
# so we don't COPY . . here for the development stage.

# Expose ports your applications might use (adjust as needed)
EXPOSE 3000 3001 5000

# Default command - This will likely be overridden by docker-compose.yml
# Useful for running the container standalone or as a base for other commands.
# Using 'tail -f /dev/null' keeps the container running idly.
CMD ["tail", "-f", "/dev/null"]

# If you prefer the container to immediately start the dev process:
# CMD ["pnpm", "run", "dev"] # Or your specific turbo dev command
