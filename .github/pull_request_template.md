## Summary

- 

## Verification

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual check:

## Impact Areas

- [ ] Renderer/UI
- [ ] Electron main/preload/IPC
- [ ] SQLite schema, migrations, or repositories
- [ ] CSV import or bank adapters
- [ ] Privacy/security-sensitive financial data
- [ ] Packaging/build workflow

## Fintory Checklist

- [ ] The change supports the local-first MVP workflow.
- [ ] No cloud sync, telemetry, bank API integration, or hidden network behavior was added.
- [ ] Raw transactions, CSV contents, account data, and private file paths are not logged.
- [ ] Renderer code does not access Node.js, filesystem, or SQLite directly.
- [ ] IPC inputs are validated in the main process where relevant.
- [ ] SQLite writes are transactional where consistency matters.
- [ ] CSV input is treated as untrusted where relevant.

## Notes

- 
