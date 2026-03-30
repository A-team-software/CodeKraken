FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

RUN apk add --no-cache curl unzip ca-certificates bash




# COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yam* ./
# Install project dependencies using pnpm (as before)
RUN pnpm install --frozen-lockfile


# Expose ports your applications might use
EXPOSE 3002  5001

# Default command to keep container running idly
CMD ["tail", "-f", "/dev/null"]
