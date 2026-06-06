<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/31df8822-a7b1-4e9f-af0a-0a5fb6fc6aa2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Vercel Deployment (recommended)

1. Create a Vercel project and connect this repository.
2. In Vercel project settings, set the following Environment Variables:
   - `JWT_SECRET` — a strong secret for signing JWTs
   - `DATABASE_URL` — optional for MySQL; if missing the app will use the in-memory mock DB
   - `GEMINI_API_KEY` — optional (AI features will be disabled without it)
   - `NODE_ENV` — set to `production`
3. Vercel will run the `build` script from `package.json` (which runs `vite build`). The `vercel.json` routes `/api/*` to `api/index.ts` and serves the built `dist` static files for the frontend.
4. Deploy from the Vercel dashboard or run locally with the Vercel CLI:

```bash
vercel --prod
```

Notes:
- The Express app is exported from `server.ts` and `api/index.ts` uses a lightweight bridge to allow Vercel to call Express directly without external serverless adapters.
- If you want the server to bind to a port (for non-serverless hosting), start with `npm run dev` or `npm start`.

## Continuous Integration (GitHub Actions)

This repo includes a CI workflow at `.github/workflows/ci.yml` that runs on pushes and pull requests to `main`/`master`.

What it does:
- Installs dependencies (`npm ci`)
- Runs `npm run lint` (TypeScript checks)
- Builds the frontend (`npm run build`)
- Starts the Express server (via `npx tsx server.ts`) and waits for `/api/health`
- Runs the smoke tests in `scripts/smoke-test.mjs`

To enable full CI for private environment checks (e.g., using a real database or AI key), add repository secrets in GitHub and update the workflow as needed.

## Docker (optional)

Build and run a production-ready container locally:

```bash
# Build image
docker build -t elivcs:latest .

# Run container (exposes port 3000)
docker run --rm -e JWT_SECRET=replace_me -p 3000:3000 elivcs:latest
```

Notes:
- The image runs the TypeScript server via `tsx` so no TypeScript compilation step is required in the runtime image — the image is set up to build the frontend (`npm run build`) during image build.
- Provide production environment variables (see `.env.example`) via Docker `-e` flags or an env file.
