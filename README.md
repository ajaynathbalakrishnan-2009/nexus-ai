# Nexus AI

Nexus AI is a privacy-first agentic focus companion for protecting study time from social-media interruptions. The current web MVP includes focus sessions, local event memory, semantic-memory indexing, a learner relationship graph, counseling escalation, three-hour lock state, overnight policy visibility, and language-aware learning recommendations.

## Run locally

```powershell
npm install
npm run dev
```

Build the production site with:

```powershell
npm run build
```

## GitHub Pages

The repository deploys automatically to GitHub Pages whenever `main` is updated. The workflow is in `.github/workflows/deploy.yml`; Vite uses `/nexus-ai/` as its production base path and `/` during local development.

After the first push, enable **Settings > Pages > Build and deployment > GitHub Actions** if GitHub has not enabled Pages automatically. The site URL will be:

`https://YOUR-GITHUB-USERNAME.github.io/nexus-ai/`

## Privacy

The MVP stores the event timeline, vector memories, and graph relationships in browser local storage. No cloud AI or external database is connected by default. The Windows process monitor, browser extension, encrypted database, Qdrant/Neo4j production adapters, and transformer runtime are subsequent integration milestones.

## Google sign-in

The web app uses Google Identity Services and the local `server/` API verifies the Google ID token server-side. Copy the example environment files, add your Google OAuth Web Client ID, install the auth server dependencies, and run it alongside Vite:

```powershell
Copy-Item .env.example .env.local
Copy-Item server/.env.example server/.env
npm --prefix server install
npm --prefix server run dev
npm run dev
```

Create the OAuth client in Google Cloud Console as a **Web application** and add `http://127.0.0.1:5173` to Authorized JavaScript origins. Do not put a client secret in the web app.

For GitHub Pages, add these repository variables under **Settings > Secrets and variables > Actions > Variables**:

- `GOOGLE_CLIENT_ID` — your Google OAuth Web Client ID
- `AUTH_VERIFY_URL` — the public HTTPS URL of the deployed `server/` API ending in `/api/auth/google`

The Pages workflow injects them at build time. The auth server must be deployed separately because GitHub Pages only hosts static files.
