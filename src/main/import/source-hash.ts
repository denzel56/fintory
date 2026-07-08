import { createHash } from 'node:crypto'
import type { TransactionDraft } from './transaction-draft.js'

export const sourceHashVersion = 'source-hash-v1'

export type SourceHashInput = {
  readonly adapterId: string
  readonly draft: TransactionDraft
  readonly duplicateIndex: number
}

export type TransactionSourceHash = {
  readonly draft: TransactionDraft
  readonly sourceHash: string
}

type SourceHashPayload = {
  readonly adapterId: string
  readonly amountMinor: number
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDraft['direction']
  readonly duplicateIndex: number
  readonly merchant: string | null
  readonly transactionDate: string
  readonly version: typeof sourceHashVersion
}

const getSourceHashPayload = ({
  adapterId,
  draft,
  duplicateIndex,
}: SourceHashInput): SourceHashPayload => ({
  adapterId,
  amountMinor: draft.amountMinor,
  currency: draft.currency,
  description: draft.description,
  direction: draft.direction,
  duplicateIndex,
  merchant: draft.merchant,
  transactionDate: draft.transactionDate,
  version: sourceHashVersion,
})

const serializeSourceHashDuplicateKey = (payload: SourceHashPayload): string =>
  JSON.stringify([
    payload.version,
    payload.adapterId,
    payload.transactionDate,
    payload.amountMinor,
    payload.currency,
    payload.direction,
    payload.description,
    payload.merchant,
  ])

const serializeSourceHashPayload = (payload: SourceHashPayload): string =>
  JSON.stringify([
    payload.version,
    payload.adapterId,
    payload.transactionDate,
    payload.amountMinor,
    payload.currency,
    payload.direction,
    payload.description,
    payload.merchant,
    payload.duplicateIndex,
  ])

export const createTransactionSourceHash = (input: SourceHashInput): string => {
  const payload = getSourceHashPayload(input)
  const serializedPayload = serializeSourceHashPayload(payload)
  const digest = createHash('sha256').update(serializedPayload, 'utf8').digest('hex')

  return `${sourceHashVersion}:${digest}`
}

export const createTransactionSourceHashes = (
  adapterId: string,
  drafts: readonly TransactionDraft[],
): readonly TransactionSourceHash[] => {
  const duplicateCounts = new Map<string, number>()

  return drafts.map((draft) => {
    const basePayload = getSourceHashPayload({ adapterId, draft, duplicateIndex: 0 })
    const duplicateKey = serializeSourceHashDuplicateKey(basePayload)
    const duplicateIndex = duplicateCounts.get(duplicateKey) ?? 0

    duplicateCounts.set(duplicateKey, duplicateIndex + 1)

    return {
      draft,
      sourceHash: createTransactionSourceHash({ adapterId, draft, duplicateIndex }),
    }
  })
}
