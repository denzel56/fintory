---
name: domain-fintory-csv-import
description: "Required for Fintory CSV import work: bank adapters, parsing, normalization, import batches, duplicate detection, malformed rows, and future bank formats."
---

# Fintory CSV Import

## Pipeline

1. Read the selected CSV file with explicit encoding handling.
2. Detect or select the bank/import format.
3. Parse rows into a raw row representation.
4. Validate required columns.
5. Normalize into domain transactions.
6. Detect duplicates before writing.
7. Write an import batch and transactions in one transaction.
8. Report imported, skipped duplicate, and malformed row counts.

## Rules

- Keep bank-specific parsing in adapters.
- Preserve import history.
- Make repeated imports safe and idempotent.
- Normalize money, dates, descriptions, account identifiers, and transaction direction at the boundary.
- Do not discard malformed rows silently.
- Design for future bank formats without overengineering the first version.
