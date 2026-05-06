#!/usr/bin/env bash

# create_pr.sh
#
# Dispatches pull-request / merge-request creation to the platform-specific
# implementation script.
#
# Required environment variables
# - SOURCE_PLATFORM   github | bitbucket | gitlab
#
# Variables consumed by the platform scripts (exported by headstart.sh)
# - GIT_TOKEN
# - PR_TITLE
# - PR_BODY
# - PR_BRANCH
# - PR_DEFAULT_BRANCH
# - PR_REPO_OWNER
# - PR_REPO_NAME

set -euo pipefail

log() {
	echo "[create_pr] $*" >&2
}

platform="${SOURCE_PLATFORM:-}"

if [[ -z "$platform" ]]; then
	log "SOURCE_PLATFORM is not set. Cannot create PR."
	exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
platform_script="${script_dir}/${platform}.sh"

if [[ ! -f "$platform_script" ]]; then
	log "No implementation script found for platform '${platform}' (looked for ${platform_script})."
	exit 1
fi

log "Delegating PR creation to ${platform_script}."
bash "$platform_script"
