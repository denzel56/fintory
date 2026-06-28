---
name: platform-web
description: "Use if Fintory or a future app has browser-only web behavior, API-driven UIs, routing, auth/session behavior, or deployment assumptions."
---

# Web Platform

- Browser code must not depend on Node.js APIs.
- Keep environment variables explicit and never expose secrets to the client bundle.
- Handle loading, empty, and error states for networked UI.
- Keep routing predictable and deep-link friendly.
- Treat authorization as server-enforced; client checks are only UX.
- Avoid hidden network calls and unexpected telemetry.
