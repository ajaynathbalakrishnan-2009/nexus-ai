import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { OAuth2Client } from 'google-auth-library'

const app = express()
const port = Number(process.env.PORT || 8787)
const clientId = process.env.GOOGLE_CLIENT_ID
const googleClient = clientId ? new OAuth2Client(clientId) : null

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5173' }))
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_request, response) => {
  response.json({ ok: true, provider: 'google', configured: Boolean(googleClient) })
})

app.post('/api/auth/google', async (request, response) => {
  if (!googleClient || !clientId) {
    response.status(503).json({ error: 'Google authentication is not configured on the server.' })
    return
  }

  const credential = request.body?.credential
  if (typeof credential !== 'string' || credential.length < 20) {
    response.status(400).json({ error: 'A Google credential is required.' })
    return
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      response.status(401).json({ error: 'Google account email is not verified.' })
      return
    }

    response.json({
      profile: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        email_verified: true,
      },
    })
  } catch {
    response.status(401).json({ error: 'Google credential verification failed.' })
  }
})

app.listen(port, () => {
  console.log(`Nexus AI auth server listening on http://127.0.0.1:${port}`)
})
