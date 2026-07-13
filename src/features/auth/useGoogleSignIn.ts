import { useCallback, useEffect, useRef } from 'react'
import { getConfig } from '@/platform/config'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

export interface GoogleUser {
  sub: string
  email: string
  name: string
  picture?: string
}

// Minimal Google Identity Services typings (the script attaches to window.google).
interface TokenClient {
  requestAccessToken: () => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('GSI load failed')))
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('GSI load failed'))
    document.head.appendChild(script)
  })
}

/**
 * Real "Continue with Google" via Google Identity Services. On `signIn()` it opens the
 * Google account popup, gets an access token, and resolves the verified profile.
 *
 * Interim: in production the token would be sent to the BFF to mint a session and resolve
 * the account's roles; here we surface the identity and let the flow continue. Requires
 * `googleClientId` in runtime config.
 */
export function useGoogleSignIn(onSuccess: (user: GoogleUser) => void) {
  const clientRef = useRef<TokenClient | null>(null)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const isConfigured = Boolean(getConfig().googleClientId)

  useEffect(() => {
    const clientId = getConfig().googleClientId
    if (!clientId) return

    let cancelled = false
    void loadGsi()
      .then(() => {
        if (cancelled || !window.google) return
        clientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (response) => {
            if (!response.access_token) return
            void fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
              .then((res) => res.json() as Promise<GoogleUser>)
              .then((user) => onSuccessRef.current(user))
              .catch(() => undefined)
          },
        })
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(() => {
    if (!clientRef.current) {
      console.warn('Google sign-in unavailable — set googleClientId in platform/config.ts')
      return
    }
    clientRef.current.requestAccessToken()
  }, [])

  return { signIn, isConfigured }
}
