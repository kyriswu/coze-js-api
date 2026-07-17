#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_NAME="${PROJECT_NAME:-coze-js-api}"
RETENTION_SECONDS="${RETENTION_SECONDS:-86400}"
LOCK_FILE="${LOCK_FILE:-/var/lock/coze-js-api-deploy.lock}"
DOCKER_BIN="${DOCKER_BIN:-docker}"
NOW_EPOCH="${NOW_EPOCH:-$(date +%s)}"

if ! [[ "$RETENTION_SECONDS" =~ ^[0-9]+$ ]]; then
    echo "RETENTION_SECONDS must be a non-negative integer." >&2
    exit 2
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Deployment is in progress; skipping stopped-container cleanup."
    exit 0
fi

mapfile -t container_ids < <(
    "$DOCKER_BIN" ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}"
)

removed=0
for container_id in "${container_ids[@]}"; do
    [[ -n "$container_id" ]] || continue

    metadata="$("$DOCKER_BIN" inspect --format '{{.State.Status}}|{{.State.FinishedAt}}|{{index .Config.Labels "com.docker.compose.service"}}' "$container_id" 2>/dev/null || true)"
    IFS='|' read -r status finished_at service <<< "$metadata"

    case "$service" in
        app|app-blue|app-green) ;;
        *) continue ;;
    esac
    [[ "$status" == "exited" ]] || continue
    [[ -n "$finished_at" && "$finished_at" != "0001-01-01T00:00:00Z" ]] || continue

    finished_epoch="$(date -d "$finished_at" +%s 2>/dev/null || true)"
    [[ "$finished_epoch" =~ ^[0-9]+$ ]] || {
        echo "Skipping $container_id: cannot parse FinishedAt=$finished_at" >&2
        continue
    }

    age_seconds=$((NOW_EPOCH - finished_epoch))
    (( age_seconds >= RETENTION_SECONDS )) || continue

    if "$DOCKER_BIN" rm "$container_id" >/dev/null; then
        removed=$((removed + 1))
        echo "Removed expired stopped container: service=$service id=$container_id age_seconds=$age_seconds"
    else
        echo "Skipping $container_id: Docker refused removal (it may have restarted)." >&2
    fi
done

echo "Removed $removed expired stopped container(s)."
