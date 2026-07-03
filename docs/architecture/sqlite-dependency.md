# SQLite Dependency Decision

Date: 2026-07-03  
Related issue: #19

## Decision

Use Electron's built-in Node.js `node:sqlite` module from main-process code for
the initial Fintory SQLite foundation spike.

## Rationale

- It avoids adding a third-party native dependency before packaging work starts.
- It avoids `electron-rebuild` and native module ABI handling for the first
  database validation step.
- It keeps SQLite access in the Electron main-process layer and does not expose
  database capabilities to the renderer.
- It is enough to validate local SQLite open/query behavior before adding
  migrations, repositories, and project database lifecycle code.

## Constraints

- `node:sqlite` is currently experimental in Node.js, so this decision should be
  revisited before packaging or if Electron's embedded Node support changes.
- Renderer code must not import `node:sqlite` or access SQLite directly.
- Future database files must remain local and user-selected or application-local.
- No cloud database, telemetry, sync service, external financial-data transfer,
  or bank API integration should be introduced.

## Verification

Run the smoke check:

```bash
npm run smoke:sqlite
```

The script compiles Electron TypeScript, launches the Electron binary in
`ELECTRON_RUN_AS_NODE` mode, imports the compiled main-process-compatible smoke
module, creates an in-memory SQLite database, writes a test row, queries it back,
prints the SQLite version, and exits.
