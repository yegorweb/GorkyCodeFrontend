<script setup lang="ts">
import { mdiClose } from '@mdi/js'

const filters = defineModel<boolean>({ default: false })
const emit = defineEmits<{
  submit: [filters: TasksListFilters]
}>()

const dateRange = ref<Date[]>([])
const types = ref<NonNullable<TasksListFilters['type']>>([])
const query = ref('')

function formatApiDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function submit() {
  const startDate = dateRange.value[0]
  const endDate = dateRange.value.at(-1)
  let exclusiveEndDate: string | undefined

  if (dateRange.value.length > 1 && endDate) {
    const nextDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + 1,
    )
    exclusiveEndDate = formatApiDate(nextDay)
  }

  emit('submit', {
    ...(startDate ? { from: formatApiDate(startDate) } : {}),
    ...(exclusiveEndDate ? { to: exclusiveEndDate } : {}),
    ...(types.value.length ? { type: [...types.value] } : {}),
    ...(query.value.trim() ? { query: query.value.trim() } : {}),
  })
}
</script>

<template>
  <v-dialog v-model="filters" :max-width="450">
    <v-card class="rounded-lg bg-surface tasks-filter-card">
      <div class="d-flex justify-space-between align-center mb-4">
        <div style="font-size: 20px; font-weight: 500;">Мои события</div>
        <v-btn
          :icon="mdiClose"
          aria-label="Закрыть список событий"
          variant="text"
          size="small"
          @click="filters = false"
        />
      </div>

      <v-form @submit.prevent="submit">
        <v-date-input
          v-model="dateRange"
          label="Период"
          prepend-icon=""
          input-format="dd.mm.yyyy"
          placeholder="ДД.ММ.ГГГГ - ДД.ММ.ГГГГ"
          multiple="range"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />

        <v-select
          v-model="types"
          class="mt-4"
          label="Тип события"
          :items="[
            { title: 'Встречи', value: 'meeting' },
            { title: 'Задачи', value: 'task' },
            { title: 'Напоминания', value: 'reminder' },
          ]"
          multiple
          chips
          closable-chips
          variant="outlined"
          density="comfortable"
          hide-details
        />

        <v-text-field
          v-model="query"
          class="mt-4"
          label="Название содержит"
          variant="outlined"
          density="comfortable"
          hide-details
        />

        <div class="d-flex justify-end ga-2 mt-6">
          <v-btn variant="text" @click="filters = false">
            Отмена
          </v-btn>
          <v-btn color="primary" type="submit">
            Запросить
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.tasks-filter-card {
  padding: 10px 18px 18px 18px;
}
</style>
