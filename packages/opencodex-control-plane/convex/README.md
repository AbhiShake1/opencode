# OpenCodex Convex Modules (Scaffold)

This folder defines the Convex-oriented backend shape for OpenCodex:

- Better Auth account routing (`/auth/*`)
- Polar entitlement synchronization and checks
- Daytona remote session orchestration
- Automation scheduling and dispatch
- Transcript storage and history retrieval

The runtime API in `../src/api.ts` is a working Hono reference implementation.

## Intended migration path

1. Port `src/store.ts` persistence calls into Convex table operations.
2. Replace `x-user-id` header fallback with Better Auth session middleware.
3. Wire Polar webhooks to entitlement updates.
4. Wire Daytona client operations in remote session start/attach handlers.
5. Move automation execution into Convex cron/actions.

## Tables to create

- `users`
- `entitlements`
- `automations`
- `remote_sessions`
- `transcripts`
