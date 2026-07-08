import assert from 'node:assert/strict'
import {
  createTransactionSourceHashes,
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

const firstHash = createTransactionSourceHash({ adapterId, draft, duplicateIndex: 0 })
const secondHash = createTransactionSourceHash({
  adapterId,
  draft: { ...draft, rowNumber: 200 },
  duplicateIndex: 0,
})
const rawDescriptionChangedHash = createTransactionSourceHash({
  adapterId,
  draft: { ...draft, rawDescription: '  Coffee from bank export  ' },
  duplicateIndex: 0,
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
  assert.notEqual(
    createTransactionSourceHash({ adapterId, draft: changedDraft, duplicateIndex: 0 }),
    firstHash,
  )
}

assert.notEqual(
  createTransactionSourceHash({ adapterId: 'different-adapter-v1', draft, duplicateIndex: 0 }),
  firstHash,
)

assert.notEqual(
  createTransactionSourceHash({ adapterId, draft, duplicateIndex: 1 }),
  firstHash,
)

const duplicateDraft = { ...draft, rowNumber: 3 }
const sourceHashes = createTransactionSourceHashes(adapterId, [
  draft,
  duplicateDraft,
  changedDrafts[0],
  draft,
])

assert.equal(sourceHashes.length, 4)
assert.equal(sourceHashes[0].sourceHash, firstHash)
assert.notEqual(sourceHashes[1].sourceHash, firstHash)
assert.equal(
  sourceHashes[1].sourceHash,
  createTransactionSourceHash({ adapterId, draft: duplicateDraft, duplicateIndex: 1 }),
)
assert.equal(
  sourceHashes[2].sourceHash,
  createTransactionSourceHash({ adapterId, draft: changedDrafts[0], duplicateIndex: 0 }),
)
assert.equal(
  sourceHashes[3].sourceHash,
  createTransactionSourceHash({ adapterId, draft, duplicateIndex: 2 }),
)
