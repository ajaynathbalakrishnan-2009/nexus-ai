export type GoogleProfile = {
  sub: string
  email: string
  name: string
  picture?: string
  email_verified: boolean
}

export type VerifiedGoogleProfile = GoogleProfile & { cloudVerified: boolean }

type GoogleCredentialResponse = { credential: string }
type GoogleButtonOptions = { theme: string; size: string; width: number; text: string }
type GoogleId = {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
  renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void
}

declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Identity Services could not load.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Identity Services could not load.'))
    document.head.appendChild(script)
  })
}

export async function mountGoogleButton(
  element: HTMLElement,
  onSignedIn: (profile: VerifiedGoogleProfile) => void,
  onError: (message: string) => void,
) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    onError('Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the deployment environment.')
    return
  }
  try {
    await loadGoogleScript()
    const googleId = window.google?.accounts?.id
    if (!googleId) throw new Error('Google Identity Services is unavailable.')
    googleId.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        const verifyUrl = import.meta.env.VITE_AUTH_VERIFY_URL
        if (!verifyUrl) {
          onError('Google returned an account, but cloud token verification is not configured. Add VITE_AUTH_VERIFY_URL before production use.')
          return
        }
        try {
          const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          })
          if (!response.ok) throw new Error('Cloud account verification failed.')
          const verified = await response.json() as { profile: GoogleProfile }
          onSignedIn({ ...verified.profile, cloudVerified: true })
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Cloud account verification failed.')
        }
      },
    })
    googleId.renderButton(element, { theme: 'outline', size: 'large', width: 360, text: 'signin_with' })
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Google sign-in failed.')
  }
}
