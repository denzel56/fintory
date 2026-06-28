---
name: stack-vue-state
description: "Use for Vue state decisions in Fintory: local refs/reactive, computed state, composables, Pinia, filters, search, sorting, and database state."
---

# Vue State

- Prefer local `ref`, `reactive`, and `computed` for local UI state.
- Use composables for reusable stateful logic.
- Use Pinia only when state is shared across screens or complex enough to justify it.
- Keep database data separate from local UI state.
- Use URL state for shareable filters and navigation state when appropriate.
- Keep transaction filters, search, sorting, and date ranges explicit and easy to reset.
