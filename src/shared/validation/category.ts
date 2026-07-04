import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  UpdateCategoryInput,
} from '../types/category.js'

type ValidationResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly code: CategoryValidationErrorCode; readonly message: string }

export type CategoryValidationErrorCode =
  | 'invalid-category-color'
  | 'invalid-category-id'
  | 'invalid-category-name'

const categoryNameMaxLength = 80
const categoryIdMaxLength = 120
const hexColorPattern = /^#[0-9a-fA-F]{6}$/

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const validateCategoryName = (value: unknown): ValidationResult<string> => {
  if (typeof value !== 'string') {
    return {
      ok: false,
      code: 'invalid-category-name',
      message: 'Category name is required.',
    }
  }

  const trimmedName = value.trim()

  if (trimmedName.length === 0) {
    return {
      ok: false,
      code: 'invalid-category-name',
      message: 'Category name is required.',
    }
  }

  if (trimmedName.length > categoryNameMaxLength) {
    return {
      ok: false,
      code: 'invalid-category-name',
      message: `Category name must be ${categoryNameMaxLength} characters or less.`,
    }
  }

  return { ok: true, value: trimmedName }
}

const validateCategoryColor = (value: unknown): ValidationResult<string> => {
  if (typeof value !== 'string' || !hexColorPattern.test(value)) {
    return {
      ok: false,
      code: 'invalid-category-color',
      message: 'Category color must be a hex color like #228be6.',
    }
  }

  return { ok: true, value: value.toLowerCase() }
}

const validateCategoryId = (value: unknown): ValidationResult<string> => {
  if (typeof value !== 'string') {
    return {
      ok: false,
      code: 'invalid-category-id',
      message: 'Category id is required.',
    }
  }

  const trimmedId = value.trim()

  if (trimmedId.length === 0 || trimmedId.length > categoryIdMaxLength) {
    return {
      ok: false,
      code: 'invalid-category-id',
      message: 'Category id is invalid.',
    }
  }

  return { ok: true, value: trimmedId }
}

export function validateCreateCategoryInput(
  input: unknown,
): ValidationResult<CreateCategoryInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid-category-name',
      message: 'Category input is invalid.',
    }
  }

  const nameResult = validateCategoryName(input.name)

  if (!nameResult.ok) {
    return nameResult
  }

  const colorResult = validateCategoryColor(input.color)

  if (!colorResult.ok) {
    return colorResult
  }

  return {
    ok: true,
    value: {
      color: colorResult.value,
      name: nameResult.value,
    },
  }
}

export function validateUpdateCategoryInput(
  input: unknown,
): ValidationResult<UpdateCategoryInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid-category-id',
      message: 'Category input is invalid.',
    }
  }

  const idResult = validateCategoryId(input.id)

  if (!idResult.ok) {
    return idResult
  }

  const nameResult = validateCategoryName(input.name)

  if (!nameResult.ok) {
    return nameResult
  }

  const colorResult = validateCategoryColor(input.color)

  if (!colorResult.ok) {
    return colorResult
  }

  return {
    ok: true,
    value: {
      color: colorResult.value,
      id: idResult.value,
      name: nameResult.value,
    },
  }
}

export function validateDeleteCategoryInput(
  input: unknown,
): ValidationResult<DeleteCategoryInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: 'invalid-category-id',
      message: 'Category input is invalid.',
    }
  }

  const idResult = validateCategoryId(input.id)

  if (!idResult.ok) {
    return idResult
  }

  return { ok: true, value: { id: idResult.value } }
}
