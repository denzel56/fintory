# Fintory

> **Fintory** is a local desktop application for building and exploring your personal financial history.

## Vision

Fintory is **not** another budgeting app.

It is a desktop application that allows users to import bank CSV exports, build a local financial archive, and quickly answer questions about their spending over months or years.

The application is designed for people who:

* don't want to record every expense manually;
* don't want to connect bank APIs;
* don't want to upload financial data to the cloud;
* simply want fast insights from existing bank statements.

The primary goal is to transform raw CSV exports into meaningful financial information in less than a minute.

---

# Core Principles

## Local First

All user data stays on the user's computer.

No cloud.

No synchronization.

No telemetry.

No bank integrations.

---

## Privacy

The user owns their data.

The application never requires internet access to function.

---

## Simplicity

Every feature must support the primary workflow.

Avoid unnecessary complexity.

If a feature does not help users understand their financial history, it probably does not belong in the MVP.

---

## User Workflow

The expected workflow is:

1. Create a project.
2. Import one or more CSV files exported from a bank.
3. Transactions are stored locally.
4. The user explores their financial history.
5. Later, the user imports newer CSV files.
6. Existing data is preserved and duplicates are avoided.

---

# Target Users

People who:

* periodically review their finances;
* use one or multiple banks;
* prefer local software;
* dislike subscriptions;
* don't want to maintain daily expense tracking.

---

# What Fintory IS

* Local financial archive
* CSV importer
* Spending explorer
* Financial history viewer
* Analytics tool

---

# What Fintory is NOT

* Daily budgeting application
* Accounting software
* Cloud service
* Bank API client
* Investment tracker
* AI financial advisor
* Personal finance coach

---

# MVP Goals

The MVP should provide only the essential functionality.

## Projects

Users can create projects containing their financial history.

Example:

* Personal
* Family

---

## CSV Import

Support importing one or more CSV files.

CSV files are selected from the UI, but file reading, parsing, duplicate
detection, and SQLite writes are handled by Node.js in the Electron main
process through a narrow preload/IPC bridge. The React renderer must not access
raw Node.js APIs, filesystem paths, CSV contents, or SQLite directly.

Requirements:

* import multiple files
* preserve import history
* avoid duplicate transactions
* support future bank formats

---

## Local Storage

Store everything in SQLite.

Nothing leaves the user's computer.

---

## Transactions

Display all imported transactions.

Support:

* search
* sorting
* filtering
* date range
* categories

---

## Categories

Basic editable transaction categories.

Manual editing is sufficient for MVP.

Automatic rules can be implemented later.

---

## Analytics

Basic dashboards:

* expenses by month
* expenses by category
* income
* largest expenses

The goal is fast understanding, not advanced accounting.

---

# Future Features (NOT MVP)

Possible future improvements:

* category rules
* automatic transaction classification
* transfer detection
* saved filters
* report export
* multiple bank templates

The following are intentionally out of scope:

* bank APIs
* cloud sync
* mobile application
* AI analysis
* budgets
* investments
* loans
* subscriptions

---

# Technical Direction

Current planned stack:

* Electron
* React
* TypeScript
* SQLite
* Prisma (or Drizzle after evaluation)

Architecture should remain modular and easy to maintain.

Electron architecture should keep `main`, `preload`, and `renderer`
responsibilities separate. Node.js-only work such as filesystem access, CSV
loading/parsing, duplicate detection, and SQLite persistence belongs in the
Electron main process. React should only render UI and call typed preload/IPC
methods.

---

# Development Principles

Every implementation should prioritize:

* readability
* maintainability
* simplicity
* strong typing
* modular architecture

Avoid premature optimization.

Avoid unnecessary abstractions.

Keep the codebase easy to understand.

---

# Git Workflow

Development follows a feature branch workflow.

Each feature:

Issue

↓

Feature Branch

↓

Implementation

↓

Self Review

↓

Manual Review

↓

Merge into main

No direct commits to the main branch.

---

# AI Assistant Guidelines

When contributing to this project:

* understand the existing architecture before making changes;
* avoid introducing unnecessary dependencies;
* prefer simple solutions over clever ones;
* keep changes small and focused;
* never implement features outside the current task;
* always preserve Local First and Privacy principles;
* suggest improvements when appropriate, but do not change project direction.

When uncertain, ask rather than assume.

---

# Success Criteria

The MVP is successful if a user can:

* import several years of CSV exports;
* build a persistent local archive;
* reopen the project later;
* import new transactions without duplicates;
* understand where their money went in less than one minute.
