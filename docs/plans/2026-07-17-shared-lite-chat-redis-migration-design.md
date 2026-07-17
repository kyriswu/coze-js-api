# Shared Lite-Chat Redis Migration Design

## Goal

Retire the project-owned `my-redis` service and use the local `lite-chat-redis` container without interrupting the running public application.

## Decision

Attach `lite-chat-redis` to the existing coze-js-api Docker network at runtime. The application will use Redis DB 1 through environment-configurable connection settings; lite-chat remains on its existing DB. This network attachment is intentionally runtime-only: the accepted operational assumption is that the lite-chat Redis container may restart but will not be recreated.

## Migration

1. Remove the four unauthenticated Redis administration routes before sharing the Redis server.
2. Make the Redis client accept a URL or individual host/port/database environment settings, retaining development defaults.
3. Update Compose so blue/green applications point to `lite-chat-redis`, DB 1, and no longer depend on or define `my-redis`.
4. Join `lite-chat-redis` to the coze-js-api network without restarting application containers.
5. Online-copy source keys to DB 1 while preserving TTL. Writes that occur during the copy may be lost, as accepted.
6. Restart only the inactive blue/green application color, validate readiness and selected Redis state, then use the existing deployment process to switch traffic.
7. Keep the old Redis volume as a rollback backup until the new service is verified; only then stop/remove the old Redis container.

## Boundaries

- The migration does not expose Redis on a host port and does not read or print stored values.
- The data transfer targets DB 1 so it does not collide with lite-chat's default database.
- The runtime network attachment must be repeated manually if `lite-chat-redis` is recreated.
