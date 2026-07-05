# Backlog

Use this file for follow-up tasks, technical debt, and known issues that should be fixed in future phases but are not part of the current focused task.

When a new non-urgent problem is discovered during implementation or review, add it here with enough context to make it actionable later.

## Open items

### Refactor shared IPC channel constants for preload compatibility

- **Status:** open
- **Priority:** low
- **Area:** Electron preload / IPC architecture
- **Context:** `src/preload/index.cts` duplicates IPC channel strings because Electron sandbox preload must load as CommonJS, while the existing shared IPC modules are emitted as ESM.
- **Risk:** if a channel string changes in `src/shared/ipc/*` but the duplicate preload string is not updated, renderer-to-main IPC calls can break.
- **Future direction:** create one CJS-safe source of truth for IPC channel constants, such as JSON constants, a dedicated CommonJS-compatible constants module, or a bundled preload build. Keep the typed API surface unchanged for renderer code.
- **Verification:** `npm run lint`, `npm run build`, and manual Electron startup confirming `window.fintory` is available.
