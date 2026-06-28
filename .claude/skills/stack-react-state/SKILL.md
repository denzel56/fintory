---
name: stack-react-state
description: "Use for React state decisions in Fintory: local state, context, URL state, local database state, filters, search, sorting, and external stores."
---

# React State

- Use local state for local UI concerns.
- Use URL state for shareable filters, search, and navigation state when appropriate.
- Use context for stable cross-tree dependencies, not frequent high-volume updates.
- Add external stores only when state is genuinely shared and complex.
- Keep database data separate from local UI state.
- Keep transaction filters, search, sorting, and date ranges explicit and easy to reset.
