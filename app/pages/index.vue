<script setup lang="ts">
import { mdiAccount, mdiCalendarMonth, mdiCog, mdiLogout, mdiPlus, mdiSync } from '@mdi/js'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'error' | 'pending' | 'notification'
  text: string
  response?: TaskResponse
  notification?: CalendarNotification
}

type PromptSubmission =
  | { type: 'text'; text: string }
  | { type: 'audio'; file: File }

definePageMeta({
  auth: true,
})

const auth = useAuth({ required: true })
const route = useRoute()
const googleCalendar = useGoogleCalendar()
const toast = useToast()
const task = useTask()
const showCalendarDialog = ref(false)
const settingsOpen = ref(false)
const tasksDialogOpen = ref(false)
const messages = ref<ChatMessage[]>([])
const busy = ref(false)
let nextMessageId = 0

const queryValue = route.query.google
const googleResult = Array.isArray(queryValue) ? queryValue[0] : queryValue
const calendarDeferredKey = 'gorkycode.google-calendar-deferred'
const calendarStatus = await googleCalendar.getStatus()
const googleCalendarConnected = ref(calendarStatus.ok && calendarStatus.data.connected)

if (!calendarStatus.ok) {
  toast.error(generateErrorMessage(calendarStatus))
} else {
  if (googleResult === 'connected' && calendarStatus.data.connected) {
    toast.success('Google Calendar подключён')
  }

  if (calendarStatus.data.connected) {
    sessionStorage.removeItem(calendarDeferredKey)
  }

  const calendarDeferred = sessionStorage.getItem(calendarDeferredKey) === 'true'
  showCalendarDialog.value = googleResult === 'error'
    || (!calendarDeferred && !calendarStatus.data.connected)
}

async function scrollToLatestMessage() {
  await nextTick()
  const scrollingElement = document.scrollingElement
  if (!scrollingElement) return

  scrollingElement.scrollTo({
    top: scrollingElement.scrollHeight,
    behavior: 'smooth',
  })
}

function getCandidates(response?: TaskResponse): TaskDeleteCandidate[] | undefined {
  if (response?.status === 'candidates') return response.data.candidates
  if (response?.status === 'update_candidates') return response.data.candidates
  return undefined
}

function getCollectionItems(response?: TaskResponse): TaskItem[] | undefined {
  if (!response || response.status !== 'ok' || !('data' in response)) return undefined
  return 'items' in response.data ? response.data.items : undefined
}

function formatRecordDetails(item: TaskItem): string {
  const dateTime = [item.date, item.time].filter(Boolean).join(' · ')
  return [item.record_type, dateTime, item.status].filter(Boolean).join(' · ')
}

function formatTaskList(items: TaskItem[]): string {
  if (items.length === 0) return 'По выбранным фильтрам ничего не нашёл.'

  const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const lines = items.map((item, index) => {
    const date = item.date
      ? dateFormatter.format(new Date(`${item.date}T00:00:00`))
      : ''
    const dateTime = [date, item.time].filter(Boolean).join(', ')
    const status = item.record_type === 'meeting'
      ? item.status === 'completed' ? 'состоялась' : 'запланирована'
      : item.record_type === 'reminder'
        ? item.status === 'completed' ? 'выполнено' : 'активно'
        : item.status === 'completed'
          ? 'выполнена'
          : item.status === 'in_progress'
            ? 'в работе'
            : 'активна'
    const details = [dateTime, status].filter(Boolean).join(' · ')

    return `${index + 1}. ${item.title}${details ? ` — ${details}` : ''}.`
  })

  return `Вот что нашёл:\n\n${lines.join('\n')}`
}

async function showNotification(notification: CalendarNotification) {
  messages.value.push({
    id: nextMessageId++,
    role: 'notification',
    text: notification.message,
    notification,
  })
  await scrollToLatestMessage()
}

function showNotificationError(message: string) {
  messages.value.push({
    id: nextMessageId++,
    role: 'error',
    text: message,
  })
  void scrollToLatestMessage()
}

useNotifications(showNotification, showNotificationError)

async function loadTasks(filters: TasksListFilters) {
  tasksDialogOpen.value = false
  const pendingId = nextMessageId++
  messages.value.push({
    id: pendingId,
    role: 'pending',
    text: '',
  })
  await scrollToLatestMessage()

  const result = await task.listTasks(filters)
  const pendingIndex = messages.value.findIndex(message => message.id === pendingId)

  if (result.ok) {
    messages.value[pendingIndex] = {
      id: pendingId,
      role: 'assistant',
      text: formatTaskList(result.data.data.items),
    }
  } else {
    messages.value[pendingIndex] = {
      id: pendingId,
      role: 'error',
      text: generateErrorMessage(result),
    }
  }

  await scrollToLatestMessage()
}

async function submitPrompt(submission: PromptSubmission) {
  if (busy.value) return

  if (submission.type === 'text') {
    messages.value.push({
      id: nextMessageId++,
      role: 'user',
      text: submission.text,
    })
  }

  const pendingId = nextMessageId++
  messages.value.push({
    id: pendingId,
    role: 'pending',
    text: '',
  })
  busy.value = true
  await scrollToLatestMessage()

  const result = submission.type === 'text'
    ? await task.processText(submission.text)
    : await task.processAudio(submission.file)

  const pendingIndex = messages.value.findIndex(message => message.id === pendingId)
  if (result.ok) {
    messages.value[pendingIndex] = {
      id: pendingId,
      role: 'assistant',
      text: result.data.message,
      response: result.data,
    }
  } else {
    messages.value[pendingIndex] = {
      id: pendingId,
      role: 'error',
      text: generateErrorMessage(result),
    }
  }

  busy.value = false
  await scrollToLatestMessage()
}

function startNewChat() {
  if (busy.value) return

  task.startNewChat()
  messages.value = []
  nextMessageId = 0
}

function closeCalendarDialog() {
  sessionStorage.setItem(calendarDeferredKey, 'true')
  showCalendarDialog.value = false
}
</script>

<template>
  <ClientOnly>
    <div class="chat-page">
      <div class="header">
        <v-container class="header-content d-flex align-center justify-space-between pt-0 pb-0">
          <div class="d-flex align-center ga-3">
            <v-avatar class="bg-primary" size="34">
              <v-icon :icon="mdiAccount" />
            </v-avatar>
            <span style="line-height: 1.1;" class="font-weight-medium">{{ auth.user.value.name }}</span>
            <v-btn
              v-if="!googleCalendarConnected"
              :icon="mdiSync"
              aria-label="Подключить Google Calendar"
              title="Подключить Google Calendar"
              variant="text"
              color="on-surface"
              size="small"
              @click="showCalendarDialog = true"
            />
            <v-btn
              :icon="mdiLogout"
              aria-label="Выйти"
              variant="text"
              color="on-surface"
              size="small"
              @click="auth.logout"
            />
          </div>
          <div class="d-flex align-center">
            <!-- <v-btn
              :icon="mdiPlus"
              aria-label="Новый чат"
              title="Новый чат"
              variant="text"
              color="on-surface"
              :disabled="busy"
              @click="startNewChat"
            /> -->
            <v-btn
              :icon="mdiCalendarMonth"
              aria-label="Мои события"
              title="Мои события"
              variant="text"
              color="on-surface"
              @click="tasksDialogOpen = true"
            />
            <v-btn
              :icon="mdiCog"
              aria-label="Настройки"
              variant="text"
              color="on-surface"
              @click="settingsOpen = true"
            />
          </div>
        </v-container>
      </div>
  
      <v-container
        class="chat-shell"
        :class="{ 'chat-shell--has-messages': messages.length > 0 }"
      >
        <div
          class="chat-messages"
          :class="{ 'chat-messages--empty': messages.length === 0 }"
        >
          <div v-if="messages.length === 0" class="empty-prompt">
            Чем могу помочь?
          </div>
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-row"
            :class="[`message-row--${message.role}`, 'can-touch']"
          >
            <v-card
              v-if="message.role === 'user'"
              class="message-bubble message-bubble--user rounded-lg bg-surface"
            >
              <v-card-text class="message-text">{{ message.text }}</v-card-text>
            </v-card>
            <div
              v-else-if="message.role === 'assistant'"
              class="message-bubble message-bubble--assistant"
            >
              <div>{{ message.text }}</div>
              <v-list
                v-if="getCandidates(message.response)"
                class="response-list"
                bg-color="transparent"
                density="compact"
              >
                <v-list-item
                  v-for="candidate in getCandidates(message.response)"
                  :key="candidate.number"
                  :title="`${candidate.number}. ${candidate.event.title}`"
                  :subtitle="formatRecordDetails(candidate.event)"
                />
                <v-list-item
                  v-if="getCandidates(message.response)?.length === 0"
                  title="Подходящие записи не найдены"
                />
              </v-list>
              <v-list
                v-if="getCollectionItems(message.response)"
                class="response-list"
                bg-color="transparent"
                density="compact"
              >
                <v-list-item
                  v-for="item in getCollectionItems(message.response)"
                  :key="item.id"
                  :title="item.title"
                  :subtitle="formatRecordDetails(item)"
                />
                <v-list-item
                  v-if="getCollectionItems(message.response)?.length === 0"
                  title="Список пуст"
                />
              </v-list>
            </div>
            <div
              v-else-if="message.role === 'error'"
              class="message-bubble message-bubble--error rounded-lg"
            >
              {{ message.text }}
            </div>
            <v-card
              v-else-if="message.role === 'notification'"
              class="message-bubble notification-card rounded-lg bg-surface"
            >
              <v-card-title class="text-body-1 font-weight-medium">
                {{ message.notification?.title }}
              </v-card-title>
              <v-card-text>{{ message.text }}</v-card-text>
            </v-card>
            <div v-else class="message-bubble message-bubble--assistant pending-dots">
              <span>•</span><span>•</span><span>•</span>
            </div>
          </div>
        </div>

        <PromptPanel
          v-model:settings-open="settingsOpen"
          :busy="busy"
          @submit="submitPrompt"
        />
      </v-container>
    </div>
    <TasksFilterDialog
      v-model="tasksDialogOpen"
      @submit="loadTasks"
    />
    <v-dialog
      v-model="showCalendarDialog"
      max-width="360"
    >
      <v-card class="w-100 rounded-lg bg-surface">
        <v-card-title class="text-center pt-6">
          Google Calendar
        </v-card-title>
        <GoogleCalendarConnect
          :callback-result="route.query.google?.toString()"
          @skip="closeCalendarDialog"
        />
      </v-card>
    </v-dialog>
  </ClientOnly>
</template>

<style lang="postcss" scoped>
.header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: rgba(var(--v-theme-background), 0.8);
  box-shadow: 0 4px 20px rgba(var(--v-theme-background), 0.8);
  backdrop-filter: blur(12px);
}

.header-content {
  height: 60px;
}

.chat-page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
}

.header {
  flex: 0 0 60px;
}

.chat-shell {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  min-height: calc(100dvh - 60px);
  box-sizing: border-box;
  padding-top: 0;
  padding-bottom: 0;
}

.chat-shell--has-messages {
  padding-bottom: 190px;
}

.chat-messages {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  gap: 18px;
  padding: 28px 0 12px;
}

.chat-messages--empty {
  justify-content: center;
  align-items: center;
}

.empty-prompt {
  font-size: clamp(1.75rem, 5vw, 2.75rem);
  font-weight: 700;
  text-align: center;
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant,
.message-row--error,
.message-row--pending,
.message-row--notification {
  justify-content: flex-start;
}

.message-bubble {
  width: fit-content;
  max-width: max(80vw, 300px);
  overflow-wrap: anywhere;
}

.message-bubble--user {
  width: fit-content;
}

.message-bubble--assistant {
  padding: 10px 0;
  white-space: pre-wrap;
}

.message-text {
  white-space: pre-wrap;
}

.message-bubble--error {
  padding: 12px 16px;
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.12);
}

.notification-card {
  animation: notification-glow 2.4s ease-in-out infinite;
}

@keyframes notification-glow {
  0%, 100% {
    box-shadow: 0 0 0 rgba(var(--v-theme-primary), 0.1);
  }

  50% {
    box-shadow: 0 0 18px rgba(var(--v-theme-primary), 0.45);
  }
}

.pending-dots {
  display: flex;
  gap: 5px;
  font-size: 1.5rem;
  line-height: 1;
}

.pending-dots span {
  animation: pending-bounce 0.9s infinite ease-in-out;
}

.pending-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.pending-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pending-bounce {
  0%, 60%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-5px);
  }
}
</style>
