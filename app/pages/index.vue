<script setup lang="ts">
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
  <v-container>

  </v-container>
</template>

<style lang="postcss" scoped>

</style>