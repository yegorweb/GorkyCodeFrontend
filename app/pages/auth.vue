<script setup lang="ts">
type AuthStep = 'login' | 'register' | 'calendar'

useSeoMeta({
  title: 'Вход',
  ogTitle: 'Вход',
})

const auth = useAuth()
const googleCalendar = useGoogleCalendar()
const route = useRoute()
const step = ref<AuthStep>(auth.loggedIn.value ? 'calendar' : 'login')
const error = ref<Extract<StoreResponse<unknown>, { ok: false }> | undefined>()
const loading = ref(false)
const submitted = ref(false)
const showPassword = ref(false)
const calendarStatus = ref<GoogleStatusResponse>()
const calendarLoading = ref(false)
const googleCallbackResult = computed(() => {
  const result = route.query.google
  return Array.isArray(result) ? result[0] : result
})

const redirectTo = computed(() => {
  const queryValue = route.query.redirect
  const value = Array.isArray(queryValue) ? queryValue[0] : queryValue
  return value?.startsWith('/') && !value.startsWith('//') && value !== '/auth'
    ? value
    : '/'
})

async function loadCalendarStatus() {
  calendarLoading.value = true
  error.value = undefined
  const result = await googleCalendar.getStatus()
  if (result.ok) calendarStatus.value = result.data
  else error.value = result
  calendarLoading.value = false
}

watch(step, value => {
  if (value === 'calendar') void loadCalendarStatus()
}, { immediate: true })

async function submitLogin(credentials: SignInRequest) {
  error.value = undefined
  loading.value = true
  const result = await auth.signIn(credentials)
  loading.value = false
  if (result.ok) step.value = 'calendar'
  else error.value = result
}

async function submitRegister(request: SignUpRequest) {
  error.value = undefined
  loading.value = true
  const result = await auth.signUp(request)
  loading.value = false
  if (result.ok) step.value = 'calendar'
  else error.value = result
}

async function connectCalendar() {
  error.value = undefined
  loading.value = true
  const result = await googleCalendar.connect()
  loading.value = false
  if (result.ok) window.location.assign(result.data.auth_url)
  else error.value = result
}

async function continueToApp() {
  await navigateTo(redirectTo.value, { replace: true })
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card class="mx-auto w-100 rounded-lg bg-surface" :max-width="360">
      <v-card-title class="text-center pt-6">
        {{ step === 'login' ? 'Вход' : step === 'register' ? 'Регистрация' : 'Google Calendar' }}
      </v-card-title>

      <v-window v-model="step" :touch="false">
        <v-window-item value="login">
          <AuthLoginForm :error="error" :loading="loading" @submit="submitLogin" />
          <v-card-actions class="justify-center pb-5">
            <v-btn variant="text" color="primary" @click="step = 'register'; error = undefined">
              Создать аккаунт
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="register">
          <AuthRegisterForm :error="error" :loading="loading" @submit="submitRegister" />
          <v-card-actions class="justify-center pb-5">
            <v-btn variant="text" color="primary" @click="step = 'login'; error = undefined">
              Уже есть аккаунт? Войти
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="calendar">
          <v-card-text class="text-center">
            <v-progress-circular v-if="calendarLoading" indeterminate color="primary" />
            <template v-else>
              <v-alert
                v-if="googleCallbackResult === 'connected' || calendarStatus?.connected"
                type="success"
                variant="tonal"
                class="mb-4 text-left"
              >
                Google Calendar подключён<span v-if="calendarStatus?.google_email">: {{ calendarStatus.google_email }}</span>.
              </v-alert>
              <v-alert
                v-else-if="googleCallbackResult === 'error'"
                type="warning"
                variant="tonal"
                class="mb-4 text-left"
              >
                Не удалось подключить Google Calendar. Попробуйте ещё раз или продолжите без календаря.
              </v-alert>
              <p v-else class="mb-4">
                Подключите Google Calendar, чтобы работать с событиями и встречами.
              </p>
              <ErrorMessage v-if="error" v-model="error" class="mb-3 text-center" />
              <v-btn
                v-if="!calendarStatus?.connected"
                color="primary"
                :loading="loading"
                @click="connectCalendar"
              >
                Подключить Google Calendar
              </v-btn>
            </template>
          </v-card-text>
          <v-card-actions class="justify-center pb-5">
            <v-btn variant="text" color="primary" :disabled="calendarLoading" @click="continueToApp">
              Продолжить
            </v-btn>
          </v-card-actions>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>
