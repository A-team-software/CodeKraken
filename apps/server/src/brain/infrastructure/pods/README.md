# Pods Infrastructure

This folder contains the container image and entrypoint used to run OpenCode in a pod-style execution environment.

## Files

- `Dockerfile.opencode`: builds the runtime image with Git, Node.js, and OpenCode installed.
- `headstart.sh`: container entrypoint script that prepares the repository and starts OpenCode.

## How Pod Startup Works

At runtime, the container starts `headstart.sh` as the `ENTRYPOINT`.

The script lifecycle is:

1. Parse environment variables provided by the runner/orchestrator.
2. Resolve Git credentials and remote URL.
3. Clone the remote repository into the pod workspace.
4. Checkout branch behavior:
   - Switch to local branch if present.
   - Track remote branch if present only on origin.
   - Create branch if missing in both local and remote.
5. Optionally checkout a commit hash if provided and resolvable.
6. Map AI provider and API key variables to provider-specific env vars.
7. Start `opencode run --format json` with the proper agent mode.

## Environment Variables

The script accepts aliases for compatibility with different callers.

### Repository (required)

- Primary: `REPO_URL`
- Aliases: `REMOTE_REPOSITORY`, `GIT_REMOTE_URL`, `REPOSITORY_URL`

### Prompt/Task (required unless `OPENCODE_COMMAND` is set)

- Primary: `TASK`
- Aliases: `PROMPT`, `INSTRUCTION`, `OPENCODE_TASK`

### Mode

- Primary: `JOB_MODE`
- Aliases: `MODE`, `OPENCODE_MODE`
- Values:
  - `plan` -> `--agent plan`
  - anything else -> `--agent build`

### Branch and Commit

- Branch: `BRANCH` (aliases: `TARGET_BRANCH`, `GIT_BRANCH`)
- Commit: `COMMIT_HASH` (aliases: `GIT_COMMIT`, `COMMIT`)

### Git Authentication

- Token auth: `GIT_TOKEN` (aliases: `GITHUB_TOKEN`, `GIT_ACCESS_TOKEN`)
- Username/password auth: `GIT_USERNAME` + `GIT_PASSWORD` (aliases: `GIT_USER`, `GIT_PASS`)

### AI Provider/Auth

- Provider: `AI_PROVIDER` (alias: `OPENCODE_AI_PROVIDER`)
- API key: `AI_API_KEY` (aliases: `OPENCODE_AI_API_KEY`, `LLM_API_KEY`)

### Workspace and OpenCode Options

- Workspace root: `WORKSPACE_DIR` (alias: `POD_WORKDIR`, default `/workspace`)
- Extra run flags: `OPENCODE_FLAGS`
- Full command override: `OPENCODE_COMMAND`

## Docker Image Behavior

`Dockerfile.opencode` currently:

1. Uses `node:20-slim` as base image.
2. Installs `bash`, `ca-certificates`, `curl`, and `git`.
3. Installs OpenCode via the official install script.
4. Verifies binaries at build time:
   - `git --version`
   - `node -v`
   - `opencode -v`
5. Sets `headstart.sh` as image entrypoint.

## Example Runtime Invocation

```bash
docker run --rm \
  -e REPO_URL="https://github.com/example/repo.git" \
  -e BRANCH="feature/agent-change" \
  -e JOB_MODE="agent" \
  -e TASK="Implement the requested change and run tests" \
  -e AI_PROVIDER="openai" \
  -e AI_API_KEY="$OPENAI_API_KEY" \
  <your-opencode-image>
```

For token-authenticated clone:

```bash
docker run --rm \
  -e REPO_URL="https://github.com/example/private-repo.git" \
  -e GIT_TOKEN="$GITHUB_TOKEN" \
  -e TASK="Plan and implement a small refactor" \
  <your-opencode-image>
```