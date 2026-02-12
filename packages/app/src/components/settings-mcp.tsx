import { Button } from "@opencode-ai/ui/button"
import { Switch } from "@opencode-ai/ui/switch"
import { showToast } from "@opencode-ai/ui/toast"
import { Component, For, Show, createMemo, createSignal, onMount } from "solid-js"
import { useLanguage } from "@/context/language"
import { useSDK } from "@/context/sdk"
import { useSync } from "@/context/sync"

const statusLabels = {
  connected: "mcp.status.connected",
  failed: "mcp.status.failed",
  needs_auth: "mcp.status.needs_auth",
  disabled: "mcp.status.disabled",
} as const

export const SettingsMcp: Component = () => {
  const language = useLanguage()
  const sdk = useSDK()
  const sync = useSync()
  const [loading, setLoading] = createSignal<string | null>(null)
  const [refreshing, setRefreshing] = createSignal(false)

  const items = createMemo(() =>
    Object.entries(sync.data.mcp ?? {})
      .map(([name, status]) => ({ name, status: status.status }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  const fail = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    showToast({ title: language.t("common.requestFailed"), description: message })
  }

  const refresh = async () => {
    if (refreshing()) return
    setRefreshing(true)
    await sdk.client.mcp
      .status()
      .then((result) => {
        if (result.data) sync.set("mcp", result.data)
      })
      .catch(fail)
      .finally(() => {
        setRefreshing(false)
      })
  }

  const toggle = async (name: string) => {
    if (loading()) return
    setLoading(name)
    await (sync.data.mcp[name]?.status === "connected"
      ? sdk.client.mcp.disconnect({ name })
      : sdk.client.mcp.connect({ name }))
      .then(() => refresh())
      .catch(fail)
      .finally(() => {
        setLoading(null)
      })
  }

  onMount(() => {
    if (items().length > 0) return
    void refresh()
  })

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-raised-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex items-center justify-between gap-4 pt-6 pb-8 max-w-[720px]">
          <div class="flex flex-col gap-1">
            <h2 class="text-16-medium text-text-strong">{language.t("settings.mcp.title")}</h2>
            <p class="text-14-regular text-text-weak">
              Manage MCP servers for the current workspace and test connectivity.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void refresh()} disabled={refreshing()}>
            {refreshing() ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <div class="bg-surface-raised-base px-4 rounded-lg">
          <Show
            when={items().length > 0}
            fallback={<div class="py-4 text-14-regular text-text-weak">No MCP servers found.</div>}
          >
            <For each={items()}>
              {(item) => {
                const mcpStatus = () => sync.data.mcp[item.name]
                const status = () => mcpStatus()?.status
                const statusLabel = () => {
                  const key = status() ? statusLabels[status() as keyof typeof statusLabels] : undefined
                  if (!key) return "unknown"
                  return language.t(key)
                }
                const error = () => {
                  const value = mcpStatus()
                  return value?.status === "failed" ? value.error : undefined
                }
                const enabled = () => status() === "connected"

                return (
                  <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base last:border-none">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-14-medium text-text-strong truncate">{item.name}</span>
                        <span class="text-11-regular text-text-weak">{statusLabel()}</span>
                        <Show when={loading() === item.name}>
                          <span class="text-11-regular text-text-weak">...</span>
                        </Show>
                      </div>
                      <Show when={error()}>
                        {(value) => <span class="text-12-regular text-text-weak truncate">{value()}</span>}
                      </Show>
                    </div>
                    <div class="flex-shrink-0">
                      <Switch checked={enabled()} disabled={loading() === item.name} onChange={() => void toggle(item.name)} />
                    </div>
                  </div>
                )
              }}
            </For>
          </Show>
        </div>
      </div>
    </div>
  )
}
