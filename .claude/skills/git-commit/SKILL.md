---
name: git-commit
description: "Use when preparing or creating Fintory commits. Covers staging, commit message style, secret/privacy checks, and focused commit boundaries."
---

# Git Commit

## Before Commit

- Inspect `git status`.
- Inspect unstaged and staged diffs.
- Inspect recent commit style with `git log --oneline -10`.
- Confirm the diff belongs to the current logical phase.
- Check for secrets, tokens, credentials, debug logs, local paths, generated noise, and unrelated files.
- Check that real bank CSV files, real financial data, and local SQLite databases are not committed.

## Staging

- Stage only files that belong to the completed phase.
- Do not stage unrelated user changes.
- If changes in a file are mixed between current and unrelated work, stop and ask the user how to proceed.

## Message Style

Use the repository's existing commit style. If none exists, use conventional commits:

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

Keep messages specific and behavior-oriented.
