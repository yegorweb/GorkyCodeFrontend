import type { components, operations } from './backend-addition'

declare global {
  type TasksListFilters = Omit<
    NonNullable<operations['listTasks']['parameters']['query']>,
    'limit' | 'offset'
  >
  type TasksListResponse = {
    status: 'ok'
    user_id?: string
    task_id?: string
    message?: string
    data: {
      items: TaskItem[]
    }
  }
  type CalendarNotification = components['schemas']['Notification']
  type NotificationAuthMessage = components['schemas']['AuthMessage']
  type NotificationAckMessage = components['schemas']['AckMessage']
}

export {
  CalendarNotification,
  NotificationAckMessage,
  NotificationAuthMessage,
  TasksListFilters,
  TasksListResponse,
}
