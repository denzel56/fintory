import { readFile } from 'node:fs/promises'

export type CsvEncoding = 'utf8'

export type CsvParseErrorCode =
  | 'column-count-mismatch'
  | 'duplicate-header'
  | 'empty-file'
  | 'empty-header'
  | 'unclosed-quoted-field'

export type CsvParseOptions = {
  /**
   * MVP CSV imports are read as UTF-8. Other bank encodings should be handled explicitly
   * when a concrete adapter requires them.
   */
  readonly encoding?: CsvEncoding
}

export type CsvParseError = {
  readonly code: CsvParseErrorCode
  readonly columnNumber?: number
  readonly expectedColumnCount?: number
  readonly message: string
  readonly receivedColumnCount?: number
  readonly rowNumber: number
}

export type ParsedCsvRow = {
  readonly rowNumber: number
  readonly values: Readonly<Record<string, string>>
}

export type CsvParseResult = {
  readonly encoding: CsvEncoding
  readonly errors: readonly CsvParseError[]
  readonly headers: readonly string[]
  readonly rows: readonly ParsedCsvRow[]
}

type CsvRecord = {
  readonly fields: readonly string[]
  readonly rowNumber: number
}

type TokenizeCsvResult = {
  readonly errors: readonly CsvParseError[]
  readonly records: readonly CsvRecord[]
}

const defaultEncoding: CsvEncoding = 'utf8'

const createError = (
  code: CsvParseErrorCode,
  rowNumber: number,
  message: string,
  details: Omit<CsvParseError, 'code' | 'message' | 'rowNumber'> = {},
): CsvParseError => ({
  code,
  message,
  rowNumber,
  ...details,
})

const isBlankRecord = (fields: readonly string[]): boolean =>
  fields.every((field) => field.length === 0)

const getHeaderKeys = (
  headers: readonly string[],
): { readonly errors: readonly CsvParseError[]; readonly keys: readonly string[] } => {
  const errors: CsvParseError[] = []
  const headerCounts = new Map<string, number>()
  const keys = headers.map((header, index) => {
    if (header.length === 0) {
      errors.push(
        createError('empty-header', 1, 'CSV headers must not be empty.', {
          columnNumber: index + 1,
        }),
      )
    }

    const previousCount = headerCounts.get(header) ?? 0
    const nextCount = previousCount + 1
    headerCounts.set(header, nextCount)

    if (previousCount > 0) {
      errors.push(
        createError('duplicate-header', 1, 'CSV headers must be unique.', {
          columnNumber: index + 1,
        }),
      )
    }

    return previousCount === 0 ? header : `${header}#${nextCount}`
  })

  return { errors, keys }
}

const mapRowValues = (
  headerKeys: readonly string[],
  fields: readonly string[],
): Readonly<Record<string, string>> => {
  const values: Record<string, string> = {}

  for (const [index, headerKey] of headerKeys.entries()) {
    values[headerKey] = fields[index] ?? ''
  }

  return values
}

const pushRecord = (
  records: CsvRecord[],
  fields: readonly string[],
  rowNumber: number,
): void => {
  if (!isBlankRecord(fields)) {
    records.push({ fields: [...fields], rowNumber })
  }
}

const tokenizeCsv = (csvText: string): TokenizeCsvResult => {
  const errors: CsvParseError[] = []
  const records: CsvRecord[] = []
  const fields: string[] = []
  let field = ''
  let isQuoted = false
  let rowNumber = 1
  let recordStartRowNumber = 1

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (isQuoted) {
      if (character === '"' && nextCharacter === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        isQuoted = false
      } else {
        if (character === '\n') {
          rowNumber += 1
        }

        field += character
      }
    } else if (character === '"' && field.length === 0) {
      isQuoted = true
    } else if (character === ',') {
      fields.push(field)
      field = ''
    } else if (character === '\n') {
      fields.push(field)
      pushRecord(records, fields, recordStartRowNumber)
      fields.length = 0
      field = ''
      rowNumber += 1
      recordStartRowNumber = rowNumber
    } else if (character === '\r' && nextCharacter === '\n') {
      continue
    } else {
      field += character
    }
  }

  if (isQuoted) {
    errors.push(
      createError(
        'unclosed-quoted-field',
        recordStartRowNumber,
        'CSV row has a quoted field that is not closed.',
      ),
    )
  }

  fields.push(field)
  pushRecord(records, fields, recordStartRowNumber)

  return { errors, records }
}

export const parseCsvText = (
  csvText: string,
  options: CsvParseOptions = {},
): CsvParseResult => {
  const encoding = options.encoding ?? defaultEncoding
  const tokenizedCsv = tokenizeCsv(csvText)
  const [headerRecord, ...dataRecords] = tokenizedCsv.records

  if (!headerRecord) {
    return {
      encoding,
      errors: [
        ...tokenizedCsv.errors,
        createError('empty-file', 1, 'CSV input must include a header row.'),
      ],
      headers: [],
      rows: [],
    }
  }

  const { errors: headerErrors, keys: headerKeys } = getHeaderKeys(headerRecord.fields)
  const rows = dataRecords.map((record) => ({
    rowNumber: record.rowNumber,
    values: mapRowValues(headerKeys, record.fields),
  }))
  const rowErrors = dataRecords.flatMap((record) => {
    if (record.fields.length === headerRecord.fields.length) {
      return []
    }

    return [
      createError(
        'column-count-mismatch',
        record.rowNumber,
        'CSV row has a different number of columns than the header row.',
        {
          expectedColumnCount: headerRecord.fields.length,
          receivedColumnCount: record.fields.length,
        },
      ),
    ]
  })

  return {
    encoding,
    errors: [...tokenizedCsv.errors, ...headerErrors, ...rowErrors],
    headers: headerRecord.fields,
    rows,
  }
}

export const parseCsvFile = async (
  filePath: string,
  options: CsvParseOptions = {},
): Promise<CsvParseResult> => {
  const encoding = options.encoding ?? defaultEncoding
  const csvText = await readFile(filePath, { encoding })

  return parseCsvText(csvText, { encoding })
}
