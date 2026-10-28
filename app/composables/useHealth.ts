export const useHealth = () => {
  const { $apiFetchSafe } = useNuxtApp()

  function getLiveness() {
    return $apiFetchSafe<HealthResponse>('/health')
  }

  function getReadiness() {
    return $apiFetchSafe<HealthResponse>('/ready')
  }

  return {
    getLiveness,
    getReadiness,
  }
}
