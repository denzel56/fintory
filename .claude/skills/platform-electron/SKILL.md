---
name: platform-electron
description: "Use for Electron architecture in Fintory: main/preload/renderer boundaries, IPC, file access, packaging, and desktop security."
---

# Electron Platform

- Keep `main`, `preload`, and `renderer` responsibilities separate.
- Expose renderer capabilities through a narrow, typed preload bridge.
- Keep `contextIsolation` enabled and `nodeIntegration` disabled.
- Never expose raw Node.js APIs directly to the renderer.
- Validate all IPC inputs in the main process.
- Keep file system access explicit and user-initiated when possible.
- Avoid logging sensitive local financial data.
- Treat Electron security defaults as requirements, not suggestions.
