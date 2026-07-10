#!/usr/bin/env bash
set -euo pipefail

git pull --ff-only

if command -v podman >/dev/null 2>&1; then
	ENGINE="podman"
else
	ENGINE="docker"
fi

compose() {
	"$ENGINE" compose "$@"
}

# Build new app image first, then recreate only the app service to reduce interruption.
compose build app
compose up -d --force-recreate --no-deps app

# Clean dangling layers generated during rebuilds.
"$ENGINE" image prune -f >/dev/null 2>&1 || true
