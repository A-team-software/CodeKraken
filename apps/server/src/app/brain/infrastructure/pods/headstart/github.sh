#!/usr/bin/env bash

# github.sh
#
# Creates a GitHub Pull Request via the GitHub REST API.
#
# Required environment variables (exported by headstart.sh before calling create_pr.sh)
# - GIT_TOKEN          GitHub personal-access or installation token
# - PR_TITLE           Title for the pull request
# - PR_BODY            Body / description (may be empty)
# - PR_BRANCH          Source (head) branch
# - PR_DEFAULT_BRANCH  Target (base) branch
# - PR_REPO_OWNER      Repository owner (user or org)
# - PR_REPO_NAME       Repository name

set -euo pipefail

log() {
	echo "[create_pr:github] $*" >&2
}

: "${GIT_TOKEN:?GIT_TOKEN is required}"
: "${PR_TITLE:?PR_TITLE is required}"
: "${PR_BRANCH:?PR_BRANCH is required}"
: "${PR_DEFAULT_BRANCH:?PR_DEFAULT_BRANCH is required}"
: "${PR_REPO_OWNER:?PR_REPO_OWNER is required}"
: "${PR_REPO_NAME:?PR_REPO_NAME is required}"

payload="$(node -e '
	const title = process.argv[1] || "Automated changes";
	const body  = process.argv[2] || "";
	const head  = process.argv[3];
	const base  = process.argv[4] || "main";
	process.stdout.write(JSON.stringify({ title, body, head, base }));
' -- "$PR_TITLE" "${PR_BODY:-}" "$PR_BRANCH" "$PR_DEFAULT_BRANCH")"

response="$(curl -s -w $'\n''%{http_code}' -X POST \
	-H "Authorization: token ${GIT_TOKEN}" \
	-H "Accept: application/vnd.github.v3+json" \
	-H "Content-Type: application/json" \
	"https://api.github.com/repos/${PR_REPO_OWNER}/${PR_REPO_NAME}/pulls" \
	-d "$payload")"

http_code="${response##*$'\n'}"
body="${response%$'\n'*}"

if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
	pr_id="$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.number||'');}catch{}" -- "$body")"
	pr_url="$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.html_url||'');}catch{}" -- "$body")"
	log "PR created: ${pr_url} (id=${pr_id:-unknown})"
	if [[ -n "$pr_id" ]]; then
		echo "$pr_id"
	fi
else
	log "PR creation returned HTTP ${http_code}: ${body}"
fi
