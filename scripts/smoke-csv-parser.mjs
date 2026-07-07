import assert from 'node:assert/strict'
import { parseCsvText } from '../dist-electron/main/import/csv-parser.js'

const validCsv = 'Date,Description,Amount\n2026-07-01,"Coffee, beans",-1250\n2026-07-02,"Escaped ""quote""",5000\n'
const validResult = parseCsvText(validCsv)

assert.equal(validResult.encoding, 'utf8')
assert.deepEqual(validResult.headers, ['Date', 'Description', 'Amount'])
assert.deepEqual(validResult.errors, [])
assert.equal(validResult.rows.length, 2)
assert.deepEqual(validResult.rows[0], {
  rowNumber: 2,
  values: {
    Amount: '-1250',
    Date: '2026-07-01',
    Description: 'Coffee, beans',
  },
})
assert.equal(validResult.rows[1]?.values.Description, 'Escaped "quote"')

const malformedCsv = 'Date,Description,Amount\n2026-07-01,"Unclosed description,-1250\n2026-07-02,Salary,5000,extra\n'
const malformedResult = parseCsvText(malformedCsv)

assert.equal(malformedResult.rows.length, 0)
assert.deepEqual(
  malformedResult.errors.map((error) => error.code),
  ['unclosed-quoted-field', 'column-count-mismatch'],
)
assert.equal(malformedResult.errors[0]?.rowNumber, 2)
assert.equal(malformedResult.errors[1]?.rowNumber, 2)

const singleColumnMalformedCsv = 'Description\n"Unclosed description'
const singleColumnMalformedResult = parseCsvText(singleColumnMalformedCsv)

assert.equal(singleColumnMalformedResult.rows.length, 0)
assert.deepEqual(
  singleColumnMalformedResult.errors.map((error) => error.code),
  ['unclosed-quoted-field'],
)
