import {
  createOpencodeClient,
  type Event,
  type FileDiff,
  type OpencodeClient,
  type Project,
  type Session,
} from "@opencode-ai/sdk/v2/client"
import {
  fileDiff,
  openCodeEvent,
  permissionReply,
  projectRef,
  promptInput,
  remoteTarget,
  sessionRef,
  skillInfo,
  type OpenCodeEvent,
  type PermissionReply,
  type ProjectRef,
  type PromptInput,
  type RemoteTarget,
  type SessionRef,
  type SkillInfo,
} from "@opencodex/contracts"

export type Unsubscribe = () => void

export interface OpenCodeBridge {
  connect(target: RemoteTarget): Promise<void>
  listProjects(): Promise<ProjectRef[]>
  listSessions(projectDir: string): Promise<SessionRef[]>
  attachSession(sessionID: string): Promise<void>
  sendMessage(input: PromptInput): Promise<void>
  streamEvents(sessionID: string, onEvent: (event: OpenCodeEvent) => void): Unsubscribe
  respondPermission(input: PermissionReply): Promise<void>
  getDiff(sessionID: string): Promise<FileDiff[]>
  listSkills(): Promise<SkillInfo[]>
}

const normalizeModel = (input: PromptInput) => {
  if (!input.model) return
  if (input.provider) {
    return {
      providerID: input.provider,
      modelID: input.model,
    }
  }

  const [providerID, modelID] = input.model.includes("/") ? input.model.split("/", 2) : [undefined, input.model]
  if (!providerID || !modelID) return

  return {
    providerID,
    modelID,
  }
}

const parseProject = (item: Project) =>
  projectRef.parse({
    id: item.id,
    worktree: item.worktree,
    name: item.name,
    sandboxes: item.sandboxes ?? [],
  })

const parseSession = (item: Session) =>
  sessionRef.parse({
    id: item.id,
    title: item.title,
    parentID: item.parentID,
    updated: item.time.updated,
    created: item.time.created,
  })

const parseEvent = (item: Event) =>
  openCodeEvent.parse({
    type: item.type,
    properties: item.properties,
  })

const parseDiff = (item: FileDiff) =>
  fileDiff.parse({
    file: item.file,
    before: item.before,
    after: item.after,
    additions: item.additions,
    deletions: item.deletions,
    status: item.status,
  })

const parseSkill = (item: { name: string; description: string; location: string }) =>
  skillInfo.parse({
    name: item.name,
    description: item.description,
    location: item.location,
  })

const permissionMap = {
  allow: "once",
  allow_always: "always",
  deny: "reject",
} as const

export class OpenCodeSdkBridge implements OpenCodeBridge {
  private target: RemoteTarget | undefined
  private sdk: OpencodeClient | undefined

  async connect(target: RemoteTarget) {
    const parsed = remoteTarget.parse(target)
    const headers = parsed.token
      ? {
          Authorization: `Bearer ${parsed.token}`,
        }
      : undefined

    this.target = parsed
    this.sdk = createOpencodeClient({
      baseUrl: parsed.endpoint ?? "http://127.0.0.1:4096",
      headers,
      throwOnError: true,
    })
  }

  private client() {
    if (!this.sdk) throw new Error("Bridge is not connected")
    return this.sdk
  }

  private directory(override?: string) {
    const dir = override ?? this.target?.projectDir
    if (!dir) return
    return { directory: dir }
  }

  async listProjects() {
    const result = await this.client().project.list(this.directory())
    return (result.data ?? []).map(parseProject)
  }

  async listSessions(projectDir: string) {
    const result = await this.client().session.list({ directory: projectDir })
    return (result.data ?? []).map(parseSession)
  }

  async attachSession(sessionID: string) {
    await this.client().session.get({
      sessionID,
      ...this.directory(),
    })
  }

  async sendMessage(input: PromptInput) {
    const payload = promptInput.parse(input)
    await this.client().session.prompt({
      sessionID: payload.sessionID,
      ...this.directory(),
      parts: [
        {
          type: "text",
          text: payload.text,
        },
      ],
      model: normalizeModel(payload),
    })
  }

  streamEvents(_sessionID: string, onEvent: (event: OpenCodeEvent) => void) {
    const abort = new AbortController()

    void this.client()
      .event.subscribe(this.directory(), {
        signal: abort.signal,
      })
      .then(async (result) => {
        for await (const event of result.stream) {
          if (abort.signal.aborted) return
          onEvent(parseEvent(event))
        }
      })
      .catch((error) => {
        if (abort.signal.aborted) return
        console.error("[opencodex-bridge] failed to stream events", error)
      })

    return () => abort.abort()
  }

  async respondPermission(input: PermissionReply) {
    const payload = permissionReply.parse(input)
    await this.client().permission.respond({
      sessionID: payload.sessionID,
      permissionID: payload.permissionID,
      response: permissionMap[payload.response],
      ...this.directory(),
    })
  }

  async getDiff(sessionID: string) {
    const result = await this.client().session.diff({
      sessionID,
      ...this.directory(),
    })
    return (result.data ?? []).map(parseDiff)
  }

  async listSkills() {
    const result = await this.client().app.skills(this.directory())
    return (result.data ?? []).map(parseSkill)
  }
}

export const createOpenCodeBridge = () => new OpenCodeSdkBridge()
