import type { ServiceTransport } from './types'

declare global {
  interface Window {
    guobaSkills?: ServiceTransport
  }
}
