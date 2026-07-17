#!/usr/bin/env bash
set -euo pipefail

# Online copy from the project Redis to DB 1 on lite-chat-redis.
# MIGRATE COPY preserves source keys and their TTLs. Writes during the scan are
# intentionally not replayed; that loss window is accepted for this migration.
SOURCE_CONTAINER="${SOURCE_CONTAINER:-coze-js-api-my-redis-1}"
TARGET_HOST="${TARGET_HOST:-lite-chat-redis}"
TARGET_PORT="${TARGET_PORT:-6379}"
TARGET_DB="${TARGET_DB:-1}"
TIMEOUT_MS="${TIMEOUT_MS:-5000}"

docker exec \
  -e "TARGET_HOST=$TARGET_HOST" \
  -e "TARGET_PORT=$TARGET_PORT" \
  -e "TARGET_DB=$TARGET_DB" \
  -e "TIMEOUT_MS=$TIMEOUT_MS" \
  "$SOURCE_CONTAINER" \
  sh -ceu '
    redis-cli --scan | while IFS= read -r key; do
      redis-cli MIGRATE "$TARGET_HOST" "$TARGET_PORT" "$key" "$TARGET_DB" "$TIMEOUT_MS" COPY REPLACE >/dev/null
    done
  '
