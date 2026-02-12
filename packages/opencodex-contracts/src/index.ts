import { z } from "zod"

export const schedule = z.object({
  type: z.enum(["daily", "interval"]),
  time: z.string().optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  intervalMinutes: z.number().int().positive().optional(),
})

export const automationSpec = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  projects: z.array(z.string()),
  schedule,
  mode: z.enum(["local", "remote"]),
  status: z.enum(["active", "paused"]),
})

export const entitlement = z.object({
  plan: z.enum(["free", "pro", "team"]),
  remoteAllowed: z.boolean(),
  automationsAllowed: z.boolean(),
  limits: z.object({
    concurrentRemoteSessions: z.number().int().nonnegative(),
    monthlyAutomationRuns: z.number().int().nonnegative(),
  }),
})

export const remoteTarget = z.object({
  mode: z.enum(["local", "remote"]),
  projectDir: z.string().optional(),
  endpoint: z.string().optional(),
  token: z.string().optional(),
})

export const openCodeEvent = z.object({
  type: z.string(),
  properties: z.record(z.string(), z.unknown()),
})

export const promptInput = z.object({
  sessionID: z.string(),
  text: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  reasoning: z.enum(["low", "medium", "high"]).optional(),
})

export const permissionReply = z.object({
  sessionID: z.string(),
  permissionID: z.string(),
  response: z.enum(["allow", "deny", "allow_always"]),
})

export const projectRef = z.object({
  id: z.string(),
  worktree: z.string(),
  name: z.string().optional(),
  sandboxes: z.array(z.string()).default([]),
})

export const sessionRef = z.object({
  id: z.string(),
  title: z.string().optional(),
  parentID: z.string().optional(),
  updated: z.number().optional(),
  created: z.number().optional(),
})

export const skillInfo = z.object({
  name: z.string(),
  description: z.string().default(""),
  location: z.string(),
})

export const fileDiff = z.object({
  file: z.string(),
  before: z.string(),
  after: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  status: z.enum(["added", "deleted", "modified"]).optional(),
})

export const transcriptSync = z.object({
  project: z.string(),
  sessionID: z.string(),
  messages: z.array(z.unknown()),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type Schedule = z.infer<typeof schedule>
export type AutomationSpec = z.infer<typeof automationSpec>
export type Entitlement = z.infer<typeof entitlement>
export type RemoteTarget = z.infer<typeof remoteTarget>
export type OpenCodeEvent = z.infer<typeof openCodeEvent>
export type PromptInput = z.infer<typeof promptInput>
export type PermissionReply = z.infer<typeof permissionReply>
export type ProjectRef = z.infer<typeof projectRef>
export type SessionRef = z.infer<typeof sessionRef>
export type SkillInfo = z.infer<typeof skillInfo>
export type FileDiff = z.infer<typeof fileDiff>
export type TranscriptSync = z.infer<typeof transcriptSync>
