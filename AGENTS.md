# Проект
Nuxt-приложение с отключённым SSR. Контракты backend описаны в `openapi/backend.openapi.yaml`, типы OpenAPI сгенерированы в `app/types/backend.d.ts`.

В `<template>` по возможности используй компоненты Vuetify.

## Разработка и сборка

```shell
npm run dev
npm run generate
```

`NUXT_PUBLIC_API_BASE` задаёт базовый URL API.

## Авторизация

Auth store доступен через `useAuth`. На защищённых страницах указывай `auth: true`; тогда пользователь и access token доступны как non-null:

```vue
<script setup lang="ts">
definePageMeta({ auth: true })
const auth = useAuth({ required: true })
</script>
```

Токен и объект пользователя хранятся в `localStorage` под ключом `gorkycode.auth`. Backend не использует refresh token: не добавляй refresh-cookie или автоматическое обновление access token. При ответе API `401` локальная авторизация очищается.

Методы авторизации используют контрактные маршруты `/api/v1/auth/sign-in`, `/api/v1/auth/sign-up` и `/api/v1/auth/sign-out`. `AuthResponse` и формы запроса описаны в `app/types/auth.d.ts`.

После входа или регистрации экран предлагает подключить Google Calendar. Для возврата в этот экран после OAuth укажи backend `GOOGLE_FRONTEND_REDIRECT` как URL `/auth`; если callback перенаправляет на главную страницу с `google=connected` или `google=error`, приложение также вернёт пользователя в `/auth`.

## API

`useApiFetch` — вариант `useFetch`, который добавляет API base URL и Bearer access token:

```ts
const { data, refresh } = await useApiFetch('/api/v1/integrations/google')
```

Для прямых запросов доступны `$apiFetch` и `$apiFetchSafe` из `useNuxtApp()`. `$apiFetchSafe` возвращает `Promise<StoreResponse<T>>`; обработанные ошибки показывай через `ErrorMessage`:

```vue
<ErrorMessage v-if="error" v-model="error" class="mt-2" />
```

Высокоуровневые функции, обращающиеся к API, должны возвращать `StoreResponse<T>` и обрабатывать исключения. Используй stores `useAuth`, `useGoogleCalendar`, `useTask` и `useHealth`; не вызывай их endpoints напрямую из страниц.

## Иконки
Иконки для компонентов импортируй из `@mdi/js`, не указывай имена иконок строками.

## Toast-уведомления

Для toast-уведомлений используй store `useToast()` с методами `success(message)` и `error(message)`. Не подключай toast к операциям или страницам, пока это отдельно не запрошено.

## Типы

Описывай backend-сущности на основе схем `components` в `app/types/backend.d.ts`, используя паттерн `app/types/user.d.ts` и отдельные декларации в `app/types/`.
