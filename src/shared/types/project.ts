export type ProjectId = string

export type ProjectSafeDisplayInfo = {
  fileName: string | null
  locationLabel: string | null
}

export type CurrentProjectDto = {
  id: ProjectId
  name: string
  display: ProjectSafeDisplayInfo
  openedAt: string
}

export type CurrentProjectStateDto =
  | { status: 'none' }
  | { status: 'open'; project: CurrentProjectDto }

export type CreateProjectInput = {
  name: string
}

export type CreateProjectResult =
  | { ok: true; project: CurrentProjectDto }
  | { ok: false; code: ProjectErrorCode; message: string }

export type OpenProjectResult =
  | { ok: true; project: CurrentProjectDto }
  | { ok: false; code: ProjectErrorCode; message: string }

export type CloseProjectResult =
  | { ok: true; previousProjectId: ProjectId | null }
  | { ok: false; code: ProjectErrorCode; message: string }

export type ProjectErrorCode =
  | 'invalid-project-name'
  | 'project-not-found'
  | 'project-open-failed'
  | 'project-close-failed'
