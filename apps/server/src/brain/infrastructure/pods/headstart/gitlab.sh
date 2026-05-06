#!/usr/bin/env bash

# gitlab.sh
#
# Creates a GitLab Merge Request via the GitLab REST API v4.
#
# Required environment variables (exported by headstart.sh before calling create_pr.sh)
# - GIT_TOKEN          GitLab personal-access or project token
# - PR_TITLE           Title for the merge request
# - PR_BODY            Description (may be empty)
# - PR_BRANCH          Source branch
# - PR_DEFAULT_BRANCH  Target branch
# - PR_REPO_OWNER      Namespace (user or group)
# - PR_REPO_NAME       Project name

set -euo pipefail

log() {
	echo "[create_pr:gitlab] $*" >&2
}

: "${GIT_TOKEN:?GIT_TOKEN is required}"
: "${PR_TITLE:?PR_TITLE is required}"
: "${PR_BRANCH:?PR_BRANCH is required}"
: "${PR_DEFAULT_BRANCH:?PR_DEFAULT_BRANCH is required}"
: "${PR_REPO_OWNER:?PR_REPO_OWNER is required}"
: "${PR_REPO_NAME:?PR_REPO_NAME is required}"

url_encode() {
	node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' -- "$1"
}

project_id="$(url_encode "${PR_REPO_OWNER}/${PR_REPO_NAME}")"

payload="$(node -e '
	const title         = process.argv[1] || "Automated changes";
	const description   = process.argv[2] || "";
	const source_branch = process.argv[3];
	const target_branch = process.argv[4] || "main";
	process.stdout.write(JSON.stringify({ title, description, source_branch, target_branch }));
' -- "$PR_TITLE" "${PR_BODY:-}" "$PR_BRANCH" "$PR_DEFAULT_BRANCH")"

response="$(curl -s -w $'\n''%{http_code}' -X POST \
	-H "PRIVATE-TOKEN: ${GIT_TOKEN}" \
	-H "Content-Type: application/json" \
	"https://gitlab.com/api/v4/projects/${project_id}/merge_requests" \
	-d "$payload")"

http_code="${response##*$'\n'}"
body="${response%$'\n'*}"

if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
	mr_url="$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.web_url||'');}catch{}" -- "$body")"
	log "MR created: ${mr_url}"
else
	log "MR creation returned HTTP ${http_code}: ${body}"
fi
