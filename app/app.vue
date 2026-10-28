<script setup lang="ts">
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
