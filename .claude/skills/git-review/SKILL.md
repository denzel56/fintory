---
name: git-review
description: "Use before committing or merging Fintory changes. Reviews diffs for scope, accidental changes, privacy risks, and verification gaps."
---

# Git Review

## Diff Review Checklist

- Does the diff match the completed phase?
- Are there unrelated files or unrelated edits?
- Are there secrets, credentials, `.env` files, tokens, or local machine paths?
- Are real bank CSV files, local SQLite databases, screenshots with financial data, or imported financial records present?
- Are generated files expected and necessary?
- Are lockfile changes expected?
- Were available checks run, or is there a clear reason they were skipped?
- Is the commit small enough to review and revert independently?

## Stop Conditions

Stop and ask the user before committing if:

- Unrelated changes are present.
- The same file contains mixed unrelated edits.
- Secrets or local credentials appear in the diff.
- Real financial data appears in the diff.
- The phase is incomplete.
- Required checks fail and the user did not approve committing anyway.
