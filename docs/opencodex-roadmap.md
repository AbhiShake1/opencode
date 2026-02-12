# OpenCodex v1 Implementation Roadmap

This document tracks practical implementation against the OpenCodex v1 plan.

## Completed foundation

- Upstream OpenCode `dev` baseline imported
- OpenCodex product-level desktop rebrand baseline
- Shared contract package: `@opencodex/contracts`
- SDK bridge package: `@opencodex/bridge`
- Control-plane package: `@opencodex/control-plane`
- Control-plane API routes for entitlement, remote sessions, automations, transcript sync
- App-level OpenCodex context provider and control-plane client integration
- Desktop skills command bridge (`run_skills_command`) via Tauri invoke
- App-level skills context provider with list/find/add/remove/check/update methods

## Next milestones

1. Build full Skills management UI in settings (discovery/install/update/remove with progress)
2. Build automation UI and wire to control-plane endpoints
3. Add provider key/model management parity UX improvements
4. Add remote session launch UX (Daytona-backed)
5. Add mobile-targeted layouts and Tauri mobile runtime integration
6. Add Polar + Better Auth + Convex production wiring
7. Add release pipelines (desktop notarization/signing + mobile stores)

## Non-goals in this commit

- Full pixel-level Codex parity
- Complete mobile app shipping build
- Production Daytona orchestration
- Production billing/auth implementation
