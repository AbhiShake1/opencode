# @opencodex/control-plane

OpenCodex control-plane reference implementation.

This package currently provides:

- Hono API app (`createControlPlaneApp`)
- In-memory persistence (`ControlPlaneStore`)
- Typed HTTP client (`createControlPlaneClient`)
- Convex migration scaffolding in `convex/`

## Endpoints

- `POST /auth/*`
- `POST /entitlement/check`
- `POST /remote/session/start`
- `POST /remote/session/attach`
- `POST /automation/create|update|pause|resume|run-now`
- `GET /automation/list`
- `POST /transcript/sync`
- `GET /transcript/history`
