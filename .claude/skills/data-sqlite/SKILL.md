---
name: data-sqlite
description: "Use when designing or modifying SQLite schemas, migrations, repositories, transactions, indexes, or local persistence logic in Fintory."
---

# SQLite Data

- Design schema around durable domain concepts, not UI screens.
- Use migrations for schema changes.
- Add indexes for common filters and joins.
- Use transactions for multi-step writes that must stay consistent.
- Keep SQL parameterized; never concatenate untrusted input into SQL.
- Make imports idempotent where possible.
- Keep repository/data-access code separate from UI components.
- Preserve import history and support duplicate detection.
