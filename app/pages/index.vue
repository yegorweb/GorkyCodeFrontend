<script setup lang="ts">
import { mdiAccount, mdiCog, mdiLogout } from '@mdi/js'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'error' | 'pending'
  text: string
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
const messages = ref<ChatMessage[]>([])
const busy = ref(false)
let nextMessageId = 0

const queryValue = route.query.google
const googleResult = Array.isArray(queryValue) ? queryValue[0] : queryValue
const calendarStatus = await googleCalendar.getStatus()

if (!calendarStatus.ok) {
  toast.error(generateErrorMessage(calendarStatus))
} else {
  if (googleResult === 'connected' && calendarStatus.data.connected) {
    toast.success('Google Calendar подключён')
  }

  // showCalendarDialog.value = googleResult === 'error' || !calendarStatus.data.connected
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
</script>

<template>
  <div class="header">
    <v-container class="header-content d-flex align-center justify-space-between pt-0 pb-0">
      <div class="d-flex align-center ga-3">
        <v-avatar class="bg-primary" size="34">
          <v-icon :icon="mdiAccount" />
        </v-avatar>
        <span class="font-weight-medium">{{ auth.user.value.name }}</span>
        <v-btn
          :icon="mdiLogout"
          aria-label="Выйти"
          variant="text"
          color="on-surface"
          size="small"
          @click="auth.logout"
        />
      </div>
      <v-btn
        :icon="mdiCog"
        aria-label="Настройки"
        variant="text"
        color="on-surface"
        @click="settingsOpen = true"
      />
    </v-container>
  </div>

  <v-container class="chat-shell">
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
          {{ message.text }}
        </div>
        <div
          v-else-if="message.role === 'error'"
          class="message-bubble message-bubble--error rounded-lg"
        >
          {{ message.text }}
        </div>
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

  <v-dialog
    v-model="showCalendarDialog"
    persistent
    max-width="360"
  >
    <v-card class="w-100 rounded-lg bg-surface">
      <v-card-title class="text-center pt-6">
        Google Calendar
      </v-card-title>
      <GoogleCalendarConnect :callback-result="route.query.google?.toString()" />
      <v-card-actions class="justify-center pb-5">
        <v-btn
          :prepend-icon="mdiLogout"
          variant="text"
          @click="auth.logout"
        >
          Выйти
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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

.chat-shell {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 60px);
  padding-top: 0;
  padding-bottom: 0;
}

.chat-messages {
  display: flex;
  flex: 1;
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
.message-row--pending {
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
