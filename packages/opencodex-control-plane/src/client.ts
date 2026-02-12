import { automationSpec, entitlement, transcriptSync, type AutomationSpec, type Entitlement, type TranscriptSync } from "@opencodex/contracts"

const json = {
  "Content-Type": "application/json",
}

const parse = async <T>(response: Response) => {
  const value = await response.json()
  if (!response.ok) {
    throw new Error(typeof value?.message === "string" ? value.message : `Request failed with ${response.status}`)
  }
  return value as T
}

export type ControlPlaneClientOptions = {
  baseUrl: string
  fetcher?: typeof fetch
  headers?: Record<string, string>
}

export const createControlPlaneClient = (options: ControlPlaneClientOptions) => {
  const fetcher = options.fetcher ?? fetch
  const request = (path: string, init?: RequestInit) =>
    fetcher(`${options.baseUrl}${path}`, {
      ...init,
      headers: {
        ...json,
        ...options.headers,
        ...(init?.headers ?? {}),
      },
    })

  return {
    checkEntitlement: async () => entitlement.parse(await parse<Entitlement>(await request("/entitlement/check", { method: "POST" }))),
    setEntitlement: async (userID: string, next: Entitlement) =>
      entitlement.parse(
        await parse<Entitlement>(
          await request("/entitlement/set", {
            method: "POST",
            body: JSON.stringify({
              userID,
              entitlement: next,
            }),
          }),
        ),
      ),
    startRemote: async (project: string) =>
      parse<{ id: string; endpoint: string; token: string; project: string; status: "active" | "stopped"; createdAt: number }>(
        await request("/remote/session/start", {
          method: "POST",
          body: JSON.stringify({ project, mode: "remote" }),
        }),
      ),
    attachRemote: async (sessionID: string) =>
      parse<{ id: string; endpoint: string; token: string; project: string; status: "active" | "stopped"; createdAt: number }>(
        await request("/remote/session/attach", {
          method: "POST",
          body: JSON.stringify({ sessionID }),
        }),
      ),
    createAutomation: async (input: Omit<AutomationSpec, "id"> & { id?: string }) => {
      const response = await parse<AutomationSpec>(
        await request("/automation/create", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      )
      return automationSpec.parse(response)
    },
    updateAutomation: async (id: string, patch: Partial<AutomationSpec>) => {
      const response = await parse<AutomationSpec>(
        await request("/automation/update", {
          method: "POST",
          body: JSON.stringify({ id, patch }),
        }),
      )
      return automationSpec.parse(response)
    },
    pauseAutomation: async (id: string) =>
      automationSpec.parse(
        await parse<AutomationSpec>(
          await request("/automation/pause", {
            method: "POST",
            body: JSON.stringify({ id }),
          }),
        ),
      ),
    resumeAutomation: async (id: string) =>
      automationSpec.parse(
        await parse<AutomationSpec>(
          await request("/automation/resume", {
            method: "POST",
            body: JSON.stringify({ id }),
          }),
        ),
      ),
    runAutomationNow: async (id: string) =>
      parse<{ ok: true; automation: AutomationSpec; dispatchedAt: number }>(
        await request("/automation/run-now", {
          method: "POST",
          body: JSON.stringify({ id }),
        }),
      ),
    listAutomations: async () => {
      const response = await parse<AutomationSpec[]>(
        await request("/automation/list", {
          method: "GET",
        }),
      )
      return response.map((item) => automationSpec.parse(item))
    },
    syncTranscript: async (payload: TranscriptSync) => {
      const response = await parse<{ ok: boolean; revisions: number }>(
        await request("/transcript/sync", {
          method: "POST",
          body: JSON.stringify(transcriptSync.parse(payload)),
        }),
      )
      return response
    },
    historyTranscript: async (project: string, sessionID: string) =>
      parse<TranscriptSync[]>(
        await request(`/transcript/history?project=${encodeURIComponent(project)}&sessionID=${encodeURIComponent(sessionID)}`, {
          method: "GET",
        }),
      ),
  }
}
