import { createControlPlaneApp } from "./api"

export * from "./api"
export * from "./client"
export * from "./store"

const app = createControlPlaneApp()

export default {
  port: 8788,
  fetch: app.fetch,
}
