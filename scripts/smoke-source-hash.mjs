import assert from 'node:assert/strict'
import {
  createTransactionSourceHash,
  sourceHashVersion,
} from '../dist-electron/main/import/source-hash.js'

const adapterId = 'generic-signed-amount-v1'
const draft = {
  amountMinor: 1250,
  currency: 'USD',
  description: 'Coffee',
  direction: 'expense',
  merchant: null,
  rawDescription: 'Coffee',
  rowNumber: 2,
  transactionDate: '2026-07-01',
}

const firstHash = createTransactionSourceHash({ adapterId, draft })
const secondHash = createTransactionSourceHash({ adapterId, draft: { ...draft, rowNumber: 200 } })
const rawDescriptionChangedHash = createTransactionSourceHash({
  adapterId,
  draft: { ...draft, rawDescription: '  Coffee from bank export  ' },
})

assert.equal(firstHash, secondHash)
assert.equal(firstHash, rawDescriptionChangedHash)
assert.match(firstHash, new RegExp(`^${sourceHashVersion}:[a-f0-9]{64}$`))

const changedDrafts = [
  { ...draft, transactionDate: '2026-07-02' },
  { ...draft, amountMinor: 1251 },
  { ...draft, currency: 'EUR' },
  { ...draft, direction: 'income' },
  { ...draft, description: 'Coffee beans' },
  { ...draft, merchant: 'Coffee Shop' },
]

for (const changedDraft of changedDrafts) {
  assert.notEqual(createTransactionSourceHash({ adapterId, draft: changedDraft }), firstHash)
}

assert.notEqual(
  createTransactionSourceHash({ adapterId: 'different-adapter-v1', draft }),
  firstHash,
)
