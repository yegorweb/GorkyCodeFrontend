export const useTask = () => {
  const { $apiFetchSafe } = useNuxtApp()
  const auth = useAuth({ required: true })
  const activeTaskId = useState<string | null>('active-task-id', () => null)

  function updateTaskContext(response: TaskResponse) {
    const taskId = response && typeof response === 'object' && 'task_id' in response
      ? response.task_id
      : null
    activeTaskId.value = typeof taskId === 'string' && taskId.length > 0
      ? taskId
      : null
  }

  function startNewChat() {
    activeTaskId.value = null
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

  async function listTasks(filters: TasksListFilters = {}): Promise<StoreResponse<TasksListResponse>> {
    return $apiFetchSafe<TasksListResponse>('/api/v1/tasks', {
      query: filters,
    })
  }

  return {
    processText,
    processAudio,
    listTasks,
    startNewChat,
    activeTaskId,
  }
}
