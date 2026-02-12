// Convex HTTP router scaffold.
// Keep this as a placeholder while the Hono reference server is active.

export const routes = [
  "POST /auth/*",
  "POST /entitlement/check",
  "POST /remote/session/start",
  "POST /remote/session/attach",
  "POST /automation/create",
  "POST /automation/update",
  "POST /automation/pause",
  "POST /automation/resume",
  "POST /automation/run-now",
  "GET /automation/list",
  "POST /transcript/sync",
  "GET /transcript/history",
] as const
