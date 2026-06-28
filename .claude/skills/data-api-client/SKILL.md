---
name: data-api-client
description: "Use for future API-driven projects. In Fintory MVP, avoid API clients unless explicitly required because the product is local-first."
---

# API Client Data

- Type request parameters and responses explicitly.
- Keep API DTOs separate from internal domain models.
- Centralize base URL, auth headers, and common error handling.
- Handle loading, error, empty, and retry states deliberately.
- Do not swallow errors silently unless the product explicitly requires it.
- Avoid leaking secrets into client-side bundles or logs.
- For Fintory MVP, do not introduce API integrations unless the requirement explicitly changes.
