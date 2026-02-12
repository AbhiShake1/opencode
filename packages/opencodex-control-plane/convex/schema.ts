// Convex schema scaffold for planned production migration.
// Keep this as design-time documentation until Convex codegen is wired.

export const tables = {
  users: {
    id: "string",
    email: "string",
    created_at: "number",
    updated_at: "number",
  },
  entitlements: {
    user_id: "string",
    plan: "free|pro|team",
    remote_allowed: "boolean",
    automations_allowed: "boolean",
    concurrent_remote_sessions: "number",
    monthly_automation_runs: "number",
    updated_at: "number",
  },
  automations: {
    id: "string",
    user_id: "string",
    name: "string",
    prompt: "string",
    projects: "string[]",
    schedule: "json",
    mode: "local|remote",
    status: "active|paused",
    created_at: "number",
    updated_at: "number",
  },
  remote_sessions: {
    id: "string",
    user_id: "string",
    project: "string",
    endpoint: "string",
    token: "string",
    status: "active|stopped",
    created_at: "number",
    updated_at: "number",
  },
  transcripts: {
    id: "string",
    project: "string",
    session_id: "string",
    payload: "json",
    created_at: "number",
  },
} as const
