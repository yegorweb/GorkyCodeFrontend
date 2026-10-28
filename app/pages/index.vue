<script setup lang="ts">
import { mdiAccount, mdiCog, mdiLogout } from '@mdi/js'

definePageMeta({
  auth: true,
})

const auth = useAuth({ required: true })
const route = useRoute()
const googleCalendar = useGoogleCalendar()
const toast = useToast()
const showCalendarDialog = ref(false)

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
</script>

<template>
  <div class="header">
    <v-container class="header-content d-flex align-center justify-space-between pt-0 pb-0">
      <div class="d-flex align-center ga-3">
        <v-avatar class="bg-primary" size="34">
          <v-icon :icon="mdiAccount" />
        </v-avatar>
        <span style="line-height: 1.1;" class="font-weight-medium">{{ auth.user.value.name }}</span>
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
      />
    </v-container>
  </div>

  <v-container>

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
</style>