import type { CreateProjectInput } from '../types/project.js'

export const projectNameRules = {
  maxLength: 80,
} as const

export type ProjectNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string }

export type CreateProjectInputValidationResult =
  | { ok: true; value: CreateProjectInput }
  | { ok: false; message: string }

export function validateProjectName(name: unknown): ProjectNameValidationResult {
  if (typeof name !== 'string') {
    return { ok: false, message: 'Project name is required.' }
  }

  const trimmedName = name.trim()

  if (trimmedName.length === 0) {
    return { ok: false, message: 'Project name is required.' }
  }

  if (trimmedName.length > projectNameRules.maxLength) {
    return {
      ok: false,
      message: `Project name must be ${projectNameRules.maxLength} characters or fewer.`,
    }
  }

  return { ok: true, value: trimmedName }
}

export function validateCreateProjectInput(input: unknown): CreateProjectInputValidationResult {
  if (!isObjectRecord(input)) {
    return { ok: false, message: 'Project input is invalid.' }
  }

  const nameResult = validateProjectName(input.name)

  if (!nameResult.ok) {
    return nameResult
  }

  return { ok: true, value: { name: nameResult.value } }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'name' in value
}
