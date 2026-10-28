export const useUser = () => {
  const auth = useAuth()

  function getCurrentUser(): StoreResponse<User> {
    if (!auth.user.value) {
      return { ok: false, status: 401 }
    }

    return { ok: true, data: auth.user.value }
  }

  return {
    getCurrentUser,
  }
}