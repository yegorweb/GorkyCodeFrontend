export const useNotifications = (
  onNotification: (notification: CalendarNotification) => void | Promise<void>,
  onError: (message: string) => void,
) => {
  const auth = useAuth({ required: true })
  const config = useRuntimeConfig()
  const seenNotificationIds = new Set<string>()
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectAttempt = 0
  let stopped = false
  let authorized = false

  function isCalendarNotification(value: unknown): value is CalendarNotification {
    if (!value || typeof value !== 'object') return false
    if (
      !('id' in value)
      || typeof value.id !== 'string'
      || !('kind' in value)
      || !['task_due', 'reminder_due', 'meeting_start'].includes(String(value.kind))
      || !('task_id' in value)
      || typeof value.task_id !== 'string'
      || !('title' in value)
      || typeof value.title !== 'string'
      || !('message' in value)
      || typeof value.message !== 'string'
      || !('scheduled_at' in value)
      || typeof value.scheduled_at !== 'string'
      || !('created_at' in value)
      || typeof value.created_at !== 'string'
    ) {
      return false
    }

    return true
  }

  function getSocketUrl(): string {
    const apiBase = config.public.apiBase || window.location.origin
    const url = new URL(apiBase.endsWith('/') ? apiBase : `${apiBase}/`)
    const basePath = url.pathname.replace(/\/+$/, '')
    url.pathname = `${basePath}/api/v1/notifications/ws`
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }

  function sendAck(notificationId: string) {
    if (socket?.readyState !== WebSocket.OPEN || !authorized) return

    const message: NotificationAckMessage = {
      type: 'ack',
      notification_id: notificationId,
    }
    try {
      socket.send(JSON.stringify(message))
    } catch {
      onError('Не удалось подтвердить получение напоминания')
    }
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return
    const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, delay)
  }

  function connect() {
    if (stopped || !auth.accessToken.value) return

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }

    authorized = false
    let currentSocket: WebSocket
    try {
      currentSocket = new WebSocket(getSocketUrl())
    } catch {
      onError('Не удалось подключиться к серверу уведомлений')
      scheduleReconnect()
      return
    }
    socket = currentSocket

    currentSocket.addEventListener('open', () => {
      if (currentSocket !== socket) return
      const message: NotificationAuthMessage = {
        type: 'auth',
        token: auth.accessToken.value,
      }
      try {
        currentSocket.send(JSON.stringify(message))
      } catch {
        onError('Не удалось авторизоваться на сервере уведомлений')
        currentSocket.close()
      }
    })

    currentSocket.addEventListener('message', async (event: MessageEvent<string>) => {
      if (currentSocket !== socket || typeof event.data !== 'string') return

      let payload: unknown
      try {
        payload = JSON.parse(event.data)
      } catch {
        onError('Сервер уведомлений прислал некорректное сообщение')
        return
      }

      if (!payload || typeof payload !== 'object' || !('type' in payload)) {
        onError('Сервер уведомлений прислал сообщение неизвестного формата')
        return
      }

      if (payload.type === 'ready') {
        if (!('user_id' in payload) || typeof payload.user_id !== 'string') {
          onError('Сервер уведомлений прислал некорректное подтверждение авторизации')
          return
        }
        authorized = true
        reconnectAttempt = 0
        return
      }

      if (payload.type === 'notification' && 'notification' in payload) {
        if (!authorized || !isCalendarNotification(payload.notification)) {
          onError('Сервер уведомлений прислал уведомление некорректного формата')
          return
        }

        if (!seenNotificationIds.has(payload.notification.id)) {
          try {
            await onNotification(payload.notification)
            seenNotificationIds.add(payload.notification.id)
          } catch {
            onError('Не удалось показать напоминание')
            return
          }
        }
        sendAck(payload.notification.id)
        return
      }

      if (payload.type === 'error' && 'message' in payload && typeof payload.message === 'string') {
        if ('code' in payload && typeof payload.code === 'string') {
          onError(payload.message)
        } else {
          onError('Сервер уведомлений прислал ошибку неизвестного формата')
        }
        return
      }

      onError('Сервер уведомлений прислал сообщение неизвестного типа')
    })

    currentSocket.addEventListener('close', event => {
      if (currentSocket !== socket) return
      socket = null
      authorized = false

      if (event.code === 4401) {
        onError('Сессия уведомлений истекла. Войдите в приложение снова.')
      } else if ([1006, 1012, 1013].includes(event.code)) {
        scheduleReconnect()
      }
    })
  }

  onMounted(connect)
  watch(auth.accessToken, () => {
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, 'Access token changed')
    }
    if (!stopped) connect()
  })

  onBeforeUnmount(() => {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close(1000, 'Page unmounted')
  })
}
