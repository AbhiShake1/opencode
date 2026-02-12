import { Button } from "@opencode-ai/ui/button"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@opencode-ai/ui/toast"
import { createStore } from "solid-js/store"
import { Component, For, Show, createSignal, onMount } from "solid-js"
import { useLanguage } from "@/context/language"
import { useOpenCodex } from "@/context/opencodex"

type OpenCodexContext = ReturnType<typeof useOpenCodex>
type AutomationSpec = Awaited<ReturnType<OpenCodexContext["control"]["listAutomations"]>>[number]
type Entitlement = Awaited<ReturnType<OpenCodexContext["control"]["checkEntitlement"]>>

const parseDays = (value: string) => {
  const days = value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
  if (days.length === 0) return undefined
  return Array.from(new Set(days))
}

const scheduleSummary = (item: AutomationSpec) => {
  if (item.schedule.type === "interval") {
    return `Every ${item.schedule.intervalMinutes ?? 60} minute(s)`
  }
  const time = item.schedule.time || "09:00"
  const days = item.schedule.days?.length ? ` · days ${item.schedule.days.join(",")}` : ""
  return `Daily at ${time}${days}`
}

const uid = () => localStorage.getItem("opencodex.user.id") || "anonymous"

export const SettingsAutomations: Component = () => {
  const language = useLanguage()
  const openCodex = useOpenCodex()
  const [entitlement, setEntitlement] = createSignal<Entitlement | null>(null)
  const [list, setList] = createSignal<AutomationSpec[]>([])
  const [loadingEntitlement, setLoadingEntitlement] = createSignal(false)
  const [loadingList, setLoadingList] = createSignal(false)
  const [busyID, setBusyID] = createSignal<string | null>(null)
  const [creating, setCreating] = createSignal(false)
  const [controlError, setControlError] = createSignal("")

  const [form, setForm] = createStore({
    name: "",
    prompt: "",
    project: "",
    mode: "remote" as "local" | "remote",
    scheduleType: "daily" as "daily" | "interval",
    time: "09:00",
    days: "1,2,3,4,5",
    intervalMinutes: "60",
  })

  const fail = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    showToast({ title: language.t("common.requestFailed"), description: message })
  }

  const refreshEntitlement = async (silent: boolean = false) => {
    if (loadingEntitlement()) return
    setLoadingEntitlement(true)
    await openCodex.control
      .checkEntitlement()
      .then((result) => {
        setControlError("")
        setEntitlement(result)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        setControlError(message)
        if (!silent) fail(err)
      })
      .finally(() => {
        setLoadingEntitlement(false)
      })
  }

  const refreshList = async (silent: boolean = false) => {
    if (loadingList()) return
    setLoadingList(true)
    await openCodex.control
      .listAutomations()
      .then((result) => {
        setControlError("")
        setList(result.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        setControlError(message)
        if (!silent) fail(err)
      })
      .finally(() => {
        setLoadingList(false)
      })
  }

  const enableLocalPro = async () => {
    setBusyID("enable-local-pro")
    await openCodex.control
      .setEntitlement(uid(), {
        plan: "pro",
        remoteAllowed: true,
        automationsAllowed: true,
        limits: {
          concurrentRemoteSessions: 4,
          monthlyAutomationRuns: 3000,
        },
      })
      .then((result) => {
        setEntitlement(result)
        showToast({
          variant: "success",
          icon: "circle-check",
          title: "Pro enabled locally",
          description: "Local entitlement has been set to Pro for this user.",
        })
      })
      .catch(fail)
      .finally(() => {
        setBusyID(null)
      })
  }

  const createAutomation = async (e: SubmitEvent) => {
    e.preventDefault()
    if (creating()) return

    const name = form.name.trim()
    const prompt = form.prompt.trim()
    const project = form.project.trim()
    if (!name || !prompt || !project) {
      showToast({
        title: "Missing fields",
        description: "Name, prompt, and project are required.",
      })
      return
    }

    setCreating(true)
    const schedule =
      form.scheduleType === "interval"
        ? {
            type: "interval" as const,
            intervalMinutes: Math.max(5, Number.parseInt(form.intervalMinutes, 10) || 60),
          }
        : {
            type: "daily" as const,
            time: form.time || "09:00",
            days: parseDays(form.days),
          }

    await openCodex.control
      .createAutomation({
        name,
        prompt,
        projects: [project],
        schedule,
        mode: form.mode,
        status: "active",
      })
      .then((created) => {
        setList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setForm({
          name: "",
          prompt: "",
          project: project,
          mode: form.mode,
          scheduleType: form.scheduleType,
          time: form.time,
          days: form.days,
          intervalMinutes: form.intervalMinutes,
        })
        showToast({
          variant: "success",
          icon: "circle-check",
          title: "Automation created",
          description: `${created.name} is now active.`,
        })
      })
      .catch(fail)
      .finally(() => {
        setCreating(false)
      })
  }

  const runNow = async (id: string) => {
    setBusyID(id)
    await openCodex.control
      .runAutomationNow(id)
      .then((result) => {
        showToast({
          variant: "success",
          icon: "circle-check",
          title: "Run queued",
          description: `${result.automation.name} dispatched.`,
        })
      })
      .catch(fail)
      .finally(() => {
        setBusyID(null)
      })
  }

  const toggleStatus = async (item: AutomationSpec) => {
    setBusyID(item.id)
    await (item.status === "active" ? openCodex.control.pauseAutomation(item.id) : openCodex.control.resumeAutomation(item.id))
      .then((next) => {
        setList((prev) => prev.map((entry) => (entry.id === next.id ? next : entry)))
      })
      .catch(fail)
      .finally(() => {
        setBusyID(null)
      })
  }

  onMount(() => {
    void Promise.all([refreshEntitlement(true), refreshList(true)])
  })

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-raised-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex items-center justify-between gap-4 pt-6 pb-8 max-w-[720px]">
          <div class="flex flex-col gap-1">
            <h2 class="text-16-medium text-text-strong">Automations</h2>
            <p class="text-14-regular text-text-weak">
              Schedule recurring coding tasks and run them in local or remote mode.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void refreshList(false)} disabled={loadingList()}>
            {loadingList() ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <Show when={controlError()}>
          {(value) => (
            <div class="bg-surface-raised-base px-4 py-3 rounded-lg text-12-regular text-text-weak">
              Control plane unavailable: {value()}
            </div>
          )}
        </Show>

        <div class="bg-surface-raised-base px-4 rounded-lg">
          <div class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-14-medium text-text-strong">Plan</span>
              <span class="text-12-regular text-text-weak">
                {loadingEntitlement() ? "Checking entitlement..." : entitlement() ? entitlement()!.plan.toUpperCase() : "unknown"}
              </span>
              <Show when={entitlement()}>
                {(value) => (
                  <span class="text-12-regular text-text-weak">
                    Remote: {value().remoteAllowed ? "enabled" : "disabled"} · Automations:{" "}
                    {value().automationsAllowed ? "enabled" : "disabled"}
                  </span>
                )}
              </Show>
            </div>
            <Button variant="ghost" disabled={busyID() === "enable-local-pro"} onClick={() => void enableLocalPro()}>
              Enable Pro locally
            </Button>
          </div>
        </div>

        <div class="bg-surface-raised-base px-4 rounded-lg">
          <form class="flex flex-col gap-3 py-3" onSubmit={(e) => void createAutomation(e)}>
            <span class="text-14-medium text-text-strong">Create automation</span>

            <TextField value={form.name} onChange={(value) => setForm("name", value)} placeholder="Daily bug sweep" />
            <TextField
              multiline
              value={form.prompt}
              onChange={(value) => setForm("prompt", value)}
              placeholder="Inspect recent commits and surface regressions with concrete fixes."
              class="min-h-[120px]"
            />
            <TextField
              value={form.project}
              onChange={(value) => setForm("project", value)}
              placeholder="/absolute/project/path"
            />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-12-regular text-text-weak">Mode</span>
                <select
                  class="h-9 rounded-md border border-border-weak-base bg-surface-base px-3 text-14-regular text-text-strong"
                  value={form.mode}
                  onInput={(e) => setForm("mode", e.currentTarget.value as "local" | "remote")}
                >
                  <option value="remote">Remote</option>
                  <option value="local">Local</option>
                </select>
              </label>

              <label class="flex flex-col gap-1">
                <span class="text-12-regular text-text-weak">Schedule</span>
                <select
                  class="h-9 rounded-md border border-border-weak-base bg-surface-base px-3 text-14-regular text-text-strong"
                  value={form.scheduleType}
                  onInput={(e) => setForm("scheduleType", e.currentTarget.value as "daily" | "interval")}
                >
                  <option value="daily">Daily</option>
                  <option value="interval">Interval</option>
                </select>
              </label>
            </div>

            <Show
              when={form.scheduleType === "daily"}
              fallback={
                <TextField
                  value={form.intervalMinutes}
                  onChange={(value) => setForm("intervalMinutes", value)}
                  placeholder="Interval minutes (e.g. 60)"
                />
              }
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label class="flex flex-col gap-1">
                  <span class="text-12-regular text-text-weak">Time</span>
                  <input
                    type="time"
                    value={form.time}
                    class="h-9 rounded-md border border-border-weak-base bg-surface-base px-3 text-14-regular text-text-strong"
                    onInput={(e) => setForm("time", e.currentTarget.value)}
                  />
                </label>
                <TextField
                  value={form.days}
                  onChange={(value) => setForm("days", value)}
                  placeholder="Days (0-6 comma separated)"
                />
              </div>
            </Show>

            <div class="flex justify-end">
              <Button type="submit" variant="secondary" disabled={creating()}>
                {creating() ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="text-14-medium text-text-strong pb-2">Scheduled automations</h3>
          <div class="bg-surface-raised-base px-4 rounded-lg">
            <Show when={list().length > 0} fallback={<div class="py-4 text-14-regular text-text-weak">No automations yet.</div>}>
              <For each={list()}>
                {(item) => (
                  <div class="flex flex-wrap items-center justify-between gap-4 min-h-16 py-3 border-b border-border-weak-base last:border-none">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="text-14-medium text-text-strong">{item.name}</span>
                      <span class="text-12-regular text-text-weak">
                        {item.mode.toUpperCase()} · {scheduleSummary(item)} · {item.projects.join(", ")}
                      </span>
                      <span class="text-12-regular text-text-weak">Status: {item.status}</span>
                    </div>
                    <div class="flex gap-2">
                      <Button variant="ghost" disabled={busyID() === item.id} onClick={() => void runNow(item.id)}>
                        Run now
                      </Button>
                      <Button variant="ghost" disabled={busyID() === item.id} onClick={() => void toggleStatus(item)}>
                        {item.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
