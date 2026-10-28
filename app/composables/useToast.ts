export type ToastType = 'success' | 'error'

export interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

let nextToastId = 0

export const useToast = () => {
  const toasts = useState<ToastMessage[]>('toasts', () => [])
  const currentToast = computed(() => toasts.value[0] ?? null)

  function show(message: string, type: ToastType) {
    toasts.value.push({
      id: nextToastId++,
      message,
      type,
    })
  }

  function success(message: string) {
    show(message, 'success')
  }

  function error(message: string) {
    show(message, 'error')
  }

  function dismiss(id?: number) {
    const toastId = id ?? currentToast.value?.id
    if (toastId === undefined) return

    toasts.value = toasts.value.filter(toast => toast.id !== toastId)
  }

  return {
    toasts,
    currentToast,
    success,
    error,
    dismiss,
  }
}
