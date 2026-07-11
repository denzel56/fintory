# Practice: refactor clear import history flow

Practice focus: React refactoring around a local-first destructive action.

## Tasks

1. Extract the Import History header actions into a small props-driven component.
2. Extract the clear-history confirmation modal into a component with no IPC calls inside it.
3. Refactor ImportPage state names so selection, import, history loading, and clear-history flows are easy to scan.
4. Keep all renderer behavior behind `window.fintory.import.*`; do not add Node, filesystem, SQLite, or raw IPC access.
5. Verify the refactor by running `npm run lint` and `npm run build`.
