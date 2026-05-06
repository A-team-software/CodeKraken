#!/usr/bin/env bash

# bitbucket.sh
#
# Creates a Bitbucket Pull Request via the Bitbucket REST API v2.0.
#
# Required environment variables (exported by headstart.sh before calling create_pr.sh)
# - GIT_TOKEN          Bitbucket access token (Bearer)
# - PR_TITLE           Title for the pull request
# - PR_BODY            Description (may be empty)
# - PR_BRANCH          Source branch
# - PR_DEFAULT_BRANCH  Destination branch
# - PR_REPO_OWNER      Workspace / owner slug
# - PR_REPO_NAME       Repository slug

set -euo pipefail

log() {
	echo "[create_pr:bitbucket] $*" >&2
}

: "${GIT_TOKEN:?GIT_TOKEN is required}"
: "${PR_TITLE:?PR_TITLE is required}"
: "${PR_BRANCH:?PR_BRANCH is required}"
: "${PR_DEFAULT_BRANCH:?PR_DEFAULT_BRANCH is required}"
: "${PR_REPO_OWNER:?PR_REPO_OWNER is required}"
: "${PR_REPO_NAME:?PR_REPO_NAME is required}"

payload="$(node -e '
	const title = process.argv[1] || "Automated changes";
	const desc  = process.argv[2] || "";
	const src   = process.argv[3];
	const dst   = process.argv[4] || "main";
	process.stdout.write(JSON.stringify({
		title,
		description: desc,
		source:      { branch: { name: src } },
		destination: { branch: { name: dst } },
		close_source_branch: false
	}));
' -- "$PR_TITLE" "${PR_BODY:-}" "$PR_BRANCH" "$PR_DEFAULT_BRANCH")"

response="$(curl -s -w $'\n''%{http_code}' -X POST \
	-H "Authorization: Bearer ${GIT_TOKEN}" \
	-H "Content-Type: application/json" \
	"https://api.bitbucket.org/2.0/repositories/${PR_REPO_OWNER}/${PR_REPO_NAME}/pullrequests" \
	-d "$payload")"

http_code="${response##*$'\n'}"
body="${response%$'\n'*}"

if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
	pr_url="$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.links&&r.links.html&&r.links.html.href||'');}catch{}" -- "$body")"
	log "PR created: ${pr_url}"
else
	log "PR creation returned HTTP ${http_code}: ${body}"
fi
