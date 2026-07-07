import assert from 'node:assert/strict'
import { genericCsvImportAdapter } from '../dist-electron/main/import/adapters/generic-csv-import-adapter.js'
import { parseCsvText } from '../dist-electron/main/import/csv-parser.js'

const validCsv = 'date,description,amount,currency\n2026-07-01,Coffee,-12.50,usd\n2026-07-02,Salary,5000,EUR\n'
const validResult = genericCsvImportAdapter.normalizeRows(parseCsvText(validCsv))

assert.equal(validResult.adapterId, 'generic-signed-amount-v1')
assert.deepEqual(validResult.errors, [])
assert.equal(validResult.drafts.length, 2)
assert.deepEqual(validResult.drafts[0], {
  amountMinor: 1250,
  currency: 'USD',
  description: 'Coffee',
  direction: 'expense',
  merchant: null,
  rawDescription: 'Coffee',
  rowNumber: 2,
  transactionDate: '2026-07-01',
})
assert.deepEqual(validResult.drafts[1], {
  amountMinor: 500000,
  currency: 'EUR',
  description: 'Salary',
  direction: 'income',
  merchant: null,
  rawDescription: 'Salary',
  rowNumber: 3,
  transactionDate: '2026-07-02',
})

const missingColumnCsv = 'date,description,amount\n2026-07-01,Coffee,-12.50\n'
const missingColumnResult = genericCsvImportAdapter.normalizeRows(parseCsvText(missingColumnCsv))

assert.equal(missingColumnResult.drafts.length, 0)
assert.deepEqual(
  missingColumnResult.errors.map((error) => error.code),
  ['missing-required-column'],
)
assert.equal(missingColumnResult.errors[0]?.columnName, 'currency')

const invalidRowsCsv = 'date,description,amount,currency\n2026-02-30,Coffee,-12.50,USD\n2026-07-02,Salary,1.234,EUR\n2026-07-03,Groceries,-10,US\n'
const invalidRowsResult = genericCsvImportAdapter.normalizeRows(parseCsvText(invalidRowsCsv))

assert.equal(invalidRowsResult.drafts.length, 0)
assert.deepEqual(
  invalidRowsResult.errors.map((error) => error.code),
  ['invalid-date', 'invalid-amount', 'invalid-currency'],
)
assert.deepEqual(
  invalidRowsResult.errors.map((error) => error.rowNumber),
  [2, 3, 4],
)

const malformedParserCsv = 'date,description,amount,currency\n2026-07-01,"Unclosed description,-12.50,USD\n2026-07-02,Salary,5000,EUR\n'
const malformedParserResult = genericCsvImportAdapter.normalizeRows(parseCsvText(malformedParserCsv))

assert.equal(malformedParserResult.drafts.length, 0)
assert.deepEqual(
  malformedParserResult.errors.map((error) => error.code),
  ['malformed-csv-row', 'malformed-csv-row'],
)
assert.deepEqual(
  malformedParserResult.errors.map((error) => error.rowNumber),
  [2, 2],
)
