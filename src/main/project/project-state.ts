import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  CloseProjectResult,
  CurrentProjectDto,
  CurrentProjectStateDto,
  ProjectId,
} from '../../shared/types/project.js'
import {
  closeActiveProjectDatabaseConnection,
  openProjectDatabaseConnection,
} from '../db/project-database-connection.js'

type CurrentProjectRecord = {
  filePath: string
  project: CurrentProjectDto
}

let currentProject: CurrentProjectRecord | null = null

export function getCurrentProjectState(): CurrentProjectStateDto {
  if (!currentProject) {
    return { status: 'none' }
  }

  return { status: 'open', project: currentProject.project }
}

export function openCurrentProject(input: {
  filePath: string
  name: string
}): CurrentProjectDto {
  const closeResult = closeCurrentProject()

  if (!closeResult.ok) {
    throw new Error('Current project could not be closed before opening another project.')
  }

  openProjectDatabaseConnection(input.filePath)

  const project: CurrentProjectDto = {
    id: randomUUID(),
    display: {
      fileName: path.basename(input.filePath),
      locationLabel: null,
    },
    name: input.name,
    openedAt: new Date().toISOString(),
  }

  currentProject = {
    filePath: input.filePath,
    project,
  }

  return project
}

export function closeCurrentProject(): CloseProjectResult {
  const previousProjectId: ProjectId | null = currentProject?.project.id ?? null

  try {
    closeActiveProjectDatabaseConnection()
  } catch {
    return {
      ok: false,
      code: 'project-close-failed',
      message: 'Project database connection could not be closed.',
    }
  }

  currentProject = null

  return { ok: true, previousProjectId }
}

export function getProjectNameFromFilePath(filePath: string): string {
  const fileName = path.basename(filePath)

  if (fileName.endsWith('.fintory.sqlite')) {
    return fileName.slice(0, -'.fintory.sqlite'.length)
  }

  return path.basename(fileName, path.extname(fileName))
}

export function getProjectDefaultFileName(projectName: string): string {
  const safeName = Array.from(projectName.replace(/[<>:"/\\|?*]/g, '-'))
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .trim()
  const fileName = safeName.length > 0 ? safeName : 'Fintory Project'

  return `${fileName}.fintory.sqlite`
}
