import { createOpenCodeBridge } from "@opencodex/bridge"
import { createControlPlaneClient } from "@opencodex/control-plane"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { createEffect } from "solid-js"
import { useServer } from "@/context/server"

const controlPlaneUrl = () => import.meta.env.VITE_OPENCODEX_CONTROL_PLANE_URL || "http://127.0.0.1:8788"

const userID = () => localStorage.getItem("opencodex.user.id") || "anonymous"

export const { use: useOpenCodex, provider: OpenCodexProvider } = createSimpleContext({
  name: "OpenCodex",
  init: () => {
    const server = useServer()
    const bridge = createOpenCodeBridge()

    createEffect(() => {
      if (!server.url) return
      void bridge.connect({
        mode: "local",
        endpoint: server.url,
      })
    })

    const control = createControlPlaneClient({
      baseUrl: controlPlaneUrl(),
      headers: {
        "x-user-id": userID(),
      },
    })

    return {
      bridge,
      control,
    }
  },
})
