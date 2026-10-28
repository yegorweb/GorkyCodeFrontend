export const generateErrorMessage = (error: Extract<StoreResponse<any>, { ok: false }>, { prefix='Ошибка', addStatus=true }: { prefix?: string, addStatus?: boolean } = { prefix: 'Ошибка', addStatus: true }) => {
  let res = prefix
  if (error.status) {
    if (addStatus) res += ` ${error.status}`
    if (error.message) res += `: ${error.message}`
  }
  else {
    res = 'Ошибка сети'
  }
  return res
}

export const handleApiError = <T>(error: unknown): StoreResponse<T> => {
  if (!(error instanceof FetchError)) {
    return { ok: false }
  }

  const responseData = error.response?._data as { detail?: unknown; message?: unknown } | undefined
  const message = typeof responseData?.detail === 'string'
    ? responseData.detail
    : typeof responseData?.message === 'string'
      ? responseData.message
      : undefined

  return {
    ok: false,
    status: error.status,
    message,
  }
}
