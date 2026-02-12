# OpenCodex Full-Parity Task Packets (LLM-Ready)

This document turns each remaining parity gap into an independent execution packet you can hand to another LLM.

## How To Use
1. Pick one packet.
2. Paste the packet's "Copy-paste handoff prompt" into your LLM coding agent.
3. Keep scope to that packet only.
4. Require code changes, tests, and verification output before merge.

## Repo Baseline Snapshot
- Monorepo root: `/Users/abhi/proj/personal/opencode-desktop`
- UI runtime: SolidJS app + Tauri desktop (`packages/app`, `packages/desktop`)
- OpenCode server/runtime: `packages/opencode`
- New OpenCodex packages already scaffolded:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-contracts/src/index.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-bridge/src/index.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/api.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/client.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/store.ts`
- Existing OpenCodex roadmap: `/Users/abhi/proj/personal/opencode-desktop/docs/opencodex-roadmap.md`

## Standard Verification Commands
Use these in each packet unless the packet overrides them.

```bash
cd /Users/abhi/proj/personal/opencode-desktop
bun install
bun turbo typecheck
bun --cwd packages/app test:unit
bun --cwd packages/app test:e2e --reporter=line
```

---

## Packet 01: Full Sidebar and Thread Parity

### Objective
Implement Codex-equivalent sidebar/thread behavior: by-project and chronological grouping, relevant filter, archive UX, and exact sorting semantics.

### Existing Baseline
- Sidebar composition and drag state already exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/sidebar-workspace.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/sidebar-project.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/sidebar-items.tsx`
- Current sorting helper:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/helpers.ts`
  - `sortSessions` has "recent < 1 min" behavior and updated-time sort.
- Archived sessions are filtered from root lists today (`!session.time?.archived`), but archive-specific UX controls are not parity-complete.

### Implementation Scope
1. Add explicit sidebar organize modes:
   - `by_project`
   - `chronological`
2. Add explicit sort modes with deterministic semantics:
   - created desc
   - updated desc
3. Add thread visibility filters:
   - all threads
   - relevant threads
4. Add archive UX:
   - archive action in thread context menu
   - archived thread list/screen
   - unarchive action
5. Preserve existing drag/sort DnD behavior without regression.
6. Persist mode/filter/sort in layout persisted state.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/helpers.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/sidebar-project.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/sidebar-workspace.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/layout.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/i18n/*` (new strings)
- Tests:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout/helpers.test.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/e2e/sidebar/sidebar.spec.ts`

### Acceptance Criteria
1. Users can switch between by-project and chronological views.
2. Relevant filter reduces noise (clear deterministic rule in code, documented in comments/tests).
3. Sort modes match selected option exactly and remain stable across refresh.
4. Archiving and unarchiving are visible and persisted.
5. Existing quick-navigation and DnD do not regress.

### Copy-paste Handoff Prompt
```text
Implement Packet 01 in /Users/abhi/proj/personal/opencode-desktop.

Goal: Full sidebar/thread parity: by-project/chronological grouping, relevant filter, archive UX, exact sorting semantics.

Baseline:
- layout and sidebar components already exist under packages/app/src/pages/layout*.
- sort helper is in packages/app/src/pages/layout/helpers.ts.

Tasks:
1) Add persisted sidebar view state for organize mode, sort mode, and filter mode.
2) Implement deterministic session query/sort/filter pipelines in helpers.ts with unit tests.
3) Build UI controls (dropdown/menu) for organize/sort/filter and wire to state.
4) Add archive/unarchive UX and an archived-thread surface with navigation parity.
5) Update i18n labels.
6) Add/adjust unit + e2e tests for mode switching, sorting, relevant filter, and archive lifecycle.

Constraints:
- Keep existing drag/drop and workspace behavior working.
- No unrelated refactors.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- bun --cwd packages/app test:e2e --reporter=line

Return:
- files changed
- exact behavior semantics you implemented
- test evidence
```

---

## Packet 02: True Dual-Writer Sync with OpenCode CLI

### Objective
Make OpenCodex and OpenCode CLI first-class dual writers on shared session IDs with conflict reconciliation and reconnect backoff.

### Existing Baseline
- Global and directory sync/event reducers already exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync/event-reducer.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/sync.tsx`
- Optimistic add/remove is implemented for messages, but there is no explicit dual-writer conflict protocol.
- Bridge supports attach/list/send/stream:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-bridge/src/index.ts`

### Implementation Scope
1. Introduce writer identity metadata for client-originated optimistic operations.
2. Define reconciliation rules for races:
   - optimistic message exists, server emits different canonical payload
   - local removal vs remote update
   - reordered event delivery
3. Add stale handle detection and reconnect with backoff + jitter.
4. Add per-session sync health state and user-visible status.
5. Ensure CLI writes appear in app within SLA target.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/sync.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync/event-reducer.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync/types.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-bridge/src/index.ts`
- Tests:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/sync-optimistic.test.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync.test.ts`

### Acceptance Criteria
1. CLI writes and app writes converge to same final timeline without duplicates.
2. Reconnects automatically after transient disconnects.
3. No event cross-talk between sessions/projects.
4. Conflict resolution behavior is deterministic and test-covered.

### Copy-paste Handoff Prompt
```text
Implement Packet 02 in /Users/abhi/proj/personal/opencode-desktop.

Goal: true dual-writer sync with OpenCode CLI session IDs + conflict reconciliation + reconnect backoff.

Baseline:
- global sync exists in packages/app/src/context/global-sync*.tsx
- optimistic message logic exists in packages/app/src/context/sync.tsx

Tasks:
1) Add a writer/conflict model for optimistic writes (origin tagging + canonical replacement rules).
2) Handle out-of-order and duplicate events robustly in event reducer logic.
3) Add reconnect backoff (exponential + jitter) for event streams.
4) Expose sync health state to UI (connected/reconnecting/stale).
5) Add tests for conflict, out-of-order events, reconnect, and stale session handles.

Constraints:
- Preserve existing event contract and avoid breaking other contexts.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- conflict rules implemented
- reconnect algorithm details
- passing test outputs
```

---

## Packet 03: Codex-Like Question Cards Parity

### Objective
Match Codex question-card UX: recommended option treatment, keyboard flow, dismissal behavior, and submit polish.

### Existing Baseline
- Question dock already implemented:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/question-dock.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/session-prompt-dock.tsx`
- Question schema exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/question/index.ts`
- Custom answer path exists and "dismiss/submit" actions exist.
- Missing parity polish: explicit recommended visual semantics and keyboard behavior parity.

### Implementation Scope
1. Add first-class recommended option support:
   - schema field (preferred), or deterministic convention fallback.
2. Implement full keyboard flow:
   - arrow navigation between options
   - enter/space selection
   - esc dismiss
   - tab order parity for custom input and submit
3. Align submit/dismiss disabled/loading states with async lifecycle.
4. Ensure single-question fast path and multi-question review flow parity.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/question/index.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/question-dock.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/session-prompt-dock.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/i18n/*`
- Tests:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/session-prompt-dock.test.ts`
  - Add dedicated question-dock keyboard tests.

### Acceptance Criteria
1. Recommended option is clearly marked and default-focus behavior is deterministic.
2. Keyboard-only completion is fully supported.
3. Dismiss and submit behave correctly under latency/errors.
4. Custom free-text override path remains available.

### Copy-paste Handoff Prompt
```text
Implement Packet 03 in /Users/abhi/proj/personal/opencode-desktop.

Goal: codex-like question cards parity (recommended option, keyboard flow, dismiss/submit polish).

Baseline:
- question UI exists in packages/app/src/components/question-dock.tsx
- question schema exists in packages/opencode/src/question/index.ts

Tasks:
1) Extend question contract to encode a recommended option (or document deterministic fallback if contract compatibility is required).
2) Implement keyboard UX parity (arrow keys, enter/space, esc, tab behavior).
3) Improve async states for reply/reject to prevent accidental duplicate submits.
4) Add tests covering keyboard navigation and recommended option rendering.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- UX behavior table (before vs after)
- tests added
```

---

## Packet 04: Plan-Mode Strict No-Mutation Wiring

### Objective
Ensure plan mode is visibly strict in UI and enforced through runtime state with zero mutation leakage.

### Existing Baseline
- Plan agent exists with restrictive permissions:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/agent/agent.ts`
- Plan prompt reminders exist in server prompts:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/session/prompt.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/session/prompt/plan*.txt`
- UI banner/state parity is incomplete.

### Implementation Scope
1. Add explicit plan-mode UI state indicator in session composer/header.
2. Add strict no-mutation banner with clear action text.
3. Disable or gate mutating quick actions while in plan mode.
4. Ensure runtime requests in plan mode never invoke mutating tools except allowed plan file path.
5. Add transition UX for plan->build switch.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/*`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/prompt-input/*`
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/session/prompt.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/agent/agent.ts`
- Tests in app prompt/session suites and server agent tests.

### Acceptance Criteria
1. Plan mode is always visually obvious.
2. Mutating actions are blocked or require explicit mode exit.
3. No tool path can bypass plan restrictions.
4. Mode transition is explicit and auditable.

### Copy-paste Handoff Prompt
```text
Implement Packet 04 in /Users/abhi/proj/personal/opencode-desktop.

Goal: strict plan-mode no-mutation banner/state wiring through runtime.

Baseline:
- plan agent exists in packages/opencode/src/agent/agent.ts with restricted permissions.
- UI does not fully surface/enforce parity behavior.

Tasks:
1) Wire plan-mode state into session UI.
2) Add prominent no-mutation banner and disable conflicting controls.
3) Validate runtime tool access path cannot mutate outside allowed plan files.
4) Add tests proving blocked mutation behavior in plan mode.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- enforcement points list
- UI screenshots/description
- tests proving no-mutation behavior
```

---

## Packet 05: Diff Parity, Inline Threads, Jump Chat -> Diff

### Objective
Complete diff parity with persisted inline comment threads and reliable "jump from chat to diff" linking.

### Existing Baseline
- Diff review UI exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/review-tab.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/session-side-panel.tsx`
- Comment state is locally persisted by session:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/comments.tsx`
- Gaps:
  - comment threading metadata
  - durable linkability from chat context items to diff anchors
  - cross-reload fidelity for jump targets.

### Implementation Scope
1. Extend comment model to support threads/replies.
2. Add stable anchor IDs per file/hunk/line-range.
3. Add chat context token format for "jump to diff".
4. On click from chat, open review tab + focus file + scroll to anchor + highlight.
5. Persist thread state and focused thread.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/comments.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/review-tab.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/file-tabs.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/session-side-panel.tsx`
- Prompt/context composition files that render chat-linked references.
- Tests:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/comments.test.ts`
  - Add session diff-link navigation tests.

### Acceptance Criteria
1. Inline comment threads support reply and persistence after reload.
2. Chat references jump exactly to the intended diff location.
3. Focus and highlight survive tab switches.

### Copy-paste Handoff Prompt
```text
Implement Packet 05 in /Users/abhi/proj/personal/opencode-desktop.

Goal: diff parity with persisted inline comment threads + jump from chat to diff linkage.

Baseline:
- review tab exists
- comments are session-scoped and persisted locally

Tasks:
1) Upgrade comment model to thread-aware structure.
2) Create stable diff anchors and linking utility.
3) Inject diff-link references into chat context output and handle click navigation.
4) Add tests for persistence and jump accuracy.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- relevant e2e in session/sidebar suites

Return:
- data model changes
- navigation/linking behavior details
- test evidence
```

---

## Packet 06: Provider/Model/Reasoning Parity

### Objective
Provide per-thread provider/model/reasoning controls with preflight validation of keys and model availability.

### Existing Baseline
- Provider settings UI exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-providers.tsx`
- Model settings and selector exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-models.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-select-model.tsx`
- Local per-agent model selection logic exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/local.tsx`
- `PromptInput.reasoning` exists in contracts but is not end-to-end parity wired.

### Implementation Scope
1. Add per-thread override state for provider, model, and reasoning effort.
2. Add preflight validation before prompt submit:
   - provider connected/authorized
   - model visible and available
   - reasoning supported by model when requested
3. Add explicit error UX with one-click fix paths (connect provider/select supported model).
4. Ensure server prompt submission path carries chosen settings.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-contracts/src/index.ts` (if needed)
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-bridge/src/index.ts`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/local.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/prompt-input/*`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-select-model.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/session.ts`
- Tests in model/prompt suites.

### Acceptance Criteria
1. Thread-level model/provider/reasoning are selectable and persisted.
2. Invalid provider/model selection is caught before dispatch.
3. Runtime uses exact selected values.

### Copy-paste Handoff Prompt
```text
Implement Packet 06 in /Users/abhi/proj/personal/opencode-desktop.

Goal: provider/model/reasoning parity with preflight key/model validation.

Baseline:
- provider/model settings UIs already exist
- local model state exists in packages/app/src/context/local.tsx

Tasks:
1) Add thread-scoped provider/model/reasoning state.
2) Add preflight validator before session.prompt call.
3) Wire submission payload so backend receives chosen model/provider/reasoning.
4) Add actionable UI errors and tests for invalid configs.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- model/prompt e2e tests

Return:
- preflight decision matrix
- payload shape used at submit
- tests
```

---

## Packet 07: Skills Parity Completion

### Objective
Finish skills parity: richer discovery, install/update/remove rollback UX, and source management.

### Existing Baseline
- Desktop non-interactive skills wrapper exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/src/cli.rs` (`run_skills_command`)
- App skills context and UI exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/skills.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-skills.tsx`
- Bridge can list installed skills via OpenCode API:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-bridge/src/index.ts`

### Implementation Scope
1. Add source registry UI:
   - known sources
   - add/remove source
   - active source indicator
2. Rich discovery result cards:
   - name, description, maintainer/source, install status
3. Transactional install/update/remove UX:
   - optimistic row state
   - rollback on failure with clear output
4. Reconcile CLI output with `/skill` API list to avoid drift.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-skills.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/skills.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/src/cli.rs`
- `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src/index.tsx`
- Possibly new persisted settings store for source list.
- Tests for command mapping and UI rollback.

### Acceptance Criteria
1. Users can manage skills sources in-app.
2. Install/update/remove failures roll back UI state cleanly.
3. Installed skills list is reconciled and accurate.

### Copy-paste Handoff Prompt
```text
Implement Packet 07 in /Users/abhi/proj/personal/opencode-desktop.

Goal: complete skills parity: rollback UX, richer discover, source management.

Baseline:
- run_skills_command exists in desktop tauri CLI bridge
- skills settings page exists with basic install/find/remove/update/check

Tasks:
1) Add skills source manager state + UI.
2) Improve discover result rendering and install status indicators.
3) Implement transactional UX with rollback for failures.
4) Reconcile installed state using both skills CLI output and bridge.listSkills().
5) Add tests for CLI arg mapping and failure recovery behavior.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- source model
- rollback behavior
- reconciliation algorithm
- tests
```

---

## Packet 08: MCP Parity Completion

### Objective
Complete MCP management parity: add/edit/delete servers, test connection/auth flows, and persisted enable/disable states.

### Existing Baseline
- MCP status/connect UI exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-mcp.tsx`
- MCP APIs support add/auth/connect/disconnect/remove-auth:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/mcp.ts`
- Config schema supports local/remote MCP with OAuth and enabled flags:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/config/config.ts`

### Implementation Scope
1. Add server CRUD UI:
   - create local/remote MCP
   - edit existing config
   - delete server
2. Add explicit "test connection" flow and detailed diagnostics.
3. Add OAuth authenticate/remove-auth actions in UI.
4. Persist enable/disable state through config update flow.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-mcp.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-select-mcp.tsx`
- Add new MCP dialog/forms components.
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/mcp.ts` (if missing endpoints)
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/global-sync.tsx` config refresh wiring.

### Acceptance Criteria
1. Full add/edit/delete lifecycle works from settings.
2. OAuth servers can authenticate/revoke from UI.
3. Connection tests give actionable errors.
4. Enabled state persists across reload.

### Copy-paste Handoff Prompt
```text
Implement Packet 08 in /Users/abhi/proj/personal/opencode-desktop.

Goal: complete MCP parity: add/edit/delete, test connection, persisted enabled state.

Baseline:
- settings MCP page currently supports refresh + connect/disconnect toggles only.
- backend MCP routes already include status/add/auth/connect/disconnect.

Tasks:
1) Build MCP server form UI for local and remote types.
2) Implement create/edit/delete operations and config persistence.
3) Add test-connection action with surfaced diagnostics.
4) Add OAuth auth/remove-auth controls for compatible servers.
5) Add tests for server CRUD and status persistence.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- endpoint usage map
- UI flows added
- test coverage
```

---

## Packet 09: Permissions Parity (Default/Full/Custom)

### Objective
Add codex-like permission presets and a proper custom config editor mapped to OpenCode permission schema.

### Existing Baseline
- Permissions screen currently exposes per-tool allow/ask/deny selectors:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-permissions.tsx`
- Permission schema supports wildcard and object rules:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/config/config.ts`

### Implementation Scope
1. Add preset modes:
   - default permissions
   - full access
   - custom (config.toml-backed)
2. Display active mode near session footer/status area.
3. Build custom rules editor:
   - schema-aware form
   - advanced raw TOML editor
   - validation and preview
4. Map preset selection to OpenCode permission config deterministically.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/settings-permissions.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-settings.tsx`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/session/*` (mode chip in footer)
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/config/config.ts`
- Add helper module for preset maps and validation.

### Acceptance Criteria
1. Users can switch preset modes in one click.
2. Custom mode edits are validated before apply.
3. Runtime behavior follows selected mode.
4. UI clearly shows current permission mode.

### Copy-paste Handoff Prompt
```text
Implement Packet 09 in /Users/abhi/proj/personal/opencode-desktop.

Goal: permissions parity with default/full/custom presets + config.toml editor.

Baseline:
- settings-permissions currently only has per-tool dropdowns.
- permission schema in config.ts supports rich rules.

Tasks:
1) Add preset selector UI and persisted mode state.
2) Implement deterministic mapping from presets to permission rules.
3) Add custom editor (form + raw toml) with schema validation and diff preview.
4) Show active permission mode in session UI.
5) Add tests for mode mapping and apply/rollback behavior.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit

Return:
- preset mapping table
- editor UX summary
- tests
```

---

## Packet 10: Environments and Worktrees Parity

### Objective
Ship dedicated environments/worktrees screens with full lifecycle actions and startup command templates.

### Existing Baseline
- Worktree API endpoints exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/experimental.ts`
- Sidebar already supports workspace reset/delete flows:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout.tsx`
- Project edit dialog has startup command field:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-edit-project.tsx`

### Implementation Scope
1. Add dedicated settings sections/screens:
   - environments
   - worktrees
2. Add lifecycle actions:
   - create
   - reset
   - remove
   - open
3. Add startup command templates and validation.
4. Keep sidebar/workspace list consistent with settings actions.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/dialog-settings.tsx`
- New settings components for environments/worktrees.
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/layout.tsx` (shared state hooks)
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/experimental.ts` (if endpoint gaps)
- Tests in workspaces/sidebar e2e suites.

### Acceptance Criteria
1. Worktree lifecycle actions are accessible outside sidebar.
2. Startup command templates can be created and reused.
3. State remains consistent after create/reset/remove actions.

### Copy-paste Handoff Prompt
```text
Implement Packet 10 in /Users/abhi/proj/personal/opencode-desktop.

Goal: environments/worktrees parity screens + lifecycle actions + startup command templates.

Baseline:
- worktree APIs exist in experimental routes
- sidebar has partial lifecycle actions

Tasks:
1) Add settings pages for environments and worktrees.
2) Wire create/reset/remove/open actions to backend.
3) Add startup command template management with validation.
4) Ensure sidebar and settings stay in sync.
5) Add tests for lifecycle and consistency.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- bun --cwd packages/app test:e2e --reporter=line --grep "workspace|project-edit"

Return:
- lifecycle UX implemented
- template model
- tests
```

---

## Packet 11: Run/Preview Parity + Open-In Integrations

### Objective
Add project run profiles, output pane with diagnostics/rerun, and codex-like open-in integrations across OSes.

### Existing Baseline
- Open-in app detection and open-path are implemented in session header:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/session/session-header.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src/index.tsx`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/src/lib.rs`
- Missing: first-class run profiles + embedded output/diagnostics panel.

### Implementation Scope
1. Add run profile config per project:
   - build command
   - run command
   - open URL/path command
2. Add run panel:
   - streaming stdout/stderr
   - exit code status
   - diagnostics summary
   - rerun button
3. Add one-click "open in app" from run results.
4. Preserve existing terminal integration.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/session/session-header.tsx`
- New run-profile and run-panel components under `/packages/app/src/components/`
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/layout.tsx` (project metadata)
- `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/src/lib.rs` (spawn/run command API)
- `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src/bindings.ts`
- Tests:
  - app unit tests for profile parsing
  - e2e for run/rerun flow.

### Acceptance Criteria
1. Users can configure and run project profiles in-app.
2. Output pane shows logs and actionable failure diagnostics.
3. Rerun works without re-entering command.
4. Open-in integrations remain functional.

### Copy-paste Handoff Prompt
```text
Implement Packet 11 in /Users/abhi/proj/personal/opencode-desktop.

Goal: run/preview parity: project run profiles + output pane with rerun/diagnostics + open-in integrations.

Baseline:
- open-in menu exists in session-header.tsx.
- no dedicated run profile/output system yet.

Tasks:
1) Add per-project run profile schema and persistence.
2) Build run panel with streaming logs, status, diagnostics, and rerun.
3) Add backend desktop command execution bridge if missing.
4) Add tests for profile persistence and run lifecycle.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- e2e run-panel flow

Return:
- profile schema
- run panel behavior
- tests
```

---

## Packet 12: Git Commit + PR Parity

### Objective
Implement staged/unstaged commit UX, commit assistant, and `gh` PR flow with base/head and dry-run validation.

### Existing Baseline
- File status endpoint exists:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/file.ts`
- No full codex-like commit/PR UI flow currently in app.

### Implementation Scope
1. Add commit panel:
   - changed files list
   - staged/unstaged controls
   - stage all / unstage all
2. Add commit assistant for message drafting.
3. Add PR flow via `gh`:
   - base/head selection
   - title/body preview
   - dry-run validation output
4. Require explicit confirmation for destructive git actions.

### Files To Modify
- New git/PR UI components under `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/components/`
- Session page integration under `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/session/*`
- Backend endpoints in `/Users/abhi/proj/personal/opencode-desktop/packages/opencode/src/server/routes/*` for stage/commit/pr commands (if absent).
- Desktop command bridge additions for safe `gh` invocation if needed.
- Tests for git state transitions and PR command handling.

### Acceptance Criteria
1. Users can stage/unstage and commit entirely in UI.
2. PR creation flow validates before execution and reports failures clearly.
3. Destructive actions require explicit user confirmation.

### Copy-paste Handoff Prompt
```text
Implement Packet 12 in /Users/abhi/proj/personal/opencode-desktop.

Goal: git/PR parity: staged/unstaged commit UX + commit assistant + gh PR flow with dry-run.

Baseline:
- file status API exists, but no full commit/PR surface.

Tasks:
1) Build commit panel with staged/unstaged controls.
2) Add commit message assistant and commit execution.
3) Add PR creator using gh (base/head selection, preview, dry-run validation).
4) Add explicit confirmation guards on destructive git actions.
5) Add tests for commit and PR flow, including failure diagnostics.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- e2e flow for commit+PR (mock gh where needed)

Return:
- UX flow implemented
- backend command contracts
- tests
```

---

## Packet 13: Production Control Plane (Convex + Better Auth + Polar + Daytona)

### Objective
Replace scaffolded in-memory control plane with production stack for auth, entitlements, remote orchestration, and automation execution.

### Existing Baseline
- Current control plane is local in-memory scaffolding:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/store.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/api.ts`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/client.ts`

### Implementation Scope
1. Introduce persistent backend:
   - Convex data models/actions
   - Better Auth session identity
2. Integrate Polar entitlements:
   - checkout
   - webhooks
   - entitlement projection
3. Integrate Daytona remote session provision/attach.
4. Move automation execution into durable scheduler/worker.
5. Keep existing contract types stable unless versioned migration is added.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/*` (full replacement/refactor)
- New backend deployment package if separated.
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/context/opencodex.tsx` (auth/session tokens)
- Infra/deploy configuration files.

### Acceptance Criteria
1. Entitlements are durable and webhook-driven.
2. Remote session lifecycle is real (no stub tokens).
3. Automation jobs run on schedule with persisted status.
4. API auth is enforced and user-scoped.

### Copy-paste Handoff Prompt
```text
Implement Packet 13 in /Users/abhi/proj/personal/opencode-desktop.

Goal: production control plane with Convex + Better Auth + Polar + Daytona.

Baseline:
- control-plane package is currently in-memory scaffold.

Tasks:
1) Replace in-memory store with persistent backend (Convex).
2) Add Better Auth handlers and secure user identity propagation.
3) Integrate Polar entitlement checks + webhook reconciliation.
4) Integrate Daytona remote session start/attach.
5) Implement durable automation scheduler/executor and status tracking.
6) Keep API contracts stable or provide migration notes.

Verification:
- typecheck for app/control-plane packages
- integration tests for entitlement + remote start + automation run

Return:
- architecture diagram in text
- endpoint contract changes
- migration steps
- test evidence
```

---

## Packet 14: Cross-Device Sync + Transcript Policy + Mobile Remote UX

### Objective
Deliver cloud sync/transcript persistence policy and remote-only mobile UX with push notifications.

### Existing Baseline
- Transcript sync endpoints exist in scaffold:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/opencodex-control-plane/src/api.ts`
- Mobile runtime strategy is decided (remote-only) but not productized.

### Implementation Scope
1. Define transcript policy:
   - full storage in managed mode
   - retention/deletion controls
   - project-scoped access rules
2. Implement cross-device sync:
   - session list/thread continuity
   - read/unread and archived states
3. Build mobile-adapted session/thread/diff layouts.
4. Add push notifications:
   - permission prompts
   - automation completion
   - run completion
5. Enforce mobile remote-only execution.

### Files To Modify
- Mobile targets under `/Users/abhi/proj/personal/opencode-desktop/packages/desktop` (Tauri mobile support)
- Shared app layout components under `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/pages/*`
- Control-plane transcript/session sync APIs and client integration.
- Notification bridges in desktop/mobile platform adapters.

### Acceptance Criteria
1. Desktop and mobile show same sessions and transcripts for same account.
2. Mobile can attach remote session, prompt, and review diffs.
3. Push notifications are actionable and deep-link correctly.
4. No local-shell execution on mobile.

### Copy-paste Handoff Prompt
```text
Implement Packet 14 in /Users/abhi/proj/personal/opencode-desktop.

Goal: cross-device cloud sync + transcript persistence policies + mobile remote-only UX + push notifications.

Tasks:
1) Define and implement transcript retention/access policy for managed mode.
2) Build cloud sync state for threads/sessions/archive metadata.
3) Implement mobile-optimized layouts for thread list, prompt dock, and diff view.
4) Add push notifications and deep links for key events.
5) Enforce remote-only mode on mobile runtime.

Constraints:
- preserve shared component reuse where practical.

Verification:
- typecheck
- integration tests for transcript sync and mobile attach flows

Return:
- policy decisions encoded in code/docs
- mobile UX behaviors
- test evidence
```

---

## Packet 15: Release Engineering and Distribution

### Objective
Ship signed desktop installers + mobile store pipelines + updater/signing/notarization workflows.

### Existing Baseline
- Extensive CI exists under `.github/workflows`, including desktop publish paths:
  - `/Users/abhi/proj/personal/opencode-desktop/.github/workflows/publish.yml`
- Desktop Tauri configs already exist:
  - `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/tauri.conf.json`
  - `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/tauri.prod.conf.json`
- Mobile store pipeline for OpenCodex branding/distribution is not complete.

### Implementation Scope
1. Desktop artifacts:
   - macOS notarized DMG
   - Windows installer
   - Linux deb/rpm/AppImage
2. Mobile artifacts:
   - iOS TestFlight/App Store
   - Android Play Store + APK
3. Signing, key management, updater channel wiring.
4. Release metadata automation and rollback process docs.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/.github/workflows/*` (new/updated workflows)
- `/Users/abhi/proj/personal/opencode-desktop/packages/desktop/src-tauri/*` build configs
- Release scripts under `/Users/abhi/proj/personal/opencode-desktop/script/*`
- Documentation in `/Users/abhi/proj/personal/opencode-desktop/docs/*`

### Acceptance Criteria
1. CI produces signed artifacts for all desktop targets.
2. Mobile builds are store-upload ready.
3. Auto-update works with signed metadata.
4. Recovery docs exist for failed signing/notarization runs.

### Copy-paste Handoff Prompt
```text
Implement Packet 15 in /Users/abhi/proj/personal/opencode-desktop.

Goal: release engineering parity for desktop + mobile stores, with signing/notarization/updater.

Baseline:
- publish workflows already exist for desktop, but need OpenCodex parity completion and mobile store path.

Tasks:
1) Audit and extend workflows for complete target matrix.
2) Ensure signing/notarization variables and steps are wired/documented.
3) Add mobile build/upload pipelines and release docs.
4) Validate updater metadata generation and signature verification.

Verification:
- CI dry-runs where possible
- local lint/typecheck for workflow scripts/configs

Return:
- workflow diff summary
- required secrets/vars list
- operator runbook link/path
```

---

## Packet 16: Acceptance, Performance, Security Matrix

### Objective
Implement the full acceptance/perf/security matrix from the plan as executable automated checks and dashboards.

### Existing Baseline
- Unit/e2e test infrastructure already exists in app package.
- No consolidated parity acceptance harness for SLA and security checks.

### Implementation Scope
1. Encode acceptance items as automated tests/checks:
   - sync SLA (2s)
   - multi-thread concurrency
   - offline/reconnect recovery
   - permissions correctness
2. Add performance benchmarks:
   - initial load < 2.5s
   - thread switch < 300ms median
3. Add security checks:
   - no plaintext provider keys/tokens in logs
   - permission bypass tests
4. Publish a single acceptance report artifact in CI.

### Files To Modify
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/e2e/*` (new parity specs)
- `/Users/abhi/proj/personal/opencode-desktop/packages/app/src/*test.ts` (unit-level checks)
- `.github/workflows/test.yml` and/or dedicated parity workflow.
- Add benchmark harness and fixtures under `script/` or `packages/app/e2e`.

### Acceptance Criteria
1. Each plan acceptance line maps to a test/check.
2. CI emits pass/fail report with timings.
3. Security checks fail build on secret leakage or permission bypass.

### Copy-paste Handoff Prompt
```text
Implement Packet 16 in /Users/abhi/proj/personal/opencode-desktop.

Goal: acceptance/perf/security matrix as automated, CI-enforced checks.

Tasks:
1) Translate each roadmap acceptance requirement into test cases.
2) Add performance measurement harness for load and thread switch latency.
3) Add secret-safety and permission bypass tests.
4) Produce a CI report artifact summarizing pass/fail and timing metrics.

Verification:
- bun turbo typecheck
- bun --cwd packages/app test:unit
- bun --cwd packages/app test:e2e --reporter=line
- parity CI workflow run

Return:
- matrix table requirement->test mapping
- benchmark outputs
- CI artifact path/details
```

---

## Recommended Execution Order
1. Packet 01
2. Packet 03
3. Packet 04
4. Packet 05
5. Packet 06
6. Packet 07
7. Packet 08
8. Packet 09
9. Packet 10
10. Packet 11
11. Packet 12
12. Packet 02
13. Packet 13
14. Packet 14
15. Packet 15
16. Packet 16

Reason:
- Early packets improve desktop UX parity quickly.
- Mid packets complete operational parity.
- Later packets depend on control-plane maturity and release infrastructure.
