import type {
  CloseProjectResult,
  CreateProjectInput,
  CreateProjectResult,
  CurrentProjectStateDto,
  OpenProjectResult,
} from '../types/project.js'

export const projectIpcChannels = {
  close: 'project:close',
  create: 'project:create',
  getCurrent: 'project:getCurrent',
  open: 'project:open',
} as const

export type ProjectApi = {
  close: () => Promise<CloseProjectResult>
  create: (input: CreateProjectInput) => Promise<CreateProjectResult>
  getCurrent: () => Promise<CurrentProjectStateDto>
  open: () => Promise<OpenProjectResult>
}
