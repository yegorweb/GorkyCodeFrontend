import type { components } from './backend'

declare global {
  type TaskTextRequest = components['schemas']['TaskTextRequest']
  type TaskAudioRequest = components['schemas']['TaskAudioRequest']
  type TaskResponse =
    | components['schemas']['TaskClarificationResponse']
    | components['schemas']['TaskCollectionResponse']
    | components['schemas']['TaskCancelledResponse']
    | components['schemas']['TaskDeleteCandidatesResponse']
    | components['schemas']['TasksDeletedResponse']
    | components['schemas']['FrontendUpdateCandidates']
    | components['schemas']['FrontendUpdated']
    | components['schemas']['TaskCreatedResponse']
  type HealthResponse = components['schemas']['HealthResponse']
}

export { HealthResponse, TaskAudioRequest, TaskResponse, TaskTextRequest }
