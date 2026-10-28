<script setup lang="ts">
import { mdiEye, mdiEyeOff } from '@mdi/js'

type AuthStep = 'login' | 'register' | 'calendar'
type AuthFormValues = {
  name: string
  email: string
  password: string
}

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

const { handleSubmit } = useForm<AuthFormValues>({
  initialValues: {
    name: '',
    email: '',
    password: '',
  },
  validationSchema: computed(() => ({
    name(value: string) {
      if (step.value !== 'register') return true
      if (!value.trim()) return 'введите имя'
      if (value.trim().length > 100) return 'максимум 100 символов'
      return true
    },
    email(value: string) {
      if (!value) return 'введите email'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'неправильный email'
      if (value.length > 320) return 'максимум 320 символов'
      return true
    },
    password(value: string) {
      if (!value) return 'введите пароль'
      if (step.value === 'register' && value.length < 15) return 'минимум 15 символов'
      if (step.value === 'register' && value.length > 128) return 'максимум 128 символов'
      return true
    },
  })),
})

const name = useField<string>('name')
const email = useField<string>('email')
const password = useField<string>('password')

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

const submit = handleSubmit(async values => {
  submitted.value = true
  error.value = undefined
  loading.value = true

  const result = step.value === 'register'
    ? await auth.signUp({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
    : await auth.signIn({
        email: values.email.trim(),
        password: values.password,
      })

  loading.value = false
  if (result.ok) step.value = 'calendar'
  else error.value = result
})

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
    <v-card class="mx-auto w-100 rounded-lg" max-width="460" color="grey-lighten-5">
      <v-card-title class="text-center pt-6">
        {{ step === 'login' ? 'Вход' : step === 'register' ? 'Регистрация' : 'Google Calendar' }}
      </v-card-title>

      <v-window v-model="step" :touch="false">
        <v-window-item value="login">
          <v-card-text>
            <v-form class="d-flex flex-column align-center" @submit.prevent="submit">
              <v-text-field
                v-model="email.value.value"
                label="Email"
                type="email"
                autocomplete="username"
                variant="outlined"
                density="compact"
                class="w-100"
                :error-messages="submitted ? email.errors.value : []"
              />
              <v-text-field
                v-model="password.value.value"
                label="Пароль"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? mdiEye : mdiEyeOff"
                autocomplete="current-password"
                variant="outlined"
                density="compact"
                class="w-100"
                :error-messages="submitted ? password.errors.value : []"
                @click:append-inner="showPassword = !showPassword"
              />
              <ErrorMessage v-if="error" v-model="error" class="mb-3 text-center" />
              <v-btn type="submit" color="primary" :loading="loading" class="mt-2">
                Войти
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="justify-center pb-5">
            <v-btn variant="text" color="primary" @click="step = 'register'; submitted = false; error = undefined">
              Создать аккаунт
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="register">
          <v-card-text>
            <v-form class="d-flex flex-column align-center" @submit.prevent="submit">
              <v-text-field
                v-model="name.value.value"
                label="Имя"
                autocomplete="name"
                variant="outlined"
                density="compact"
                class="w-100"
                :error-messages="submitted ? name.errors.value : []"
              />
              <v-text-field
                v-model="email.value.value"
                label="Email"
                type="email"
                autocomplete="email"
                variant="outlined"
                density="compact"
                class="w-100"
                :error-messages="submitted ? email.errors.value : []"
              />
              <v-text-field
                v-model="password.value.value"
                label="Пароль (не менее 15 символов)"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? mdiEye : mdiEyeOff"
                autocomplete="new-password"
                variant="outlined"
                density="compact"
                class="w-100"
                :error-messages="submitted ? password.errors.value : []"
                @click:append-inner="showPassword = !showPassword"
              />
              <ErrorMessage v-if="error" v-model="error" class="mb-3 text-center" />
              <v-btn type="submit" color="primary" :loading="loading" class="mt-2">
                Зарегистрироваться
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="justify-center pb-5">
            <v-btn variant="text" color="primary" @click="step = 'login'; submitted = false; error = undefined">
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
