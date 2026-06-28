---
name: core-task-orchestrator
description: "Use first for multi-layer Fintory tasks. Selects the correct platform, data, stack, and domain skills before implementation."
---

# Task Orchestrator

Classify the task before coding.

## Skill Selection

- Fintory product behavior: `domain-fintory`.
- Privacy or financial data: `domain-fintory-privacy-security`.
- CSV import: `domain-fintory-csv-import`.
- Electron behavior: `platform-electron`.
- SQLite or local database: `data-sqlite`.
- Data transformation: `data-model-mapping`.
- React UI: `stack-react`; add `stack-react-mantine`.
- Vue UI: `stack-vue`; add `stack-vue-primevue`.
- Forms: the matching forms skill for the stack.
- Routing: the matching routing skill for the stack.
- Shared state: the matching state skill for the stack.

State the selected skills and why before large implementation work.
