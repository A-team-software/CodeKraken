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

build_remote_url() {
	local remote_url="$1"
	local git_user="$2"
	local git_pass="$3"
	local git_token="$4"
	local protocol
	local remote_without_scheme

	if [[ "$remote_url" =~ ^(https?)://(.+)$ ]]; then
		protocol="${BASH_REMATCH[1]}"
		remote_without_scheme="${BASH_REMATCH[2]}"

		if [[ -n "$git_token" ]]; then
			local enc_token
			enc_token="$(url_encode "$git_token")"
			printf "%s" "${protocol}://${enc_token}@${remote_without_scheme}"
			return 0
		fi

		if [[ -n "$git_user" && -n "$git_pass" ]]; then
			local enc_user
			local enc_pass
			enc_user="$(url_encode "$git_user")"
			enc_pass="$(url_encode "$git_pass")"
			printf "%s" "${protocol}://${enc_user}:${enc_pass}@${remote_without_scheme}"
			return 0
		fi
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

build_json_for_pr() {
	node -e "
		const title = process.argv[1] || 'Automated changes';
		const body  = process.argv[2] || '';
		const head  = process.argv[3];
		const base  = process.argv[4] || 'main';
		process.stdout.write(JSON.stringify({ title, body, head, base }));
	" -- "$1" "$2" "$3" "$4"
}

build_json_for_mr() {
	node -e "
		const title         = process.argv[1] || 'Automated changes';
		const description   = process.argv[2] || '';
		const source_branch = process.argv[3];
		const target_branch = process.argv[4] || 'main';
		process.stdout.write(JSON.stringify({ title, description, source_branch, target_branch }));
	" -- "$1" "$2" "$3" "$4"
}

build_json_for_bitbucket_pr() {
	node -e "
		const title = process.argv[1] || 'Automated changes';
		const desc  = process.argv[2] || '';
		const src   = process.argv[3];
		const dst   = process.argv[4] || 'main';
		process.stdout.write(JSON.stringify({
			title,
			description: desc,
			source:      { branch: { name: src } },
			destination: { branch: { name: dst } },
			close_source_branch: false
		}));
	" -- "$1" "$2" "$3" "$4"
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

	local platform
	platform="$(detect_git_platform "$remote_url")"

	local push_url
	push_url="$(build_push_url "$remote_url" "$platform" "$git_token")"
	if [[ -z "$push_url" ]]; then
		push_url="$clone_url"
	fi

	log "Pushing branch '${branch}' to remote."
	local push_output
	if ! push_output="$(git push "$push_url" "HEAD:refs/heads/${branch}" 2>&1)"; then
		echo "$push_output" >&2
		log "Push failed. Skipping PR creation."
		return 0
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

	log "Creating ${platform} PR: '${pr_title}' | ${branch} -> ${default_branch}"

	local payload response http_code body
	case "$platform" in
		github)
			payload="$(build_json_for_pr "$pr_title" "$pr_body" "$branch" "$default_branch")"
			response="$(curl -s -w $'\n''%{http_code}' -X POST \
				-H "Authorization: token ${git_token}" \
				-H "Accept: application/vnd.github.v3+json" \
				-H "Content-Type: application/json" \
				"https://api.github.com/repos/${owner}/${repo_name}/pulls" \
				-d "$payload")"
			http_code="${response##*$'\n'}"
			body="${response%$'\n'*}"
			if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
				local pr_url
				pr_url="$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.html_url||'');}catch{}" -- "$body")"
				log "GitHub PR created: ${pr_url}"
			else
				log "GitHub PR creation returned HTTP ${http_code}: ${body}"
			fi
			;;
		gitlab)
			local project_id
			project_id="$(url_encode "${owner}/${repo_name}")"
			payload="$(build_json_for_mr "$pr_title" "$pr_body" "$branch" "$default_branch")"
			response="$(curl -s -w $'\n''%{http_code}' -X POST \
				-H "PRIVATE-TOKEN: ${git_token}" \
				-H "Content-Type: application/json" \
				"https://gitlab.com/api/v4/projects/${project_id}/merge_requests" \
				-d "$payload")"
			http_code="${response##*$'\n'}"
			log "GitLab MR creation returned HTTP ${http_code}"
			;;
		bitbucket)
			payload="$(build_json_for_bitbucket_pr "$pr_title" "$pr_body" "$branch" "$default_branch")"
			response="$(curl -s -w $'\n''%{http_code}' -X POST \
				-H "Authorization: Bearer ${git_token}" \
				-H "Content-Type: application/json" \
				"https://api.bitbucket.org/2.0/repositories/${owner}/${repo_name}/pullrequests" \
				-d "$payload")"
			http_code="${response##*$'\n'}"
			log "Bitbucket PR creation returned HTTP ${http_code}"
			;;
	esac

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
	start_opencode "$mode" "$task" "$opencode_flags"
	log "OpenCode completed successfully. Running post-processing."
	post_opencode_success "$remote_repo" "$branch" "$clone_url" "$git_token" "$task_id" "$task_summary" "$task"
}

main "$@"
