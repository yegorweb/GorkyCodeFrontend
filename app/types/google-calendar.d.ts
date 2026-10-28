import type { components } from './backend'

declare global {
  type GoogleConnectResponse = components['schemas']['GoogleConnectResponse']
  type GoogleStatusResponse = components['schemas']['GoogleStatusResponse']
}

export { GoogleConnectResponse, GoogleStatusResponse }
