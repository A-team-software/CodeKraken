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
# 2. Clones the target remote repository into /workspace/app (or custom dir).
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
	echo "[headstart] $*" >&2
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
	node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' -- "$1"
}

redact_sensitive_output() {
	local output="$1"
	local token="$2"

	if [[ -z "$token" ]]; then
		printf "%s" "$output"
		return 0
	fi

	node -e '
		const output = process.argv[1] || "";
		const token = process.argv[2] || "";
		const encodedToken = encodeURIComponent(token);
		let redacted = output;
		redacted = redacted.split(token).join("[REDACTED]");
		if (encodedToken && encodedToken !== token) {
			redacted = redacted.split(encodedToken).join("[REDACTED]");
		}
		process.stdout.write(redacted);
	' -- "$output" "$token"
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

build_push_url() {
	local remote_url="$1"
	local platform="$2"
	local git_token="$3"

	if [[ -z "$git_token" ]]; then
		printf "%s" "$remote_url"
		return 0
	fi

	if [[ ! "$remote_url" =~ ^https?:// ]]; then
		printf "%s" "$remote_url"
		return 0
	fi

	local auth_user
	case "$platform" in
		github) auth_user="x-access-token" ;;
		gitlab) auth_user="oauth2" ;;
		bitbucket) auth_user="x-token-auth" ;;
		*) auth_user="token" ;;
	esac

	build_remote_url "$remote_url" "$auth_user" "$git_token" ""
}

is_network_git_remote() {
	local remote_url="$1"
	[[ "$remote_url" =~ ^https?:// ]] || [[ "$remote_url" =~ ^git@ ]]
}

has_embedded_http_credentials() {
	local remote_url="$1"
	[[ "$remote_url" =~ ^https?://[^/@]+@ ]]
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

ensure_pr_md_ignored() {
	local exclude_file=".git/info/exclude"
	mkdir -p "$(dirname "$exclude_file")"

	if [[ -f "$exclude_file" ]]; then
		if ! grep -qxF "PR.md" "$exclude_file"; then
			echo "PR.md" >> "$exclude_file"
		fi
	else
		echo "PR.md" > "$exclude_file"
	fi

	log "Ensured PR.md is git-ignored via .git/info/exclude."
}

detect_git_platform() {
	local remote_url="$1"
	if [[ "$remote_url" =~ github\.com ]]; then
		echo "github"
	elif [[ "$remote_url" =~ gitlab\.com ]]; then
		echo "gitlab"
	elif [[ "$remote_url" =~ bitbucket\.org ]]; then
		echo "bitbucket"
	else
		echo ""
	fi
}

parse_owner_repo() {
	local remote_url="$1"
	local path_part
	if [[ "$remote_url" =~ ^https?://[^/]+/(.+)$ ]]; then
		path_part="${BASH_REMATCH[1]}"
	elif [[ "$remote_url" =~ ^git@[^:]+:(.+)$ ]]; then
		path_part="${BASH_REMATCH[1]}"
	else
		return 1
	fi
	path_part="${path_part%.git}"
	echo "${path_part%%/*} ${path_part#*/}"
}

build_json_for_job_update() {
	node -e '
		const resultSuccess = process.argv[1] === "true";
		const resultMessage = process.argv[2] || "OpenCode execution completed.";
		const prId = process.argv[3] || "";
		const plan = process.argv[4] || "";
		const jobId = process.argv[5] || "";
		const todoItemId = process.argv[6] || "";

		const payload = {
			result: {
				success: resultSuccess,
				message: resultMessage
			},
			...(jobId ? { jobId } : {})
		};

		if (prId) {
			payload.prId = prId;
		}

		if (plan) {
			payload.plan = plan;
		}

		if (todoItemId) {
			payload.todoItemId = todoItemId;
		}

		process.stdout.write(JSON.stringify(payload));
	' -- "$1" "$2" "$3" "$4" "$5" "$6"
}

find_latest_plan_file() {
	node -e '
		const fs = require("fs");
		const path = require("path");
		const root = process.argv[1] || ".plans";

		function walk(dir, files) {
			let entries = [];
			try {
				entries = fs.readdirSync(dir, { withFileTypes: true });
			} catch {
				return;
			}

			for (const entry of entries) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full, files);
					continue;
				}

				if (!entry.isFile()) {
					continue;
				}

				try {
					const stat = fs.statSync(full);
					files.push({ full, mtimeMs: stat.mtimeMs });
				} catch {
					// Ignore unreadable files.
				}
			}
		}

		const files = [];
		walk(root, files);
		if (files.length === 0) {
			process.exit(0);
		}

		files.sort((a, b) => b.mtimeMs - a.mtimeMs);
		process.stdout.write(files[0].full);
	' -- ".plans"
}

post_job_update_to_api_server() {
	local api_server_url="$1"
	local job_id="$2"
	local api_key="$3"
	local pr_id="$4"
	local execution_success="$5"
	local execution_message="$6"
	local max_attempts=10

	if [[ -z "$api_server_url" ]]; then
		log "API_SERVER_URL is not set. Skipping job update upload."
		return 0
	fi

	if [[ -z "$job_id" ]]; then
		log "JOB_ID/TASK_ID is not set. Skipping job update upload."
		return 0
	fi

	local plan_file plan_content
	plan_content=""
	plan_file="$(find_latest_plan_file || true)"
	if [[ -n "$plan_file" && -f "$plan_file" ]]; then
		plan_content="$(cat "$plan_file")"
	fi

	local todo_item_id
	todo_item_id="$(first_non_empty TODO_ITEM_ID TASK_TODO_ITEM_ID || true)"
	if [[ -z "$todo_item_id" && -n "$plan_content" ]]; then
		todo_item_id="plan"
	fi

	local payload endpoint response http_code body
	payload="$(build_json_for_job_update "$execution_success" "$execution_message" "$pr_id" "$plan_content" "$job_id" "$todo_item_id")"
	endpoint="${api_server_url%/}/task?jobId=$(url_encode "$job_id")"

	if [[ -n "$plan_file" ]]; then
		log "Uploading job update with plan from '${plan_file}' to ${endpoint}."
	else
		log "Uploading job update to ${endpoint}."
	fi

	local attempt=1
	while ((attempt <= max_attempts)); do
		local curl_exit=0

		if [[ -n "$api_key" ]]; then
			response="$(curl -sS --connect-timeout 10 --max-time 30 -w $'\n''%{http_code}' -X PATCH \
				-u ":${api_key}" \
				-H "Content-Type: application/json" \
				"$endpoint" \
				-d "$payload")" || curl_exit=$?
		else
			response="$(curl -sS --connect-timeout 10 --max-time 30 -w $'\n''%{http_code}' -X PATCH \
				-H "Content-Type: application/json" \
				"$endpoint" \
				-d "$payload")" || curl_exit=$?
		fi

		if [[ "$curl_exit" -eq 0 ]]; then
			http_code="${response##*$'\n'}"
			body="${response%$'\n'*}"

			if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
				log "Job update uploaded successfully for job '${job_id}' (attempt ${attempt}/${max_attempts})."
				return 0
			fi

			# Do not retry HTTP responses; only transport-level failures are retried.
			log "Job update upload returned HTTP ${http_code}: ${body}"
			return 0
		fi

		# Retry only for timeout/network transport failures.
		if [[ "$curl_exit" -eq 7 || "$curl_exit" -eq 28 ]]; then
			if ((attempt < max_attempts)); then
				log "Job update upload transport failure (curl exit ${curl_exit}) on attempt ${attempt}/${max_attempts}; retrying."
				attempt=$((attempt + 1))
				continue
			fi
			log "Job update upload transport failure (curl exit ${curl_exit}) after ${max_attempts} attempts."
			return 0
		fi

		log "Failed to upload job update to API server (curl exit ${curl_exit}); not retryable."
		return 0
	done
}

sanitize_branch_component() {
	local input="$1"
	local allow_slash="$2"
	local pattern='[^a-zA-Z0-9._-]'
	if [[ "$allow_slash" == "1" ]]; then
		pattern='[^a-zA-Z0-9._/-]'
	fi

	printf "%s" "$input" \
		| tr '[:upper:]' '[:lower:]' \
		| sed -E "s/[[:space:]]+/-/g" \
		| sed -E "s/${pattern}/-/g" \
		| sed -E 's/-+/-/g; s#/+/#/#g; s#^[-./]+##; s#[-./]+$##'
}

extract_summary_from_task_prompt() {
	local task_prompt="$1"
	local max_len=100
	if [[ -z "$task_prompt" ]]; then
		printf ""
		return 0
	fi

	printf "%s" "$task_prompt" \
		| head -n 1 \
		| sed -E 's/^\[[^]]+\][[:space:]]*/' \
		| head -c "$max_len"
}

derive_fallback_branch_name() {
	local task_id="$1"
	local task_summary="$2"
	local task_prompt="$3"
	local max_branch_len=255

	local summary_source="$task_summary"
	if [[ -z "$summary_source" ]]; then
		summary_source="$(extract_summary_from_task_prompt "$task_prompt")"
	fi

	local ticket_source="$task_id"
	if [[ -z "$ticket_source" ]]; then
		ticket_source="$(printf "%s" "$summary_source" | grep -oE '^[A-Za-z]+-[0-9]+' || true)"
	fi

	local ticket_slug summary_slug branch_name
	ticket_slug="$(sanitize_branch_component "$ticket_source" 0)"
	summary_slug="$(sanitize_branch_component "$summary_source" 0)"

	if [[ -z "$summary_slug" ]]; then
		summary_slug="task-update"
	fi

	branch_name="$summary_slug"
	if [[ -n "$ticket_slug" ]]; then
		branch_name="${ticket_slug}-${summary_slug}"
	fi

	branch_name="${branch_name:0:${max_branch_len}}"
	branch_name="$(printf "%s" "$branch_name" | sed -E 's#[-./]+$##')"

	if [[ -z "$branch_name" ]]; then
		branch_name="task-update"
	fi

	printf "%s" "$branch_name"
}

resolve_push_branch() {
	local explicit_branch="$1"
	local task_id="$2"
	local task_summary="$3"
	local task_prompt="$4"
	local resolved_branch=""

	if [[ -n "$explicit_branch" ]]; then
		printf "%s" "$explicit_branch"
		return 0
	fi

	local current_branch
	current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
	if [[ -n "$current_branch" && "$current_branch" != "HEAD" && "$current_branch" != "main" && "$current_branch" != "master" ]]; then
		printf "%s" "$current_branch"
		return 0
	fi

	resolved_branch="$(derive_fallback_branch_name "$task_id" "$task_summary" "$task_prompt")"
	if [[ -z "$resolved_branch" ]]; then
		resolved_branch="task-update"
	fi

	echo "[headstart] No branch detected after OpenCode run. Creating fallback branch '${resolved_branch}'." >&2
	ensure_branch "$resolved_branch"
	printf "%s" "$resolved_branch"
}

post_opencode_success() {
	local remote_url="$1"
	local branch="$2"
	local clone_url="$3"
	local git_token="$4"
	local task_id="$5"
	local task_summary="$6"
	local task_prompt="$7"

	branch="$(resolve_push_branch "$branch" "$task_id" "$task_summary" "$task_prompt")"

	if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
		log "No branch detected. Skipping push and PR creation."
		return 0
	fi

	if ! is_network_git_remote "$remote_url"; then
		log "Remote '${remote_url}' is not a network git URL. Skipping push and PR creation."
		return 0
	fi

	local platform
	platform="$(detect_git_platform "$remote_url")"

	if [[ -z "$git_token" && ! "$remote_url" =~ ^git@ ]] && ! has_embedded_http_credentials "$clone_url"; then
		log "No git credentials available for remote push. Skipping push and PR creation."
		return 0
	fi

	local push_url
	push_url="$(build_push_url "$remote_url" "$platform" "$git_token")"
	if has_embedded_http_credentials "$clone_url"; then
		push_url="$clone_url"
	fi
	if [[ -z "$push_url" ]]; then
		push_url="$clone_url"
	fi

	log "Pushing branch '${branch}' to remote."
	local push_output
	if ! push_output="$(git push "$push_url" "HEAD:refs/heads/${branch}" 2>&1)"; then
		local redacted_push_output
		redacted_push_output="$(redact_sensitive_output "$push_output" "$git_token")"
		echo "$redacted_push_output" >&2
		log "Push failed. Skipping PR creation."
		return 1
	fi

	if [[ ! -f "PR.md" ]]; then
		log "PR.md not found. Skipping PR creation."
		return 0
	fi

	if [[ -z "$platform" ]]; then
		log "Could not detect git platform from '${remote_url}'. Branch pushed; skipping PR creation."
		return 0
	fi

	if [[ -z "$git_token" ]]; then
		log "No git token available. Branch pushed; skipping PR creation."
		return 0
	fi

	local pr_title pr_body
	pr_title="$(head -1 PR.md)"
	pr_body="$(tail -n +3 PR.md 2>/dev/null || true)"

	local owner_repo owner repo_name
	owner_repo="$(parse_owner_repo "$remote_url")" || {
		log "Could not parse owner/repo from '${remote_url}'. Skipping PR creation."
		return 0
	}
	owner="${owner_repo%% *}"
	repo_name="${owner_repo##* }"

	local default_branch
	default_branch="$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}' || true)"
	if [[ -z "$default_branch" ]]; then
		default_branch="main"
	fi

	log "Creating PR: '${pr_title}' | ${branch} -> ${default_branch}"

	local headstart_dir
	headstart_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

	if [[ -z "${SOURCE_PLATFORM:-}" ]]; then
		SOURCE_PLATFORM="$platform"
	fi

	export SOURCE_PLATFORM
	export GIT_TOKEN="$git_token"
	export PR_TITLE="$pr_title"
	export PR_BODY="$pr_body"
	export PR_BRANCH="$branch"
	export PR_DEFAULT_BRANCH="$default_branch"
	export PR_REPO_OWNER="$owner"
	export PR_REPO_NAME="$repo_name"

	local pr_id
	pr_id="$(bash "${headstart_dir}/create_pr.sh" || true)"
	pr_id="$(printf "%s" "$pr_id" | tr -d '\r\n' | xargs)"

	if [[ -n "$pr_id" ]]; then
		log "Created PR with id '${pr_id}'."
	fi

	printf "%s" "$pr_id"
	return 0
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
		bash -lc "$OPENCODE_COMMAND"
		return
	fi

	require_var "TASK/PROMPT" "$task"
	log "Starting OpenCode with agent mode: ${agent}"

	if [[ -n "$extra_flags" ]]; then
		local -a extra_flags_array
		read -r -a extra_flags_array <<< "$extra_flags"
		opencode run --format json --agent "$agent" "${extra_flags_array[@]}" "$task"
		return
	fi

	opencode run --format json --agent "$agent" "$task"
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
	local task_id
	local task_summary
	task_id="$(first_non_empty TASK_ID || true)"
	task_summary="$(first_non_empty TASK_SUMMARY || true)"
	local job_id
	local api_server_url
	local api_key
	job_id="$(first_non_empty JOB_ID TASK_ID || true)"
	api_server_url="$(first_non_empty API_SERVER_URL OPENCODE_API_SERVER_URL || true)"
	api_key="$(first_non_empty API_KEY OPENCODE_TASK_API_TOKEN TASK_API_TOKEN || true)"

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
	repo_dir="${workspace_root}/app"
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
	ensure_pr_md_ignored
	local execution_success execution_message
	execution_success="false"
	execution_message="OpenCode execution failed."
	if start_opencode "$mode" "$task" "$opencode_flags"; then
		execution_success="true"
		execution_message="OpenCode execution completed successfully."
	fi

	local pr_id
	pr_id=""
	if [[ "$execution_success" == "true" && "$mode" != "plan" ]]; then
		pr_id="$(post_opencode_success "$remote_repo" "$branch" "$clone_url" "$git_token" "$task_id" "$task_summary" "$task")"
	fi

	post_job_update_to_api_server "$api_server_url" "$job_id" "$api_key" "$pr_id" "$execution_success" "$execution_message"

	if [[ "$execution_success" != "true" ]]; then
		log "OpenCode execution failed."
		return 1
	fi

	log "OpenCode completed successfully. Running post-processing."
}

main "$@"
