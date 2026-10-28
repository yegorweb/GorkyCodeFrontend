export const useGoogleCalendar = () => {
  const { $apiFetchSafe } = useNuxtApp()

  function getStatus() {
    return $apiFetchSafe<GoogleStatusResponse>('/api/v1/integrations/google', {
      method: 'GET',
    })
  }

  function connect() {
    return $apiFetchSafe<GoogleConnectResponse>('/api/v1/integrations/google/connect', {
      method: 'POST',
    })
  }

  function disconnect() {
    return $apiFetchSafe<null>('/api/v1/integrations/google', {
      method: 'DELETE',
    })
  }

  return {
    getStatus,
    connect,
    disconnect,
  }
}
