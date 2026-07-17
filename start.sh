#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose --profile bluegreen)
ENGINE=docker
STATE_DIR=/var/lib/coze-js-api
ACTIVE_COLOR_FILE="$STATE_DIR/active-color"
NGINX_STATE_DIR=/etc/nginx/coze-js-api
ACTIVE_BACKEND_FILE="$NGINX_STATE_DIR/active-backend.conf"
LOCK_FILE=/var/lock/coze-js-api-deploy.lock
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-120}"
DRAIN_TIMEOUT_SECONDS="${DRAIN_TIMEOUT_SECONDS:-1800}"

mkdir -p "$STATE_DIR" "$NGINX_STATE_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "A coze-js-api deployment is already running." >&2
    exit 1
fi

cd "$ROOT_DIR"

read_active_color() {
    if [[ -f "$ACTIVE_COLOR_FILE" ]]; then
        tr -d '[:space:]' < "$ACTIVE_COLOR_FILE"
    else
        printf 'legacy'
    fi
}

backend_port_for() {
    case "$1" in
        legacy) printf '3000' ;;
        blue) printf '3003' ;;
        green) printf '3004' ;;
        *)
            echo "Unknown deployment color: $1" >&2
            return 1
            ;;
    esac
}

write_backend() {
    local color="$1"
    local port
    port="$(backend_port_for "$color")"
    local temp_file
    temp_file="$(mktemp "$NGINX_STATE_DIR/active-backend.conf.XXXXXX")"
    printf 'server 127.0.0.1:%s;\n' "$port" > "$temp_file"
    chmod 0644 "$temp_file"
    mv -f "$temp_file" "$ACTIVE_BACKEND_FILE"
}

current_color="$(read_active_color)"
case "$current_color" in
    legacy|blue|green) ;;
    *)
        echo "Invalid active-color value: $current_color" >&2
        exit 1
        ;;
esac

if [[ "$current_color" == "blue" ]]; then
    next_color=green
else
    next_color=blue
fi
next_service="app-$next_color"
next_port="$(backend_port_for "$next_color")"
switched=0

cleanup_failure() {
    local exit_code=$?
    if [[ "$switched" -eq 0 ]]; then
        echo "Deployment failed before traffic switched; stopping candidate $next_service." >&2
        "${COMPOSE[@]}" stop -t 20 "$next_service" >/dev/null 2>&1 || true
    fi
    exit "$exit_code"
}
trap cleanup_failure ERR

echo "Deploying candidate: $next_color (current: $current_color)"
git pull --ff-only
"${COMPOSE[@]}" build "$next_service"
"${COMPOSE[@]}" up -d --no-deps --wait "$next_service"

deadline=$((SECONDS + READINESS_TIMEOUT_SECONDS))
until curl --fail --silent --show-error "http://127.0.0.1:${next_port}/readyz" >/dev/null; do
    if (( SECONDS >= deadline )); then
        echo "Candidate $next_color did not become ready within ${READINESS_TIMEOUT_SECONDS}s." >&2
        exit 1
    fi
    sleep 2
done

# Validate the candidate's basic application response before changing public traffic.
curl --fail --silent --show-error "http://127.0.0.1:${next_port}/" >/dev/null

backup_file="$(mktemp "$NGINX_STATE_DIR/active-backend.backup.XXXXXX")"
cp "$ACTIVE_BACKEND_FILE" "$backup_file"
restore_nginx_backend() {
    cp "$backup_file" "$ACTIVE_BACKEND_FILE"
    nginx -t
    systemctl reload nginx
}

write_backend "$next_color"
if ! nginx -t; then
    restore_nginx_backend || true
    exit 1
fi
if ! systemctl reload nginx; then
    restore_nginx_backend || true
    exit 1
fi
rm -f "$backup_file"
printf '%s\n' "$next_color" > "$ACTIVE_COLOR_FILE"
switched=1
trap - ERR

echo "Traffic switched to $next_color. Scheduling background drain for: $current_color"
drain_log="$STATE_DIR/drain-${current_color}-$(date +%Y%m%d%H%M%S).log"
if [[ "$current_color" == "legacy" ]]; then
    legacy_container="$($ENGINE ps -aq \
        --filter label=com.docker.compose.project=coze-js-api \
        --filter label=com.docker.compose.service=app | head -n 1)"
    if [[ -n "$legacy_container" ]]; then
        # The legacy service used restart: always. Disable automatic restarts before
        # asking Docker to stop it, then let Docker enforce the drain timeout itself.
        "$ENGINE" update --restart=no "$legacy_container" >/dev/null
        nohup "$ENGINE" stop -t "$DRAIN_TIMEOUT_SECONDS" "$legacy_container" \
            >"$drain_log" 2>&1 < /dev/null &
    fi
else
    nohup docker compose --profile bluegreen stop -t "$DRAIN_TIMEOUT_SECONDS" "app-$current_color" \
        >"$drain_log" 2>&1 < /dev/null &
fi

echo "Blue/green deployment complete: active=$next_color; drain log=$drain_log"
