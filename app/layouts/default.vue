<script lang="ts" setup>
import { mdiCheckCircle, mdiClose, mdiMinusCircle } from '@mdi/js'

const toast = useToast()
const currentToast = toast.currentToast
</script>

<template>
  <NuxtPage />
  <v-snackbar
    :key="currentToast?.id"
    :model-value="!!currentToast"
    :color="currentToast?.type === 'success' ? 'success' : 'error'"
    location="top center"
    :timeout="5000"
    rounded="lg"
    @update:model-value="visible => !visible && toast.dismiss()"
  >
    <div v-if="currentToast" class="d-flex align-center ga-3">
      <v-icon
        :icon="currentToast.type === 'success' ? mdiCheckCircle : mdiMinusCircle"
        size="22"
      />
      <span class="flex-grow-1">{{ currentToast.message }}</span>
      <v-btn
        :icon="mdiClose"
        aria-label="Закрыть уведомление"
        density="comfortable"
        variant="text"
        size="small"
        @click="toast.dismiss(currentToast?.id)"
      />
    </div>
  </v-snackbar>
</template>
