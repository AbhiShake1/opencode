import { describe, expect, test } from "bun:test"
import { collectOpenProjectDeepLinks, drainPendingDeepLinks, parseDeepLink } from "./deep-links"
import {
  displayName,
  errorMessage,
  getDraggableId,
  groupChronologicalSessions,
  sessionRelevant,
  sortedRootSessions,
  syncWorkspaceOrder,
  workspaceKey,
} from "./helpers"

describe("layout deep links", () => {
  test("parses open-project deep links", () => {
    expect(parseDeepLink("opencode://open-project?directory=/tmp/demo")).toBe("/tmp/demo")
  })

  test("ignores non-project deep links", () => {
    expect(parseDeepLink("opencode://other?directory=/tmp/demo")).toBeUndefined()
    expect(parseDeepLink("https://example.com")).toBeUndefined()
  })

  test("ignores malformed deep links safely", () => {
    expect(() => parseDeepLink("opencode://open-project/%E0%A4%A%")).not.toThrow()
    expect(parseDeepLink("opencode://open-project/%E0%A4%A%")).toBeUndefined()
  })

  test("parses links when URL.canParse is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(URL, "canParse")
    Object.defineProperty(URL, "canParse", { configurable: true, value: undefined })
    try {
      expect(parseDeepLink("opencode://open-project?directory=/tmp/demo")).toBe("/tmp/demo")
    } finally {
      if (original) Object.defineProperty(URL, "canParse", original)
      if (!original) Reflect.deleteProperty(URL, "canParse")
    }
  })

  test("ignores open-project deep links without directory", () => {
    expect(parseDeepLink("opencode://open-project")).toBeUndefined()
    expect(parseDeepLink("opencode://open-project?directory=")).toBeUndefined()
  })

  test("collects only valid open-project directories", () => {
    const result = collectOpenProjectDeepLinks([
      "opencode://open-project?directory=/a",
      "opencode://other?directory=/b",
      "opencode://open-project?directory=/c",
    ])
    expect(result).toEqual(["/a", "/c"])
  })

  test("drains global deep links once", () => {
    const target = {
      __OPENCODE__: {
        deepLinks: ["opencode://open-project?directory=/a"],
      },
    } as unknown as Window & { __OPENCODE__?: { deepLinks?: string[] } }

    expect(drainPendingDeepLinks(target)).toEqual(["opencode://open-project?directory=/a"])
    expect(drainPendingDeepLinks(target)).toEqual([])
  })
})

describe("layout workspace helpers", () => {
  test("normalizes trailing slash in workspace key", () => {
    expect(workspaceKey("/tmp/demo///")).toBe("/tmp/demo")
    expect(workspaceKey("C:\\tmp\\demo\\\\")).toBe("C:\\tmp\\demo")
  })

  test("preserves posix and drive roots in workspace key", () => {
    expect(workspaceKey("/")).toBe("/")
    expect(workspaceKey("///")).toBe("/")
    expect(workspaceKey("C:\\")).toBe("C:\\")
    expect(workspaceKey("C:\\\\\\")).toBe("C:\\")
    expect(workspaceKey("C:///")).toBe("C:/")
  })

  test("keeps local first while preserving known order", () => {
    const result = syncWorkspaceOrder("/root", ["/root", "/b", "/c"], ["/root", "/c", "/a", "/b"])
    expect(result).toEqual(["/root", "/c", "/b"])
  })

  test("extracts draggable id safely", () => {
    expect(getDraggableId({ draggable: { id: "x" } })).toBe("x")
    expect(getDraggableId({ draggable: { id: 42 } })).toBeUndefined()
    expect(getDraggableId(null)).toBeUndefined()
  })

  test("formats fallback project display name", () => {
    expect(displayName({ worktree: "/tmp/app" })).toBe("app")
    expect(displayName({ worktree: "/tmp/app", name: "My App" })).toBe("My App")
  })

  test("extracts api error message and fallback", () => {
    expect(errorMessage({ data: { message: "boom" } }, "fallback")).toBe("boom")
    expect(errorMessage(new Error("broken"), "fallback")).toBe("broken")
    expect(errorMessage("unknown", "fallback")).toBe("fallback")
  })
})

describe("layout session helpers", () => {
  const now = new Date("2026-01-10T12:00:00.000Z").getTime()

  const session = (id: string, input: { created: number; updated?: number; archived?: number; summary?: boolean }) => ({
    id,
    slug: id,
    projectID: "p",
    directory: "/tmp/demo",
    title: id,
    version: "1",
    time: {
      created: input.created,
      updated: input.updated ?? input.created,
      archived: input.archived,
    },
    summary: input.summary
      ? {
          additions: 1,
          deletions: 0,
          files: 1,
        }
      : undefined,
  })

  test("sorts by updated desc with stable id tiebreak", () => {
    const store = {
      path: { directory: "/tmp/demo" },
      session: [
        session("b", { created: now - 1_000, updated: now - 200 }),
        session("a", { created: now - 2_000, updated: now - 200 }),
        session("c", { created: now - 300, updated: now - 300 }),
      ],
    }

    const result = sortedRootSessions(store, { now, sort: "updated_desc", filter: "all" })
    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"])
  })

  test("sorts by created desc exactly", () => {
    const store = {
      path: { directory: "/tmp/demo" },
      session: [
        session("a", { created: now - 9_000, updated: now - 100 }),
        session("b", { created: now - 200, updated: now - 8_000 }),
      ],
    }

    const result = sortedRootSessions(store, { now, sort: "created_desc", filter: "all" })
    expect(result.map((item) => item.id)).toEqual(["b", "a"])
  })

  test("filters relevant sessions deterministically", () => {
    const recent = session("recent", { created: now - 100, updated: now - 100 })
    const withSummary = session("summary", { created: now - 30 * 24 * 60 * 60 * 1000, summary: true })
    const stale = session("stale", { created: now - 30 * 24 * 60 * 60 * 1000 })

    expect(sessionRelevant(recent, now)).toBe(false)
    expect(sessionRelevant(withSummary, now)).toBe(true)
    expect(sessionRelevant(stale, now)).toBe(false)

    const store = {
      path: { directory: "/tmp/demo" },
      session: [recent, withSummary, stale],
    }

    const result = sortedRootSessions(store, { now, sort: "updated_desc", filter: "relevant" })
    expect(result.map((item) => item.id)).toEqual(["summary"])
  })

  test("supports archived view separately from active view", () => {
    const active = session("active", { created: now - 100 })
    const archived = session("archived", { created: now - 200, archived: now - 50 })
    const store = {
      path: { directory: "/tmp/demo" },
      session: [active, archived],
    }

    const activeResult = sortedRootSessions(store, { now, sort: "updated_desc", filter: "all", view: "active" })
    expect(activeResult.map((item) => item.id)).toEqual(["active"])

    const archivedResult = sortedRootSessions(store, { now, sort: "updated_desc", filter: "all", view: "archived" })
    expect(archivedResult.map((item) => item.id)).toEqual(["archived"])
  })

  test("groups chronological sessions into today, yesterday, and older buckets", () => {
    const sessions = [
      session("t", { created: now - 1_000, updated: now - 1_000 }),
      session("y", { created: now - 25 * 60 * 60 * 1000, updated: now - 25 * 60 * 60 * 1000 }),
      session("o", { created: now - 5 * 24 * 60 * 60 * 1000, updated: now - 5 * 24 * 60 * 60 * 1000 }),
    ]

    const groups = groupChronologicalSessions(sessions, now)
    expect(groups.map((group) => group.id)).toEqual(["today", "yesterday", "older"])
    expect(groups.map((group) => group.sessions.map((item) => item.id))).toEqual([["t"], ["y"], ["o"]])
  })
})
