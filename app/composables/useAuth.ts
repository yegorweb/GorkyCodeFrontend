import type { Ref } from 'vue'

type UseAuthOptions<T extends boolean = false> = {
  required?: T
}

export const useAuth = <T extends boolean = false>(
  options?: UseAuthOptions<T>,
) => {
  const { $apiFetchSafe } = useNuxtApp()
  const userState = useState<User | null>('user')
  const accessTokenState = useState<string | null>('accessToken')
  const user = userState as Ref<T extends true ? User : User | null>
  const accessToken = accessTokenState as Ref<T extends true ? string : string | null>
  const loggedIn = computed(() => !!userState.value && !!accessTokenState.value)

  function persistAuth() {
    if (!import.meta.client) return

    if (userState.value && accessTokenState.value) {
      localStorage.setItem('gorkycode.auth', JSON.stringify({
        user: userState.value,
        accessToken: accessTokenState.value,
      }))
    } else {
      localStorage.removeItem('gorkycode.auth')
    }
  }

  function clearAuth() {
    userState.value = null
    accessTokenState.value = null
    persistAuth()
  }

  async function signIn(credentials: SignInRequest): Promise<StoreResponse<null>> {
    const result = await $apiFetchSafe<AuthResponse>('/api/v1/auth/sign-in', {
      method: 'POST',
      body: credentials,
    })
    if (!result.ok) return result

    userState.value = result.data.user
    accessTokenState.value = result.data.access_token
    persistAuth()
    return { ok: true, data: null }
  }

  async function signUp(request: SignUpRequest): Promise<StoreResponse<null>> {
    const result = await $apiFetchSafe<AuthResponse>('/api/v1/auth/sign-up', {
      method: 'POST',
      body: request,
    })
    if (!result.ok) return result

    userState.value = result.data.user
    accessTokenState.value = result.data.access_token
    persistAuth()
    return { ok: true, data: null }
  }

  async function logout(): Promise<StoreResponse<null>> {
    const result = await $apiFetchSafe<null>('/api/v1/auth/sign-out', {
      method: 'POST',
    })
    if (!result.ok) return result

    clearAuth()
    await navigateTo('/auth')
    return { ok: true, data: null }
  }

  return {
    signIn,
    signUp,
    logout,
    clearAuth,
    user,
    loggedIn,
    accessToken,
  }
}