---
name: git-workflow
description: "Use for Fintory Git workflow decisions: feature branches, phase-by-phase commits, safe command usage, and repository hygiene."
---

# Git Workflow

## Phase Commit Workflow

For non-trivial tasks, split implementation into logical phases. Each phase should be independently reviewable and commit-worthy.

Recommended flow:

1. `arch` creates a phased plan.
2. `coder-react` or `coder-vue` implements one phase.
3. Checks are run when available.
4. `committer` reviews the diff and creates one commit for that phase.
5. Repeat for the next phase.
6. `reviewer-react` or `reviewer-vue` performs final review across the branch.

## Rules

- Commit after a completed logical phase, not after every small edit.
- Keep commits focused and reversible.
- Do not mix unrelated concerns in one commit.
- Inspect `git status`, `git diff`, and recent history before committing.
- Never discard user changes without explicit approval.
- Avoid destructive commands unless the user explicitly requested them and the risk is clear.
