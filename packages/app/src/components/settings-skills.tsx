import { Button } from "@opencode-ai/ui/button"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@opencode-ai/ui/toast"
import { Component, For, Show, createMemo, createSignal, onMount } from "solid-js"
import { useLanguage } from "@/context/language"
import { useOpenCodex } from "@/context/opencodex"
import { usePlatform } from "@/context/platform"
import { useSkills } from "@/context/skills"

type SkillsLog = {
  command: string[]
  stdout: string
  stderr: string
  status: number
}

type InstalledSkill = {
  name: string
  description: string
  location: string
}

export const SettingsSkills: Component = () => {
  const language = useLanguage()
  const platform = usePlatform()
  const openCodex = useOpenCodex()
  const skills = useSkills()
  const [installed, setInstalled] = createSignal<InstalledSkill[]>([])
  const [loadingInstalled, setLoadingInstalled] = createSignal(false)
  const [busy, setBusy] = createSignal<string | null>(null)
  const [source, setSource] = createSignal("")
  const [query, setQuery] = createSignal("")
  const [log, setLog] = createSignal<SkillsLog | null>(null)
  const [loadError, setLoadError] = createSignal("")

  const canManage = createMemo(() => Boolean(platform.runSkillsCommand))

  const fail = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    showToast({ title: language.t("common.requestFailed"), description: message })
  }

  const refreshInstalled = async (silent: boolean = false) => {
    if (loadingInstalled()) return
    setLoadingInstalled(true)
    await openCodex.bridge
      .listSkills()
      .then((result) => {
        setLoadError("")
        setInstalled(
          result
            .map((item) => ({
              name: item.name,
              description: item.description,
              location: item.location,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        setLoadError(message)
        if (!silent) fail(err)
      })
      .finally(() => {
        setLoadingInstalled(false)
      })
  }

  const run = async (label: string, task: () => Promise<SkillsLog>) => {
    if (busy()) return
    setBusy(label)
    await task()
      .then((result) => {
        setLog(result)
        if (result.status !== 0) throw new Error(result.stderr || result.stdout || "skills command failed")
        showToast({
          variant: "success",
          icon: "circle-check",
          title: "Skills command completed",
          description: result.command.join(" "),
        })
      })
      .catch(fail)
      .finally(() => {
        setBusy(null)
      })
  }

  const install = () => {
    const value = source().trim()
    if (!value) {
      showToast({
        title: "Source required",
        description: "Enter a skills.sh source such as vercel-labs/agent-skills.",
      })
      return
    }

    void run("install", () => skills.add({ source: value })).then(() => refreshInstalled(true))
  }

  const discover = () => {
    const value = query().trim()
    if (!value) {
      showToast({
        title: "Query required",
        description: "Enter a query to discover skills.",
      })
      return
    }
    void run("find", () => skills.find(value))
  }

  const removeInstalled = (name: string) => {
    void run("remove", () => skills.remove({ skills: [name] })).then(() => refreshInstalled(true))
  }

  const openSkillLocation = (location: string) => {
    if (!platform.openPath) return
    void platform.openPath(location).catch(fail)
  }

  onMount(() => {
    void refreshInstalled(true)
  })

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-raised-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex items-center justify-between gap-4 pt-6 pb-8 max-w-[720px]">
          <div class="flex flex-col gap-1">
            <h2 class="text-16-medium text-text-strong">Skills</h2>
            <p class="text-14-regular text-text-weak">
              Discover, install, update, and remove skills directly from OpenCodex.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void refreshInstalled(false)} disabled={loadingInstalled()}>
            {loadingInstalled() ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <Show when={canManage()} fallback={<div class="text-12-regular text-text-weak">Skill management commands are only available on desktop.</div>}>
          <div class="bg-surface-raised-base px-4 rounded-lg">
            <div class="flex flex-col gap-3 py-3 border-b border-border-weak-base">
              <span class="text-14-medium text-text-strong">Install or update</span>
              <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                <TextField
                  value={source()}
                  onChange={setSource}
                  placeholder="vercel-labs/agent-skills"
                  class="w-full"
                />
                <Button variant="secondary" disabled={busy() !== null} onClick={install}>
                  Install
                </Button>
                <Button variant="ghost" disabled={busy() !== null} onClick={() => void run("update", () => skills.update())}>
                  Update
                </Button>
                <Button variant="ghost" disabled={busy() !== null} onClick={() => void run("check", () => skills.check())}>
                  Check
                </Button>
              </div>
            </div>

            <div class="flex flex-col gap-3 py-3">
              <span class="text-14-medium text-text-strong">Discover</span>
              <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <TextField value={query()} onChange={setQuery} placeholder="Type a capability (for example: seo, auth, docs)" />
                <Button variant="secondary" disabled={busy() !== null} onClick={discover}>
                  Find
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <div class="flex flex-col gap-1" data-component="installed-skills-section">
          <h3 class="text-14-medium text-text-strong pb-2">Installed skills</h3>
          <div class="bg-surface-raised-base px-4 rounded-lg">
            <Show when={loadError()}>
              {(value) => <div class="py-2 text-12-regular text-text-weak">{value()}</div>}
            </Show>
            <Show when={installed().length > 0} fallback={<div class="py-4 text-14-regular text-text-weak">No installed skills found.</div>}>
              <For each={installed()}>
                {(item) => (
                  <div class="flex flex-wrap items-center justify-between gap-4 min-h-16 py-3 border-b border-border-weak-base last:border-none">
                    <div class="flex flex-col min-w-0">
                      <span class="text-14-medium text-text-strong">{item.name}</span>
                      <Show when={item.description}>
                        <span class="text-12-regular text-text-weak">{item.description}</span>
                      </Show>
                      <button
                        type="button"
                        class="text-left text-11-regular text-text-weaker hover:text-text-strong truncate"
                        onClick={() => openSkillLocation(item.location)}
                      >
                        {item.location}
                      </button>
                    </div>
                    <Show when={canManage()}>
                      <Button variant="ghost" disabled={busy() !== null} onClick={() => removeInstalled(item.name)}>
                        Remove
                      </Button>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="text-14-medium text-text-strong pb-2">Command output</h3>
          <div class="bg-surface-raised-base px-4 py-3 rounded-lg">
            <Show when={log()} fallback={<span class="text-12-regular text-text-weak">No skills command has run in this session.</span>}>
              {(value) => (
                <div class="flex flex-col gap-2">
                  <div class="text-12-regular text-text-weak">
                    <span class="text-text-base">{value().status === 0 ? "Success" : "Failed"}</span> ·{" "}
                    <span class="font-mono">{value().command.join(" ")}</span>
                  </div>
                  <Show when={value().stdout}>
                    <pre class="text-11-regular whitespace-pre-wrap bg-surface-base rounded-md p-2 overflow-auto">{value().stdout}</pre>
                  </Show>
                  <Show when={value().stderr}>
                    <pre class="text-11-regular whitespace-pre-wrap bg-surface-base rounded-md p-2 overflow-auto">{value().stderr}</pre>
                  </Show>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
