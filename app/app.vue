<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme()
const themeStorageKey = 'gorkycode.theme'

onMounted(() => {
  const savedTheme = localStorage.getItem(themeStorageKey)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    void theme.change(savedTheme)
  } else {
    localStorage.setItem(themeStorageKey, theme.global.name.value)
  }
})

watch(theme.global.name, (name) => {
  if (name === 'light' || name === 'dark') {
    localStorage.setItem(themeStorageKey, name)
  }
})

useHead({
  titleTemplate: title => title
    ? `${title} | GorkyCode`
    : 'GorkyCode | Голосовой и текстовый ассистент',
})

useSeoMeta({
  description: 'Голосовой и текстовый AI-ассистент для создания событий в календаре. Тестовый проект хакатона GorkyCode.',
  robots: 'noindex, nofollow',
  ogType: 'website',
  ogSiteName: 'GorkyCode',
  ogLocale: 'ru_RU',
  ogDescription: 'Голосовой и текстовый AI-ассистент, помогающий создавать события в календаре. Тестовый проект хакатона GorkyCode.',
  twitterCard: 'summary',
  themeColor: '#10110B',
})
</script>

<template>
  <v-app>
    <NuxtLayout />
  </v-app>
</template>
