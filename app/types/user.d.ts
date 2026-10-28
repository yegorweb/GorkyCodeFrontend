import type { components } from './backend'

declare global {
  type User = components['schemas']['User']
}

export { User }