<script setup lang="ts">
import { mdiEye, mdiEyeOff } from '@mdi/js'

const props = defineProps<{
  error?: Extract<StoreResponse<unknown>, { ok: false }>
  loading: boolean
}>()
const emit = defineEmits<{
  submit: [request: SignUpRequest]
}>()

const submitted = ref(false)
const showPassword = ref(false)
const { handleSubmit } = useForm<Omit<SignUpRequest, 'timezone'>>({
  initialValues: {
    name: '',
    email: '',
    password: '',
  },
  validationSchema: {
    name(value: string) {
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
      if (value.length < 15) return 'минимум 15 символов'
      if (value.length > 128) return 'максимум 128 символов'
      return true
    },
  },
})

const name = useField<string>('name')
const email = useField<string>('email')
const password = useField<string>('password')
const submit = handleSubmit(values => emit('submit', {
  ...values,
  name: values.name.trim(),
  email: values.email.trim(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}))
</script>

<template>
  <v-card-text class="pa-5">
    <v-form
      class="d-flex flex-column align-center"
      @submit.prevent="submitted = true; submit()"
    >
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
        :class="['w-100', submitted && name.errorMessage.value ? 'mt-4' : 'mt-1']"
        :error-messages="submitted ? email.errors.value : []"
      />
      <v-text-field
        v-model="password.value.value"
        label="Пароль"
        placeholder="Не менее 15 символов"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? mdiEye : mdiEyeOff"
        autocomplete="new-password"
        variant="outlined"
        density="compact"
        :class="['w-100', submitted && email.errorMessage.value ? 'mt-4' : 'mt-1']"
        :error-messages="submitted ? password.errors.value : []"
        @click:append-inner="showPassword = !showPassword"
      />
      <ErrorMessage v-if="props.error" :model-value="props.error" class="mb-3 text-center" />
      <v-btn type="submit" color="primary" :loading="props.loading" class="mt-2">
        Зарегистрироваться
      </v-btn>
    </v-form>
  </v-card-text>
</template>
