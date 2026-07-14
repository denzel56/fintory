import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { ManualCsvColumnMapping, ManualCsvDateFormat } from '../../../shared/types/import.js'

export type CsvMappingProfileRecord = {
  readonly createdAt: string
  readonly headerFingerprint: string
  readonly headers: readonly string[]
  readonly id: string
  readonly mapping: ManualCsvColumnMapping
  readonly name: string
  readonly updatedAt: string
}

export type NewCsvMappingProfileRecord = {
  readonly createdAt: string
  readonly headers: readonly string[]
  readonly id: string
  readonly mapping: ManualCsvColumnMapping
  readonly name: string
  readonly updatedAt: string
}

export type CsvMappingProfilesRepository = {
  readonly count: () => number
  readonly create: (profile: NewCsvMappingProfileRecord) => CsvMappingProfileRecord
  readonly findByHeaderFingerprint: (headerFingerprint: string) => readonly CsvMappingProfileRecord[]
  readonly findByHeaders: (headers: readonly string[]) => readonly CsvMappingProfileRecord[]
  readonly findById: (id: string) => CsvMappingProfileRecord | null
  readonly list: () => readonly CsvMappingProfileRecord[]
}

type CsvMappingProfileRow = {
  readonly created_at: string
  readonly header_fingerprint: string
  readonly headers_json: string
  readonly id: string
  readonly mapping_json: string
  readonly name: string
  readonly updated_at: string
}

const manualDateFormats = new Set<ManualCsvDateFormat>([
  'dd.mm.yyyy',
  'mm/dd/yyyy',
  'yyyy-mm-dd',
])

const normalizeHeaderForFingerprint = (header: string): string => header.trim().toLowerCase()

export const createCsvHeaderFingerprint = (headers: readonly string[]): string => {
  const payload = JSON.stringify(headers.map(normalizeHeaderForFingerprint))
  const digest = createHash('sha256').update(payload, 'utf8').digest('hex')

  return `csv-headers-v1:${digest}`
}

const isStringArray = (value: unknown): value is readonly string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

const isManualCsvColumnMapping = (value: unknown): value is ManualCsvColumnMapping => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const mapping = value as Partial<Record<keyof ManualCsvColumnMapping, unknown>>

  return (
    typeof mapping.amountColumn === 'string' &&
    typeof mapping.dateColumn === 'string' &&
    typeof mapping.descriptionColumn === 'string' &&
    (mapping.currencyColumn === undefined || typeof mapping.currencyColumn === 'string') &&
    (mapping.fixedCurrency === undefined || typeof mapping.fixedCurrency === 'string') &&
    (mapping.dateFormat === undefined || manualDateFormats.has(mapping.dateFormat as ManualCsvDateFormat))
  )
}

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const mapCsvMappingProfileRow = (row: CsvMappingProfileRow): CsvMappingProfileRecord => {
  const headers = parseJson(row.headers_json)
  const mapping = parseJson(row.mapping_json)

  if (!isStringArray(headers) || !isManualCsvColumnMapping(mapping)) {
    throw new Error('CSV mapping profile record is invalid.')
  }

  return {
    createdAt: row.created_at,
    headerFingerprint: row.header_fingerprint,
    headers,
    id: row.id,
    mapping,
    name: row.name,
    updatedAt: row.updated_at,
  }
}

export function createCsvMappingProfilesRepository(
  database: DatabaseSync,
): CsvMappingProfilesRepository {
  return {
    count: () => {
      const row = database.prepare('SELECT COUNT(*) AS count FROM csv_mapping_profiles').get() as
        | { count: number }
        | undefined

      return row?.count ?? 0
    },
    create: (profile) => {
      const headerFingerprint = createCsvHeaderFingerprint(profile.headers)

      database
        .prepare(
          `INSERT INTO csv_mapping_profiles (
            id,
            name,
            header_fingerprint,
            headers_json,
            mapping_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          profile.id,
          profile.name,
          headerFingerprint,
          JSON.stringify(profile.headers),
          JSON.stringify(profile.mapping),
          profile.createdAt,
          profile.updatedAt,
        )

      const createdProfile = database
        .prepare('SELECT * FROM csv_mapping_profiles WHERE id = ?')
        .get(profile.id) as CsvMappingProfileRow | undefined

      if (!createdProfile) {
        throw new Error('Created CSV mapping profile could not be loaded.')
      }

      return mapCsvMappingProfileRow(createdProfile)
    },
    findByHeaderFingerprint: (headerFingerprint) => {
      const rows = database
        .prepare(
          `SELECT * FROM csv_mapping_profiles
           WHERE header_fingerprint = ?
           ORDER BY updated_at DESC, name COLLATE NOCASE ASC, id ASC`,
        )
        .all(headerFingerprint) as CsvMappingProfileRow[]

      return rows.map(mapCsvMappingProfileRow)
    },
    findByHeaders: (headers) => {
      return createCsvMappingProfilesRepository(database).findByHeaderFingerprint(
        createCsvHeaderFingerprint(headers),
      )
    },
    findById: (id) => {
      const row = database.prepare('SELECT * FROM csv_mapping_profiles WHERE id = ?').get(id) as
        | CsvMappingProfileRow
        | undefined

      return row ? mapCsvMappingProfileRow(row) : null
    },
    list: () => {
      const rows = database
        .prepare('SELECT * FROM csv_mapping_profiles ORDER BY updated_at DESC, name COLLATE NOCASE ASC, id ASC')
        .all() as CsvMappingProfileRow[]

      return rows.map(mapCsvMappingProfileRow)
    },
  }
}
