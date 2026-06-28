# Fintory Claude Setup

Этот набор настроен под `Fintory` и одновременно сохраняет два возможных frontend-направления:

- `React + Mantine`
- `Vue 3 + PrimeVue`

Сами agents/skills написаны на английском. Этот README оставлен на русском как краткая навигация.

## Рекомендуемый стек для Fintory

Если Mantine важен для UI, основной кандидат:

```text
Electron + React + TypeScript + Mantine + SQLite
```

Vue-набор оставлен для экспериментов и знакомства с Vue:

```text
Electron + Vue 3 + TypeScript + PrimeVue + SQLite
```

## Как выбирать агентов

- Планирование: `arch`
- React-реализация: `coder-react`
- Vue-реализация: `coder-vue`
- React-ревью: `reviewer-react`
- Vue-ревью: `reviewer-vue`
- Диагностика без правок: `debug`
- Быстрый фикс React: `debug-fix-react`
- Быстрый фикс Vue: `debug-fix-vue`
- Коммит после завершенной фазы: `committer`
- Анализ git без изменений: `git-helper`

## Git workflow

Для нетривиальных задач используем phase-by-phase commits:

```text
arch → coder-react phase 1 → committer → coder-react phase 2 → committer → reviewer-react
```

или для Vue:

```text
arch → coder-vue phase 1 → committer → coder-vue phase 2 → committer → reviewer-vue
```

`coder-*` не коммитит напрямую. После завершения логического шага он должен выдать `PHASE COMPLETE: <phase name>`, после чего запускается `committer`.

## Ключевые Fintory skills

- `domain-fintory` — продуктовые правила из README.
- `domain-fintory-csv-import` — CSV import pipeline.
- `domain-fintory-privacy-security` — privacy/local-first ограничения.
- `platform-electron` — Electron security and IPC.
- `data-sqlite` — SQLite schema, migrations, repositories.
- `data-model-mapping` — raw input -> domain model.
- `git-workflow` — phase-by-phase commits.
- `git-commit` — focused commit rules.
- `git-review` — diff review before commit.

## Переиспользуемый шаблон

Общий набор для будущих проектов сохранен отдельно:

```text
C:\Users\golod\projects\claude-reusable-kit
```
