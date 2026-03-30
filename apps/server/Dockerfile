FROM node:20-slim

RUN apt-get update && apt-get install -y \
    git \
    bash \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install OpenCode properly
RUN curl -fsSL https://opencode.ai/install | bash

# Ensure binary is available
ENV PATH="/root/.opencode/bin:$PATH"

CMD ["sh"]
