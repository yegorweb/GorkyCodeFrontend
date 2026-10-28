<script setup lang="ts">
const props = defineProps<{
  callbackResult?: string
}>()

const googleCalendar = useGoogleCalendar()
const error = ref<Extract<StoreResponse<unknown>, { ok: false }> | undefined>()
const loading = ref(false)

async function connect() {
  error.value = undefined
  loading.value = true
  const result = await googleCalendar.connect()
  loading.value = false

  if (result.ok) {
    window.location.assign(result.data.auth_url)
    return
  }

  error.value = result
}
</script>

<template>
  <v-card-text class="text-center pa-5">
    <v-alert
      v-if="props.callbackResult === 'error'"
      type="warning"
      variant="tonal"
      class="mb-4 text-left"
    >
      Не удалось подключить Google Calendar. Попробуйте ещё раз.
    </v-alert>
    <div v-else class="mb-4">
      Подключите Google Calendar, чтобы работать с событиями и встречами.
    </div>

    <ErrorMessage v-if="error" :model-value="error" class="mb-3 text-center" />
    <v-btn color="primary" :loading="loading" @click="connect">
      Подключить Google Calendar
    </v-btn>
  </v-card-text>
</template>
