<div align="center">
  <img src="https://res.cloudinary.com/dbku02uef/image/upload/v1778705126/icon_2_ahiohi.png" alt="CodeKraken Icon" height="500" width="500" style="border-radius: 1rem;" />
</div>

# CodeKraken (Oliver)

Welcome to the **CodeKraken** (also known as Oliver) monorepo. This project is an AI-powered application designed to streamline development workflows, including PR generation, task management, and Jira integration.

## 🏗️ Project Structure

This project is built as a monorepo using [Turborepo](https://turbo.build/repo) and [pnpm](https://pnpm.io/).

- `apps/server`: The core backend and API services, connected to MongoDB.
- `apps/JiraForge`: The Atlassian Forge application frontend integrated directly within Jira.
- `apps/oliver-client`: The standalone client application.

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## 🐳 Docker Setup

The project provides a containerized development environment for the backend server and its dependencies (like MongoDB) using Docker Compose.

### Docker Architecture

- **MongoDB (`oliver-mongodb`)**: Runs MongoDB 7 on port `27018` (mapped to `27017` internally) with a persistent volume (`mongodb_data`).
- **Server (`oliver-server`)**: The backend server, running on port `9977`. It automatically mounts the local source code for live-reloading.

### Environment Variables

Before starting the Docker containers, ensure you have your `.env` and `.dockerenvfile` set up in the `apps/server` directory.

```bash
# Example: Create a copy of the sample environment file
cp apps/server/.env.sample apps/server/.dockerenvfile
```
*(Make sure to populate `apps/server/.dockerenvfile` with the necessary configurations).*

### Starting the Project with Docker

You can use the provided npm scripts from the root of the project to easily manage the Docker lifecycle.

#### 1. Start the Containers
To start the backend server and MongoDB:

```bash
pnpm start:docker
```
This script automatically runs `docker compose up` inside the `apps/server` directory. It brings up the database, waits for it to become healthy, and then starts the server.

#### 2. Start and Rebuild the Image
If you've added new dependencies, modified the `Dockerfile`, or need to ensure a clean slate, you should rebuild the Docker image before starting:

```bash
pnpm start:docker --rebuild
```

#### 3. Using Standard Docker Compose Commands
You can always navigate directly to the `apps/server` directory and use standard Docker Compose commands:

```bash
cd apps/server

# Start containers in detached mode
docker compose up -d

# Rebuild and start
docker compose up -d --build

# View server logs
docker compose logs -f server

# Stop containers
docker compose down

# Stop and remove volumes (Warning: wipes the local database!)
docker compose down -v
```

## 🛠️ Local Development (Without Docker)

If you prefer to run the applications locally without Docker (you will still need a running MongoDB instance):

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the Development Server:**
   This will run all applications in parallel using Turborepo.
   ```bash
   pnpm dev
   ```

3. **Start the Forge App:**
   To specifically run the Jira Forge application:
   ```bash
   pnpm start:forge
   ```

## 🧪 Testing

To run the Vitest test suite for the server:

```bash
pnpm test
```

## 🧹 Cleaning Up

To clean up all build artifacts and `node_modules` across the monorepo:

```bash
pnpm clean
```
