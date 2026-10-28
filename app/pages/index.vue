<script setup lang="ts">
import { mdiAccount, mdiCog, mdiLogout } from '@mdi/js'

definePageMeta({
  auth: true,
})

const auth = useAuth({ required: true })
const route = useRoute()
const googleResult = route.query.google

if (googleResult === 'connected' || googleResult === 'error') {
  await navigateTo({ path: '/auth', query: { google: googleResult } }, { replace: true })
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
</template>

<style lang="postcss" scoped>
.header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: rgba(var(--v-theme-surface), 0.8);
  box-shadow: 0 4px 20px rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(12px);
}

.header-content {
  height: 60px;
}
</style>