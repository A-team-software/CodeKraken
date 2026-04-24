#!/usr/bin/env bash

# headstart.sh
#
# Purpose
# - Container entrypoint for the OpenCode pod image.
# - Prepares a fresh workspace from a remote Git repository and launches
#   OpenCode in non-interactive mode.
#
# What this script does
# 1. Reads runtime configuration from environment variables.
# 2. Clones the target remote repository into /workspace/repo (or custom dir).
# 3. Checks out an existing local/remote branch, or creates the branch if it
#    does not exist.
# 4. Optionally checks out a target commit when provided.
# 5. Exports provider API key environment variables and starts OpenCode with the
#    correct agent mode (plan/build) and prompt.
#
# Required environment variables
# - REPO_URL (or REMOTE_REPOSITORY/GIT_REMOTE_URL/REPOSITORY_URL)
# - TASK (or PROMPT/INSTRUCTION/OPENCODE_TASK)
#
# Common optional environment variables
# - BRANCH/TARGET_BRANCH/GIT_BRANCH
# - COMMIT_HASH/GIT_COMMIT/COMMIT
# - JOB_MODE/MODE/OPENCODE_MODE     (plan -> plan agent, default -> build)
# - AI_PROVIDER + AI_API_KEY         (maps to provider-specific API key vars)
# - GIT_TOKEN or GIT_USERNAME + GIT_PASSWORD (for HTTPS remote auth)
# - WORKSPACE_DIR/POD_WORKDIR
# - OPENCODE_FLAGS
# - OPENCODE_COMMAND                 (full command override)
#
# Notes
# - The repository checkout is intentionally clean each run.
# - If COMMIT_HASH is unknown after fetch, the script continues without
#   changing HEAD.

set -euo pipefail

log() {
	echo "[headstart] $*"
}

first_non_empty() {
	for key in "$@"; do
		if [[ -n "${!key:-}" ]]; then
			printf "%s" "${!key}"
			return 0
		fi
	done
	return 1
}

require_var() {
	local name="$1"
	local value="$2"
	if [[ -z "$value" ]]; then
		log "Missing required value: ${name}"
		exit 1
	fi
}

url_encode() {
	node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

build_git_auth_header() {
	local git_user="$1"
	local git_pass="$2"
	local git_token="$3"

	if [[ -n "$git_token" ]]; then
		printf "Authorization: Basic %s" "$(printf "x-access-token:%s" "$git_token" | base64 | tr -d '\n')"
		return 0
	fi

	if [[ -n "$git_user" && -n "$git_pass" ]]; then
		printf "Authorization: Basic %s" "$(printf "%s:%s" "$git_user" "$git_pass" | base64 | tr -d '\n')"
		return 0
	fi

	return 1
}

configure_git_auth() {
	local git_user="$1"
	local git_pass="$2"
	local git_token="$3"
	local auth_header
	local git_config_count

	if ! auth_header="$(build_git_auth_header "$git_user" "$git_pass" "$git_token")"; then
		return 0
	fi

	git_config_count="${GIT_CONFIG_COUNT:-0}"
	export GIT_CONFIG_COUNT=$((git_config_count + 1))
	export GIT_CONFIG_KEY_"${git_config_count}"="http.extraHeader"
	export GIT_CONFIG_VALUE_"${git_config_count}"="${auth_header}"
}

build_remote_url() {
	local remote_url="$1"
	local git_user="$2"
	local git_pass="$3"
	local git_token="$4"

	if [[ "$remote_url" =~ ^https?://.+$ ]]; then
		configure_git_auth "$git_user" "$git_pass" "$git_token"
	fi

	printf "%s" "$remote_url"
}

ensure_branch() {
	local branch="$1"

	if git show-ref --verify --quiet "refs/heads/${branch}"; then
		log "Switching to existing local branch: ${branch}"
		git switch "$branch"
		return 0
	fi

	if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
		log "Tracking existing remote branch: ${branch}"
		git fetch origin "refs/heads/${branch}:refs/remotes/origin/${branch}"
		git switch --track -c "$branch" "origin/${branch}"
		return 0
	fi

	log "Branch does not exist remotely/locally. Creating branch: ${branch}"
	git switch -c "$branch"
}

apply_commit_if_present() {
	local commit_hash="$1"
	if [[ -z "$commit_hash" ]]; then
		return 0
	fi

	if git cat-file -e "${commit_hash}^{commit}" >/dev/null 2>&1; then
		log "Checking out existing commit: ${commit_hash}"
		git checkout "$commit_hash"
		return 0
	fi

	log "Commit not found locally. Fetching remotes to try resolving commit: ${commit_hash}"
	git fetch --all --tags --prune >/dev/null 2>&1 || true

	if git cat-file -e "${commit_hash}^{commit}" >/dev/null 2>&1; then
		log "Checking out fetched commit: ${commit_hash}"
		git checkout "$commit_hash"
		return 0
	fi

	log "Commit not found after fetch: ${commit_hash}. Continuing without checkout."
}

configure_ai_env() {
	local provider="$1"
	local api_key="$2"

	if [[ -z "$provider" || -z "$api_key" ]]; then
		return 0
	fi

	case "$provider" in
		openai) export OPENAI_API_KEY="$api_key" ;;
		groq) export GROQ_API_KEY="$api_key" ;;
		anthropic) export ANTHROPIC_API_KEY="$api_key" ;;
		openrouter) export OPENROUTER_API_KEY="$api_key" ;;
		xai) export XAI_API_KEY="$api_key" ;;
		ollama) export OLLAMA_API_KEY="$api_key" ;;
		*)
			# Unknown providers can still work via OPENCODE_CONFIG_CONTENT/OPENCODE_CONFIG.
			export AI_API_KEY="$api_key"
			;;
	esac
}

start_opencode() {
	local mode="$1"
	local task="$2"
	local extra_flags="$3"

	local agent="build"
	if [[ "$mode" == "plan" ]]; then
		agent="plan"
	fi

	if [[ -n "${OPENCODE_COMMAND:-}" ]]; then
		log "Starting OpenCode using OPENCODE_COMMAND override."
		exec bash -lc "$OPENCODE_COMMAND"
	fi

	require_var "TASK/PROMPT" "$task"
	log "Starting OpenCode with agent mode: ${agent}"

	if [[ -n "$extra_flags" ]]; then
		local -a extra_flags_array
		read -r -a extra_flags_array <<< "$extra_flags"
		exec opencode run --format json --agent "$agent" "${extra_flags_array[@]}" "$task"
	fi

	exec opencode run --format json --agent "$agent" "$task"
}

main() {
	local remote_repo
	local branch
	local mode
	local task
	local ai_provider
	local ai_api_key
	local git_username
	local git_password
	local git_token
	local commit_hash
	local workspace_root
	local repo_dir
	local opencode_flags

	remote_repo="$(first_non_empty REPO_URL REMOTE_REPOSITORY GIT_REMOTE_URL REPOSITORY_URL || true)"
	branch="$(first_non_empty BRANCH TARGET_BRANCH GIT_BRANCH || true)"
	mode="$(first_non_empty JOB_MODE MODE OPENCODE_MODE || true)"
	task="$(first_non_empty TASK PROMPT INSTRUCTION OPENCODE_TASK || true)"
	ai_provider="$(first_non_empty AI_PROVIDER OPENCODE_AI_PROVIDER || true)"
	ai_api_key="$(first_non_empty AI_API_KEY OPENCODE_AI_API_KEY LLM_API_KEY || true)"
	git_username="$(first_non_empty GIT_USERNAME GIT_USER || true)"
	git_password="$(first_non_empty GIT_PASSWORD GIT_PASS || true)"
	git_token="$(first_non_empty GIT_TOKEN GITHUB_TOKEN GIT_ACCESS_TOKEN || true)"
	commit_hash="$(first_non_empty COMMIT_HASH GIT_COMMIT COMMIT || true)"
	workspace_root="$(first_non_empty WORKSPACE_DIR POD_WORKDIR || true)"
	opencode_flags="$(first_non_empty OPENCODE_FLAGS || true)"

	if [[ -z "$mode" ]]; then
		mode="agent"
	fi

	if [[ -z "$workspace_root" ]]; then
		workspace_root="/workspace"
	fi

	require_var "REPO_URL/REMOTE_REPOSITORY" "$remote_repo"

	log "Parsed env: mode=${mode}, provider=${ai_provider:-unset}, branch=${branch:-unset}, commit=${commit_hash:-unset}"
	configure_ai_env "$ai_provider" "$ai_api_key"

	if [[ ! "$remote_repo" =~ ^[a-zA-Z][a-zA-Z0-9+.-]*:// && ! "$remote_repo" =~ ^git@ ]]; then
		# Local mounts can appear with different UID/GID ownership in the container.
		git config --global --add safe.directory "$remote_repo" || true
		git config --global --add safe.directory "${remote_repo}/.git" || true
	fi

	mkdir -p "$workspace_root"
	repo_dir="${workspace_root}/repo"
	rm -rf "$repo_dir"

	local clone_url
	clone_url="$(build_remote_url "$remote_repo" "$git_username" "$git_password" "$git_token")"

	log "Cloning repository into ${repo_dir}"
	git clone "$clone_url" "$repo_dir"

	cd "$repo_dir"

	if [[ -n "$branch" ]]; then
		ensure_branch "$branch"
	fi

	apply_commit_if_present "$commit_hash"
	start_opencode "$mode" "$task" "$opencode_flags"
}

main "$@"
