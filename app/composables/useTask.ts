export const useTask = () => {
  const { $apiFetchSafe } = useNuxtApp()
  const auth = useAuth({ required: true })
  const activeTaskId = useState<string | null>('active-task-id', () => null)

  function updateTaskContext(response: TaskResponse) {
    const status: string = response.status
    if (status === 'ok') {
      activeTaskId.value = null
    } else if (
      status === 'needs_clarification'
      || status === 'need_clarification'
      || status === 'candidates'
      || status === 'update_candidates'
    ) {
      activeTaskId.value = response.task_id
    }
  }

  async function processText(text: string): Promise<StoreResponse<TaskResponse>> {
    const result = await $apiFetchSafe<TaskResponse>('/api/task', {
      method: 'POST',
      retry: 0,
      body: {
        ...(activeTaskId.value ? { task_id: activeTaskId.value } : {}),
        text,
        user_id: auth.user.value.id,
      } satisfies TaskTextRequest,
    })
    if (result.ok) updateTaskContext(result.data)
    return result
  }

  async function processAudio(file: File): Promise<StoreResponse<TaskResponse>> {
    const body = new FormData()
    body.append('user_id', auth.user.value.id)
    if (activeTaskId.value) body.append('task_id', activeTaskId.value)
    body.append('file', file)

    const result = await $apiFetchSafe<TaskResponse>('/api/task', {
      method: 'POST',
      retry: 0,
      body,
    })
    if (result.ok) updateTaskContext(result.data)
    return result
  }

  return {
    processText,
    processAudio,
    activeTaskId,
  }
}
