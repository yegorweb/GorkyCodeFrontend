export const useTask = () => {
  const { $apiFetchSafe } = useNuxtApp()
  const auth = useAuth({ required: true })

  function processText(request: Omit<TaskTextRequest, 'user_id'>) {
    return $apiFetchSafe<TaskResponse>('/api/task', {
      method: 'POST',
      retry: 0,
      body: {
        ...request,
        user_id: auth.user.value.id,
      } satisfies TaskTextRequest,
    })
  }

  function processAudio(file: File, taskId?: string) {
    const body = new FormData()
    body.append('user_id', auth.user.value.id)
    if (taskId) body.append('task_id', taskId)
    body.append('file', file)

    return $apiFetchSafe<TaskResponse>('/api/task', {
      method: 'POST',
      retry: 0,
      body,
    })
  }

  return {
    processText,
    processAudio,
  }
}
