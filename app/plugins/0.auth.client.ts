const AUTH_STORAGE_KEY = 'gorkycode.auth'

interface StoredAuth {
  user: User
  accessToken: string
}

function isStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== 'object') return false

  const stored = value as Partial<StoredAuth>
  const user = stored.user
  return typeof stored.accessToken === 'string'
    && stored.accessToken.length > 0
    && !!user
    && typeof user.id === 'string'
    && typeof user.name === 'string'
    && typeof user.email === 'string'
    && typeof user.timezone === 'string'
    && typeof user.created_at === 'string'
}

export default defineNuxtPlugin(() => {
  let storedAuth: StoredAuth | null = null
  const serializedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
  if (serializedAuth) {
    try {
      const parsedAuth: unknown = JSON.parse(serializedAuth)
      if (isStoredAuth(parsedAuth)) storedAuth = parsedAuth
      else localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  const user = useState<User | null>('user', () => storedAuth?.user ?? null)
  const accessToken = useState<string | null>('accessToken', () => storedAuth?.accessToken ?? null)
  const loggedIn = computed(() => !!user.value && !!accessToken.value)

  addRouteMiddleware(
    'auth',
    to => {
      if (to.meta.auth && !loggedIn.value) {
        const googleResult = to.query.google
        if (googleResult === 'connected' || googleResult === 'error') {
          return navigateTo({ path: '/auth', query: { google: googleResult } })
        }
        return navigateTo({ path: '/auth', query: { redirect: to.fullPath } })
      }
    },
    { global: true },
  )
})
