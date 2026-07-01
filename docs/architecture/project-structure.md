# Fintory Project Structure

Fintory is a local-first Electron, React, and TypeScript desktop application.
The project uses a lightweight feature-oriented structure while keeping Electron
process boundaries explicit.

## Folder Structure

```txt
src/
  main/          Electron main process: windows, dialogs, IPC handlers, local persistence
  preload/       narrow typed bridge exposed with contextBridge
  shared/        process-safe contracts, DTOs, validation, IPC channel definitions
  renderer/
    app/         app root, app shell, navigation config, provider wiring
    pages/       route/page-level screens only
    features/    user workflows and domain UI slices
    shared/      renderer-only reusable UI, hooks, formatting helpers
```

## Dependency Rules

- `src/main` may use Electron main-process APIs, Node.js APIs, filesystem access,
  local SQLite modules, and other local persistence utilities.
- `src/preload` exposes a narrow typed API to the renderer. It should not expose
  raw Node.js, raw Electron APIs, or generic filesystem access.
- `src/shared` must stay safe to import from both main and renderer code. Keep it
  limited to DTOs, validation helpers, IPC channel names, and result types.
- `src/renderer` must not import Node.js, filesystem, SQLite, Electron main APIs,
  or raw `ipcRenderer`.
- Renderer code talks to system behavior only through `window.fintory` typed
  preload capabilities.
- Avoid barrel exports and path aliases until they clearly reduce friction.
- Avoid global state libraries until state is genuinely shared and complex.

## Adding Renderer Pages

Place route-level screens under `src/renderer/pages/<route>/`.

Examples:

```txt
src/renderer/pages/dashboard/DashboardPage.tsx
src/renderer/pages/import/ImportPage.tsx
src/renderer/pages/transactions/TransactionsPage.tsx
src/renderer/pages/categories/CategoriesPage.tsx
src/renderer/pages/about/AboutPage.tsx
```

Pages should compose app layout, feature components, and empty/loading/error
states. They should not own large workflow logic. Tiny page-specific helpers may
stay beside the page.

## Adding Renderer Features

Place user workflows and domain UI slices under `src/renderer/features/<feature>/`.

Examples:

```txt
src/renderer/features/project-lifecycle/ProjectLifecycleCard.tsx
src/renderer/features/csv-import/...
src/renderer/features/transactions/...
src/renderer/features/categories/...
src/renderer/features/analytics/...
```

Keep business logic outside JSX when practical. Prefer local component state
before adding shared state.

## Adding Shared Renderer UI

Place renderer-only reusable components under `src/renderer/shared/`.

Examples:

```txt
src/renderer/shared/ui/PlaceholderPage.tsx
src/renderer/shared/format/...
src/renderer/shared/hooks/...
```

Shared renderer UI should not own domain workflows and should not import from a
feature slice.

## Adding IPC

Use a narrow contract-first flow:

1. Add channel names under `src/shared/ipc/`.
2. Add DTO/result types under `src/shared/types/`.
3. Add validation helpers under `src/shared/validation/` when inputs cross the
   IPC boundary.
4. Register main-process handlers under `src/main/ipc/`.
5. Expose a typed preload method from `src/preload/`.
6. Call the method from renderer code through `window.fintory`.

Main-process handlers must validate untrusted renderer inputs and return typed
results instead of throwing raw errors into the renderer.

## Electron Security And Privacy Rules

- Keep `contextIsolation: true`.
- Keep `nodeIntegration: false`.
- Keep the preload bridge narrow and typed.
- File access must be explicit and user-initiated when possible.
- Do not add telemetry, cloud sync, hidden network behavior, or bank API
  integrations.
- Do not log raw transactions, account numbers, CSV contents, or sensitive local
  file paths.
- Treat CSV files as untrusted input.

## Placement Examples

Project lifecycle:

```txt
src/shared/types/project.ts
src/shared/validation/project.ts
src/shared/ipc/project.ts
src/main/ipc/project.ts
src/main/project/project-state.ts
src/renderer/features/project-lifecycle/ProjectLifecycleCard.tsx
```

CSV import:

```txt
src/shared/types/import.ts
src/shared/ipc/import.ts
src/main/ipc/import.ts
src/main/import/...
src/renderer/features/csv-import/...
src/renderer/pages/import/ImportPage.tsx
```

Transactions:

```txt
src/shared/types/transaction.ts
src/shared/ipc/transaction.ts
src/main/transactions/...
src/renderer/features/transactions/...
src/renderer/pages/transactions/TransactionsPage.tsx
```

Categories:

```txt
src/shared/types/category.ts
src/shared/ipc/category.ts
src/main/categories/...
src/renderer/features/categories/...
src/renderer/pages/categories/CategoriesPage.tsx
```
