import assert from 'node:assert/strict'
import { runCsvImportSmokeCheck } from '../dist-electron/main/import/csv-import-smoke.js'

const result = await runCsvImportSmokeCheck()

assert.equal(result.firstImportInsertedCount, 2)
assert.equal(result.firstImportDuplicateCount, 0)
assert.equal(result.firstImportFailedCount, 1)
assert.equal(result.secondImportInsertedCount, 0)
assert.equal(result.secondImportDuplicateCount, 2)
assert.equal(result.secondImportFailedCount, 1)
assert.equal(result.genericManualImportInsertedCount, 0)
assert.equal(result.genericManualImportDuplicateCount, 2)
assert.equal(result.genericManualImportFailedCount, 1)
assert.equal(result.manualPreviewHeaderCount, 4)
assert.equal(result.manualPreviewDescriptionNonEmptyCount, 2)
assert.equal(result.manualPreviewDetectedMappingProfileCount, 1)
assert.equal(result.manualImportInsertedCount, 2)
assert.equal(result.manualImportDuplicateCount, 0)
assert.equal(result.manualImportFailedCount, 0)
assert.equal(result.transactionCount, 4)
assert.equal(result.importBatchCount, 4)
