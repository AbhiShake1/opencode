import type { TuiPlugin as TuiPluginFn, TuiPluginInput } from "@opencode-ai/plugin"
import { Config } from "@/config/config"
import { Log } from "@/util/log"
import { BunProc } from "@/bun"
import { Instance } from "@/project/instance"

export namespace TuiPlugin {
  const log = Log.create({ service: "tui.plugin" })
  let loaded: Promise<void> | undefined

  export async function init(input: TuiPluginInput) {
    if (loaded) return loaded
    loaded = load(input)
    return loaded
  }

  async function load(input: TuiPluginInput) {
    const dir = input.directory ?? process.cwd()
    await Instance.provide({
      directory: dir,
      fn: async () => {
        const config = await Config.get()
        const plugins = config.plugin ?? []
        if (plugins.length) await Config.waitForDependencies()

        async function resolve(spec: string) {
          if (spec.startsWith("file://")) return spec
          const lastAtIndex = spec.lastIndexOf("@")
          const pkg = lastAtIndex > 0 ? spec.substring(0, lastAtIndex) : spec
          const version = lastAtIndex > 0 ? spec.substring(lastAtIndex + 1) : "latest"
          return BunProc.install(pkg, version)
        }

        for (const item of plugins) {
          const spec = Config.pluginSpecifier(item)
          log.info("loading tui plugin", { path: spec })
          const path = await resolve(spec)
          const mod = await import(path)
          const seen = new Set<unknown>()
          for (const [_name, entry] of Object.entries(mod)) {
            if (seen.has(entry)) continue
            seen.add(entry)
            const tui = (() => {
              if (!entry || typeof entry !== "object") return
              if ("tui" in entry && typeof entry.tui === "function") return entry.tui as TuiPluginFn
              return
            })()
            if (!tui) continue
            await tui(input, Config.pluginOptions(item))
          }
        }
      },
    }).catch((error) => {
      log.error("failed to load tui plugins", { directory: dir, error })
    })
  }
}
