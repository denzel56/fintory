# Practice: refactor manual CSV mapping flow

Practice focus: React refactoring for a multi-step import form.

## Tasks

1. Extract the manual mapping card from `ImportPage` into a props-driven component.
2. Move manual mapping validation into a small renderer helper with focused tests or examples.
3. Split preview state and import state so loading/error messages are easier to follow.
4. Keep all filesystem and CSV parsing behind `window.fintory.import.*`; do not add Node, SQLite, or raw IPC access in React.
5. Verify the refactor with `npm run lint`, `npm run build`, and a manual import of a sanitized unknown CSV.
