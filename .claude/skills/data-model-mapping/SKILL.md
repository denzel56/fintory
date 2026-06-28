---
name: data-model-mapping
description: "Use when transforming CSV, database, API, or external input into internal Fintory domain models."
---

# Data Model Mapping

- Keep raw input types separate from validated DTOs and domain models.
- Normalize dates, money, identifiers, and optional fields at boundaries.
- Choose `null` vs `undefined` deliberately and consistently.
- Keep parser functions small and deterministic.
- Preserve raw source data only when useful for audit, debugging, or re-import.
- Do not let UI components depend directly on unstable external formats.
