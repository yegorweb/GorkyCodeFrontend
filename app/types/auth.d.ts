import type { components } from './backend'

declare global {
  type SignInRequest = components['schemas']['SignInRequest']
  type SignUpRequest = components['schemas']['SignUpRequest']
  type AuthResponse = components['schemas']['AuthResponse']
}

export { AuthResponse, SignInRequest, SignUpRequest }
