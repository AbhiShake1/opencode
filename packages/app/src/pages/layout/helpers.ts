import { getFilename } from "@opencode-ai/util/path"
import { type Session } from "@opencode-ai/sdk/v2/client"
import type { SidebarFilterMode, SidebarSortMode } from "@/context/layout"

const DAY_MS = 24 * 60 * 60 * 1000

export type SessionViewMode = "active" | "archived"

export type SessionQuery = {
  now: number
  sort?: SidebarSortMode
  filter?: SidebarFilterMode
  view?: SessionViewMode
}

export type SessionGroup = {
  id: "today" | "yesterday" | "older"
  sessions: Session[]
}

export const workspaceKey = (directory: string) => {
  const drive = directory.match(/^([A-Za-z]:)[\\/]+$/)
  if (drive) return `${drive[1]}${directory.includes("\\") ? "\\" : "/"}`
  if (/^[\\/]+$/.test(directory)) return directory.includes("\\") ? "\\" : "/"
  return directory.replace(/[\\/]+$/, "")
}

export const sessionArchived = (session: Session) => (session.time.archived ?? 0) > 0

const sessionCreatedAt = (session: Session) => session.time.created
const sessionUpdatedAt = (session: Session) => session.time.updated ?? session.time.created

export const sessionRelevant = (session: Session, _: number) => {
  // "Relevant" keeps threads with concrete outcomes to reduce idle/noise-only sessions.
  const summary = session.summary
  if (summary) {
    if (summary.additions + summary.deletions + summary.files > 0) return true
    if ((summary.diffs?.length ?? 0) > 0) return true
  }

  return !!session.share?.url
}

function query(input: number | SessionQuery) {
  if (typeof input === "number") {
    return { now: input, sort: "updated_desc" as const, filter: "all" as const, view: "active" as const }
  }

  return {
    now: input.now,
    sort: input.sort ?? "updated_desc",
    filter: input.filter ?? "all",
    view: input.view ?? "active",
  }
}

export function sortSessions(mode: SidebarSortMode) {
  return (a: Session, b: Session) => {
    const aTime = mode === "created_desc" ? sessionCreatedAt(a) : sessionUpdatedAt(a)
    const bTime = mode === "created_desc" ? sessionCreatedAt(b) : sessionUpdatedAt(b)
    if (aTime !== bTime) return bTime - aTime
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
}

const sessionVisible = (session: Session, opts: ReturnType<typeof query>) => {
  const archived = sessionArchived(session)
  if (opts.view === "active" && archived) return false
  if (opts.view === "archived" && !archived) return false
  if (opts.filter === "all") return true
  return sessionRelevant(session, opts.now)
}

export const isRootVisibleSession = (session: Session, directory: string, input: number | SessionQuery) => {
  const opts = query(input)
  if (workspaceKey(session.directory) !== workspaceKey(directory)) return false
  if (session.parentID) return false
  return sessionVisible(session, opts)
}

export const sortedRootSessions = (
  store: { session: Session[]; path: { directory: string } },
  input: number | SessionQuery,
) => {
  const opts = query(input)
  return store.session.filter((session) => isRootVisibleSession(session, store.path.directory, opts)).sort(sortSessions(opts.sort))
}

export const groupChronologicalSessions = (sessions: Session[], now: number): SessionGroup[] => {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const todayStart = start.getTime()
  const yesterdayStart = todayStart - DAY_MS
  const groups = {
    today: [] as Session[],
    yesterday: [] as Session[],
    older: [] as Session[],
  }

  for (const session of sessions) {
    const at = sessionUpdatedAt(session)
    if (at >= todayStart) {
      groups.today.push(session)
      continue
    }
    if (at >= yesterdayStart) {
      groups.yesterday.push(session)
      continue
    }
    groups.older.push(session)
  }

  return (["today", "yesterday", "older"] as const).flatMap((id): SessionGroup[] => {
    const sessions = groups[id]
    if (sessions.length === 0) return []
    return [{ id, sessions }]
  })
}

export const childMapByParent = (sessions: Session[]) => {
  const map = new Map<string, string[]>()
  for (const session of sessions) {
    if (!session.parentID) continue
    const existing = map.get(session.parentID)
    if (existing) {
      existing.push(session.id)
      continue
    }
    map.set(session.parentID, [session.id])
  }
  return map
}

export function getDraggableId(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined
  if (!("draggable" in event)) return undefined
  const draggable = (event as { draggable?: { id?: unknown } }).draggable
  if (!draggable) return undefined
  return typeof draggable.id === "string" ? draggable.id : undefined
}

export const displayName = (project: { name?: string; worktree: string }) =>
  project.name || getFilename(project.worktree)

export const errorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

export const syncWorkspaceOrder = (local: string, dirs: string[], existing?: string[]) => {
  if (!existing) return dirs
  const keep = existing.filter((d) => d !== local && dirs.includes(d))
  const missing = dirs.filter((d) => d !== local && !existing.includes(d))
  return [local, ...missing, ...keep]
}
