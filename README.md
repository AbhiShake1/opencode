# OpenCodex

OpenCodex is a cross-platform AI coding workspace with Codex-style UX, powered by the OpenCode runtime.

This repository currently bootstraps from upstream OpenCode and layers OpenCodex-specific architecture and features on top:

- OpenCodex desktop shell (Tauri v2 + Solid)
- OpenCode SDK bridge contracts for local/remote runtime targets
- Control-plane API scaffold for auth, entitlements, remote sessions, automations, and transcript sync
- In-app skills integration plumbing via non-interactive `skills` CLI execution

## Status

OpenCodex is under active development.

Implemented in this repo so far:

- Upstream OpenCode fork baseline on `dev`
- New packages:
  - `packages/opencodex-contracts`
  - `packages/opencodex-bridge`
  - `packages/opencodex-control-plane`
- Desktop rebrand baseline (`OpenCodex` product/identifier changes)
- Desktop-side `run_skills_command` Tauri command and JS bindings

## Repository layout

- `packages/opencodex-contracts`: shared API/type contracts (automation, entitlement, remote/session payloads)
- `packages/opencodex-bridge`: `OpenCodeBridge` interface + SDK-backed implementation
- `packages/opencodex-control-plane`: Hono control-plane reference server + Convex migration scaffolding
- `packages/app`: shared app UI (Solid)
- `packages/desktop`: Tauri desktop shell
- `packages/opencode`: upstream OpenCode runtime

## Development

```bash
bun install
bun run dev:desktop
```

Run control-plane reference server locally:

```bash
bun --cwd packages/opencodex-control-plane dev
```

## Legal / attribution

OpenCodex is not affiliated with OpenAI Codex Desktop.
This project reuses and builds on OpenCode OSS architecture and remains MIT licensed.
