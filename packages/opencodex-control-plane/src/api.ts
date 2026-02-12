import { zValidator } from "@hono/zod-validator"
import {
  automationSpec,
  entitlement,
  transcriptSync,
  type AutomationSpec,
  type Entitlement,
} from "@opencodex/contracts"
import { Hono } from "hono"
import { z } from "zod"
import { createControlPlaneStore, type ControlPlaneStore } from "./store"

const automationCreate = automationSpec.omit({ id: true }).extend({
  id: z.string().optional(),
})

const remoteStart = z.object({
  project: z.string(),
  branch: z.string().optional(),
  mode: z.enum(["local", "remote"]).default("remote"),
})

const remoteAttach = z.object({
  sessionID: z.string(),
})

const entitlementSet = z.object({
  userID: z.string().min(1),
  entitlement,
})

const user = (header: string | undefined) => header?.trim() || "anonymous"

const automationID = () => `auto_${crypto.randomUUID().replace(/-/g, "")}`

export type ControlPlaneAppOptions = {
  store?: ControlPlaneStore
  resolveUserID?: (headers: Headers) => string
}

export const createControlPlaneApp = (opts?: ControlPlaneAppOptions) => {
  const app = new Hono()
  const store = opts?.store ?? createControlPlaneStore()
  const resolveUser = opts?.resolveUserID ?? ((headers: Headers) => user(headers.get("x-user-id") ?? undefined))

  app.post("/auth/*", (c) => {
    return c.json(
      {
        ok: false,
        message:
          "Better Auth integration endpoint stub. Wire your Better Auth handlers here and forward validated user identity through x-user-id.",
      },
      501,
    )
  })

  app.post("/entitlement/check", (c) => {
    const userID = resolveUser(c.req.raw.headers)
    return c.json(store.entitlement(userID))
  })

  app.post("/entitlement/set", zValidator("json", entitlementSet), async (c) => {
    const body = c.req.valid("json")
    return c.json(store.setEntitlement(body.userID, body.entitlement satisfies Entitlement))
  })

  app.post("/remote/session/start", zValidator("json", remoteStart), async (c) => {
    const userID = resolveUser(c.req.raw.headers)
    const body = c.req.valid("json")
    const plan = store.entitlement(userID)
    if (!plan.remoteAllowed) {
      return c.json(
        {
          error: "remote_not_allowed",
          message: "Remote sessions require a paid plan.",
        },
        402,
      )
    }

    return c.json(store.startRemote({ userID, project: body.project }))
  })

  app.post("/remote/session/attach", zValidator("json", remoteAttach), async (c) => {
    const body = c.req.valid("json")
    const session = store.attachRemote(body.sessionID)
    if (!session) {
      return c.json(
        {
          error: "not_found",
        },
        404,
      )
    }

    return c.json(session)
  })

  app.post("/automation/create", zValidator("json", automationCreate), async (c) => {
    const userID = resolveUser(c.req.raw.headers)
    const body = c.req.valid("json")
    const plan = store.entitlement(userID)
    if (!plan.automationsAllowed) {
      return c.json(
        {
          error: "automations_not_allowed",
          message: "Automations require a paid plan.",
        },
        402,
      )
    }

    const value = store.upsertAutomation(userID, {
      ...body,
      id: body.id ?? automationID(),
    } satisfies AutomationSpec)

    return c.json(value)
  })

  app.post(
    "/automation/update",
    zValidator(
      "json",
      z.object({
        id: z.string(),
        patch: automationSpec.partial(),
      }),
    ),
    async (c) => {
      const userID = resolveUser(c.req.raw.headers)
      const body = c.req.valid("json")
      const next = store.patchAutomation(userID, body.id, body.patch)
      if (!next) return c.json({ error: "not_found" }, 404)
      return c.json(next)
    },
  )

  app.post(
    "/automation/pause",
    zValidator("json", z.object({ id: z.string() })),
    async (c) => {
      const userID = resolveUser(c.req.raw.headers)
      const body = c.req.valid("json")
      const next = store.patchAutomation(userID, body.id, { status: "paused" })
      if (!next) return c.json({ error: "not_found" }, 404)
      return c.json(next)
    },
  )

  app.post(
    "/automation/resume",
    zValidator("json", z.object({ id: z.string() })),
    async (c) => {
      const userID = resolveUser(c.req.raw.headers)
      const body = c.req.valid("json")
      const next = store.patchAutomation(userID, body.id, { status: "active" })
      if (!next) return c.json({ error: "not_found" }, 404)
      return c.json(next)
    },
  )

  app.post(
    "/automation/run-now",
    zValidator("json", z.object({ id: z.string() })),
    async (c) => {
      const userID = resolveUser(c.req.raw.headers)
      const body = c.req.valid("json")
      const list = store.listAutomations(userID)
      const item = list.find((x) => x.id === body.id)
      if (!item) return c.json({ error: "not_found" }, 404)
      return c.json({ ok: true, automation: item, dispatchedAt: Date.now() })
    },
  )

  app.get("/automation/list", (c) => {
    const userID = resolveUser(c.req.raw.headers)
    return c.json(store.listAutomations(userID))
  })

  app.post("/transcript/sync", zValidator("json", transcriptSync), async (c) => {
    const body = c.req.valid("json")
    const count = store.saveTranscript(body)
    return c.json({ ok: true, revisions: count })
  })

  app.get(
    "/transcript/history",
    zValidator(
      "query",
      z.object({
        project: z.string(),
        sessionID: z.string(),
      }),
    ),
    async (c) => {
      const q = c.req.valid("query")
      return c.json(store.listTranscript(q.project, q.sessionID))
    },
  )

  return app
}
