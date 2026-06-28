---
name: stack-react
description: "Use for React components, hooks, JSX structure, props typing, component boundaries, and React-specific implementation decisions."
---

# React Stack

- Use functional components and hooks.
- Keep components props-driven when possible.
- Move complex calculations out of JSX into named variables, hooks, or helpers.
- Prefer local component state before context or external state managers.
- Use effects only for synchronization with external systems.
- Do not add `useMemo` or `useCallback` by default; use them for clear correctness or performance reasons.
- Keep component files cohesive and easy to navigate.
