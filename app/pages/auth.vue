<script setup lang="ts">
type AuthStep = 'login' | 'register' | 'calendar'

useSeoMeta({
  title: 'Вход',
  ogTitle: 'Вход',
})

const auth = useAuth()
const googleCalendar = useGoogleCalendar()
const route = useRoute()
const step = ref<AuthStep>('login')
const loginError = ref<Extract<StoreResponse<unknown>, { ok: false }> | undefined>()
const registerError = ref<Extract<StoreResponse<unknown>, { ok: false }> | undefined>()
const loading = ref(false)
const googleCallbackResult = computed(() => {
  const result = route.query.google
  return Array.isArray(result) ? result[0] : result
})

async function checkCalendarAfterAuth() {
  loginError.value = undefined
  registerError.value = undefined
  loading.value = true

  const result = await googleCalendar.getStatus()
  loading.value = false

  if (!result.ok) {
    step.value = 'login'
    loginError.value = result
    return
  }

  if (result.data.connected) {
    await navigateTo('/', { replace: true })
    return
  }

  step.value = 'calendar'
  await nextTick()
  document.querySelector('[data-auth-step="calendar"]')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function submitLogin(credentials: SignInRequest) {
  loginError.value = undefined
  loading.value = true
  const result = await auth.signIn(credentials)
  loading.value = false

  if (!result.ok) {
    loginError.value = result
    return
  }

  await checkCalendarAfterAuth()
}

async function submitRegister(request: SignUpRequest) {
  registerError.value = undefined
  loading.value = true
  const result = await auth.signUp(request)
  loading.value = false

  if (!result.ok) {
    registerError.value = result
    return
  }

  await checkCalendarAfterAuth()
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
          <AuthLoginForm :error="loginError" :loading="loading" @submit="submitLogin" />
          <v-card-actions class="justify-center pb-5">
            <v-btn
              variant="text"
              color="primary"
              :disabled="loading"
              @click="step = 'register'; loginError = undefined"
            >
              Создать аккаунт
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="register">
          <AuthRegisterForm :error="registerError" :loading="loading" @submit="submitRegister" />
          <v-card-actions class="justify-center pb-5">
            <v-btn
              variant="text"
              color="primary"
              :disabled="loading"
              @click="step = 'login'; registerError = undefined"
            >
              Уже есть аккаунт? Войти
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="calendar">
          <div data-auth-step="calendar">
            <GoogleCalendarConnect :callback-result="googleCallbackResult" />
          </div>
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>
