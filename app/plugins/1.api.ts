import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'

export default defineNuxtPlugin(() => {
  const auth = useAuth()
  const config = useRuntimeConfig()
  const route = useRoute()

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBase,
    retry: 1,
    retryStatusCodes: [408, 409, 425, 500, 502, 503, 504],
    onRequest({ options }) {
      if (auth.accessToken.value) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${auth.accessToken.value}`)
        options.headers = headers
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401 && auth.loggedIn.value) {
        auth.clearAuth()
        if (route.path !== '/auth') {
          await navigateTo({ path: '/auth', query: { redirect: route.fullPath } })
        }
      }
    },
  })

  const fetchSafe = async <
    DefaultT = unknown,
    DefaultR extends NitroFetchRequest = NitroFetchRequest,
    T = DefaultT,
    R extends NitroFetchRequest = DefaultR,
    O extends NitroFetchOptions<R> = NitroFetchOptions<R>
  >(
    url: R,
    options?: O,
  ): Promise<StoreResponse<T>> => {
    try {
      const data = await $fetch<T>(url, options) as T
      return { ok: true, data }
    } catch (error) {
      return handleApiError(error)
    }
  }

  const apiFetchSafe = async <
    DefaultT = unknown,
    DefaultR extends NitroFetchRequest = NitroFetchRequest,
    T = DefaultT,
    R extends NitroFetchRequest = DefaultR,
    O extends NitroFetchOptions<R> = NitroFetchOptions<R>
  >(
    url: R,
    options?: O,
  ): Promise<StoreResponse<T>> => {
    try {
      const data = await apiFetch<T>(url, options) as T
      return { ok: true, data }
    } catch (error) {
      return handleApiError(error)
    }
  }

  return {
    provide: {
      apiFetch,
      fetchSafe,
      apiFetchSafe,
    },
  }
})
