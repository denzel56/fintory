import { createHash } from 'node:crypto'
import type { TransactionDraft } from './transaction-draft.js'

export const sourceHashVersion = 'source-hash-v1'

export type SourceHashInput = {
  readonly adapterId: string
  readonly draft: TransactionDraft
}

type SourceHashPayload = {
  readonly adapterId: string
  readonly amountMinor: number
  readonly currency: string
  readonly description: string
  readonly direction: TransactionDraft['direction']
  readonly merchant: string | null
  readonly transactionDate: string
  readonly version: typeof sourceHashVersion
}

const getSourceHashPayload = ({ adapterId, draft }: SourceHashInput): SourceHashPayload => ({
  adapterId,
  amountMinor: draft.amountMinor,
  currency: draft.currency,
  description: draft.description,
  direction: draft.direction,
  merchant: draft.merchant,
  transactionDate: draft.transactionDate,
  version: sourceHashVersion,
})

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
  ])

export const createTransactionSourceHash = (input: SourceHashInput): string => {
  const payload = getSourceHashPayload(input)
  const serializedPayload = serializeSourceHashPayload(payload)
  const digest = createHash('sha256').update(serializedPayload, 'utf8').digest('hex')

  return `${sourceHashVersion}:${digest}`
}
