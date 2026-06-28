---
name: domain-fintory-privacy-security
description: "Required for Fintory work touching financial data, files, imports, storage, logging, network behavior, or Electron security."
---

# Fintory Privacy And Security

- Financial data must never leave the user's machine unless the user explicitly requests an export or integration in a future requirement.
- Do not add telemetry, analytics, crash reporting, cloud sync, or hidden network calls.
- Do not log raw transactions, account numbers, file contents, or sensitive import data.
- Keep local files under user-selected paths or application data directories.
- Validate file paths and IPC inputs.
- Treat CSV files as untrusted input.
- Avoid unsafe HTML rendering.
- Keep Electron renderer isolated from direct Node.js access.
