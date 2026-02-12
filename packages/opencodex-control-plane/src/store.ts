import { entitlement, automationSpec, transcriptSync, type AutomationSpec, type Entitlement } from "@opencodex/contracts"

const defaultEntitlement = (): Entitlement => ({
  plan: "free",
  remoteAllowed: false,
  automationsAllowed: false,
  limits: {
    concurrentRemoteSessions: 1,
    monthlyAutomationRuns: 0,
  },
})

const now = () => Date.now()

export class ControlPlaneStore {
  private entitlements = new Map<string, Entitlement>()
  private automations = new Map<string, AutomationSpec[]>()
  private transcripts = new Map<string, ReturnType<typeof transcriptSync.parse>[]>()
  private remotes = new Map<
    string,
    {
      id: string
      endpoint: string
      token: string
      project: string
      createdAt: number
      status: "active" | "stopped"
    }
  >()

  entitlement(userID: string) {
    const value = this.entitlements.get(userID)
    if (value) return value

    const next = defaultEntitlement()
    this.entitlements.set(userID, next)
    return next
  }

  setEntitlement(userID: string, value: Entitlement) {
    this.entitlements.set(userID, entitlement.parse(value))
    return this.entitlement(userID)
  }

  listAutomations(userID: string) {
    return this.automations.get(userID) ?? []
  }

  upsertAutomation(userID: string, value: AutomationSpec) {
    const item = automationSpec.parse(value)
    const list = this.automations.get(userID) ?? []
    const filtered = list.filter((x) => x.id !== item.id)
    const next = [...filtered, item]
    this.automations.set(userID, next)
    return item
  }

  patchAutomation(userID: string, id: string, update: Partial<AutomationSpec>) {
    const list = this.automations.get(userID) ?? []
    const current = list.find((x) => x.id === id)
    if (!current) return

    const next = automationSpec.parse({
      ...current,
      ...update,
    })

    this.automations.set(
      userID,
      list.map((x) => (x.id === id ? next : x)),
    )

    return next
  }

  saveTranscript(payload: ReturnType<typeof transcriptSync.parse>) {
    const key = `${payload.project}:${payload.sessionID}`
    const list = this.transcripts.get(key) ?? []
    const next = [...list, payload]
    this.transcripts.set(key, next)
    return next.length
  }

  listTranscript(project: string, sessionID: string) {
    return this.transcripts.get(`${project}:${sessionID}`) ?? []
  }

  startRemote(input: { userID: string; project: string }) {
    const id = crypto.randomUUID()
    const token = `ocx_${crypto.randomUUID().replace(/-/g, "")}`

    const value = {
      id,
      endpoint: `https://remote.opencodex.dev/session/${id}`,
      token,
      project: input.project,
      createdAt: now(),
      status: "active" as const,
    }

    this.remotes.set(id, value)
    return value
  }

  attachRemote(id: string) {
    return this.remotes.get(id)
  }
}

export const createControlPlaneStore = () => new ControlPlaneStore()
