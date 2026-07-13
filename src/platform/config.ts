/**
 * Runtime configuration — resolved at boot so a single build serves every
 * environment and tenant. Today it returns dev defaults; swap `loadRuntimeConfig`
 * for a fetch of `/config.json` (served per-environment by the edge) when DevOps
 * provides it. No `import.meta.env` baked into the bundle.
 */
export interface RuntimeConfig {
  bffBaseUrl: string
  socketUrl: string
  /** When true, the data layer uses in-memory mocks instead of the real BFF. */
  useMocks: boolean
  /**
   * Google OAuth Web Client ID for "Continue with Google". Public (not a secret).
   * Create at console.cloud.google.com → APIs & Services → Credentials, and add your
   * origins (http://localhost:5173, http://localhost:5174, prod) as Authorized JS origins.
   * Production should instead federate Google through Keycloak/the BFF.
   */
  googleClientId: string
}

const DEV_DEFAULTS: RuntimeConfig = {
  bffBaseUrl: '/api',
  socketUrl: '/ws',
  useMocks: true,
  googleClientId: '', //  paste your Google OAuth Web Client ID here to enable real sign-in
} 

let current: RuntimeConfig = DEV_DEFAULTS

export function getConfig(): RuntimeConfig {
  return current
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // TODO: fetch('/config.json') once the edge serves per-env config.
  current = DEV_DEFAULTS
  return current
}

//CONFIGFILE 
// {
//   "bffBaseUrl": "https://api.mycompany.com",
//   "socketUrl": "wss://ws.mycompany.com",
//   "useMocks": false,
//   "googleClientId": "123456-abcdef.apps.googleusercontent.com"
// }
