# Docker commands

**3. Rebuild the Image**

You **must** rebuild the Docker image to include these changes:

```bash
# Clean build cache is recommended when adding fundamental tools
docker-compose build --no-cache app

# Or without cache cleaning (might be faster if only minor changes)
# docker-compose build app

```

*(Use `docker compose` instead of `docker-compose` if using Compose V2)*

**4. Restart the Container**

```bash
# Stop the potentially running old container
docker-compose down

# Start the container using the newly built image
docker-compose up -d

```

**5. How to Use It**

Now, inside the *same* running `app` container, you can execute **both** pnpm and bun commands:

- **Run the Turborepo dev command (using pnpm):**
    
    ```bash
    docker-compose exec app pnpm turbo run dev --parallel
    
    ```
    
    - This will work as before. Turborepo will run the `dev` script defined in each package's `package.json`.
    - Your `apps/client/package.json` `dev` script (`next dev ...`) will run using Node.
    - Your `apps/api/package.json` `dev` script (`bun run --watch src/index.ts`) will now **successfully execute** because the `bun` command is available in the container.
- **Run Bun commands directly:**
    
    ```bash
    docker-compose exec app bun --version
    docker-compose exec app bun run apps/api/src/some-script.ts
    docker-compose exec app bun test
    
    ```
    
- **Run pnpm commands directly:**
    
    ```bash
    docker-compose exec app pnpm --version
    docker-compose exec app pnpm install --filter api
    docker-compose exec app pnpm list
    
    ```
    
- **Install deps using pnpm through docker:**
    
    ```bash
    docker-compose exec app pnpm install --frozen-lockfile
    
    ```
    
- **Install deps in `/apps`  via docker:**
    
    ```bash
    docker-compose exec app pnpm add --filter client '@oliver/utils@workspace:*'
    ```
    

**Advantages of Option 1:**

- **Single Container:** Simpler Docker Compose setup, only one service to manage for your application code.
- **Flexibility:** Allows mixing and matching tools within the same environment if needed (though sticking to one per package is cleaner).

**Disadvantages of Option 1:**

- **Larger Image:** The Docker image includes both Node/npm/pnpm *and* the Bun runtime, making it larger than an image with just one.
- **Less Isolation:** Both runtimes are present; slightly less strict isolation compared to separate containers per runtime.

This approach directly addresses your need to run the Bun-based `dev` script for the API within the container environment you already set up for pnpm.
